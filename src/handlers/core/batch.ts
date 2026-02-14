/**
 * Handler for batch_dmn_operations tool.
 *
 * Accepts an array of operations and executes them sequentially,
 * reducing round-trips for complex diagram construction.
 */

import { type ToolResult } from '../../types';
import { missingRequiredError, semanticViolationError } from '../../errors';
import { validateArgs, jsonResult, syncXml } from '../helpers';
import { getDiagram } from '../../diagram-manager';

/**
 * Lazily resolve dispatchToolCall to break the circular dependency:
 * batch.ts → ../index → batch.ts
 */
async function dispatch(toolName: string, args: any): Promise<ToolResult> {
  const { dispatchToolCall } = await import('../index');
  return dispatchToolCall(toolName, args);
}

export interface BatchOperationsArgs {
  operations: Array<{
    tool: string;
    args: Record<string, any>;
  }>;
  stopOnError?: boolean;
}

/** Capture command-stack positions for all referenced diagrams (for rollback). */
function captureCommandStackPositions(
  operations: BatchOperationsArgs['operations']
): Map<string, number> {
  const positions = new Map<string, number>();
  for (const op of operations) {
    const id = op.args?.diagramId;
    if (id && !positions.has(id)) {
      const diagram = getDiagram(id);
      if (diagram) {
        const viewer = diagram.modeler.getActiveViewer();
        const commandStack = viewer.get('commandStack');
        positions.set(id, commandStack._stackIdx ?? 0);
      }
    }
  }
  return positions;
}

/** Rollback all diagrams to their pre-batch command-stack positions. */
async function rollbackDiagrams(positions: Map<string, number>): Promise<void> {
  for (const [id, startIdx] of positions) {
    const diagram = getDiagram(id);
    if (!diagram) continue;
    const viewer = diagram.modeler.getActiveViewer();
    const commandStack = viewer.get('commandStack');
    while (commandStack._stackIdx > startIdx && commandStack.canUndo()) {
      commandStack.undo();
    }
    await syncXml(diagram);
  }
}

export async function handleBatchOperations(args: BatchOperationsArgs): Promise<ToolResult> {
  validateArgs(args, ['operations']);
  const { operations, stopOnError = true } = args;

  if (!Array.isArray(operations) || operations.length === 0) {
    throw missingRequiredError(['operations']);
  }

  for (const op of operations) {
    if (op.tool === 'batch_dmn_operations') {
      throw semanticViolationError('Nested batch operations are not allowed');
    }
  }

  const commandStackDepths = captureCommandStackPositions(operations);

  const results: Array<{
    index: number;
    tool: string;
    success: boolean;
    result?: any;
    error?: string;
  }> = [];
  let rolledBack = false;

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    try {
      const result = await dispatch(op.tool, op.args);
      let parsed: any;
      try {
        parsed = JSON.parse(result.content[0]?.text || '{}');
      } catch {
        parsed = result.content[0]?.text;
      }
      results.push({ index: i, tool: op.tool, success: true, result: parsed });
    } catch (err: any) {
      results.push({
        index: i,
        tool: op.tool,
        success: false,
        error: err?.message || String(err),
      });
      if (stopOnError) {
        await rollbackDiagrams(commandStackDepths);
        rolledBack = true;
        break;
      }
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return jsonResult({
    success: failCount === 0,
    totalOperations: operations.length,
    executed: results.length,
    succeeded: successCount,
    failed: failCount,
    ...(rolledBack ? { rolledBack: true } : {}),
    results,
    message:
      failCount === 0
        ? `All ${successCount} operations completed successfully`
        : rolledBack
          ? `${failCount} operation(s) failed — all changes rolled back`
          : `${failCount} operation(s) failed out of ${results.length} executed`,
  });
}

export const TOOL_DEFINITION = {
  name: 'batch_dmn_operations',
  description:
    'Execute multiple DMN operations in a single call, reducing round-trips. Operations run sequentially. ' +
    'By default, execution stops on first error (set stopOnError: false to continue). ' +
    'When stopOnError is true (default), all changes are rolled back on failure using the dmn-js command stack. ' +
    'Nested batch calls are not allowed.',
  inputSchema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tool: {
              type: 'string',
              description:
                'The tool name to invoke (e.g. "add_dmn_element", "connect_dmn_elements")',
            },
            args: {
              type: 'object',
              description: 'Arguments to pass to the tool',
              additionalProperties: true,
            },
          },
          required: ['tool', 'args'],
        },
        description: 'Array of operations to execute sequentially',
      },
      stopOnError: {
        type: 'boolean',
        description:
          'Stop on first error (default: true). Set to false to continue executing remaining operations.',
      },
    },
    required: ['operations'],
  },
} as const;
