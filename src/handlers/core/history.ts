/**
 * Handler for dmn_history tool.
 *
 * Unified undo/redo tool for DMN diagrams. Uses the dmn-js command stack
 * to reverse or re-apply operations. Supports multiple steps.
 */

import { type ToolResult } from '../../types';
import { requireDiagram, jsonResult, syncXml, validateArgs, getService } from '../helpers';

export interface DmnHistoryArgs {
  diagramId: string;
  action: 'undo' | 'redo';
  steps?: number;
}

/** Perform N steps of undo or redo, returning how many were actually performed. */
function performSteps(
  commandStack: { canUndo(): boolean; canRedo(): boolean; undo(): void; redo(): void },
  isUndo: boolean,
  steps: number
): number {
  const canDo = isUndo ? () => commandStack.canUndo() : () => commandStack.canRedo();
  const doAction = isUndo ? () => commandStack.undo() : () => commandStack.redo();
  let performed = 0;
  for (let i = 0; i < steps; i++) {
    if (!canDo()) break;
    doAction();
    performed++;
  }
  return performed;
}

export async function handleDmnHistory(args: DmnHistoryArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'action']);
  const { diagramId, action, steps = 1 } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const commandStack = getService(viewer, 'commandStack');
  const isUndo = action === 'undo';

  const canStart = isUndo ? commandStack.canUndo() : commandStack.canRedo();
  if (!canStart) {
    const nothingMsg = isUndo
      ? 'Nothing to undo — command stack is empty'
      : 'Nothing to redo — no undone changes available';
    return jsonResult({ success: false, message: nothingMsg });
  }

  const performed = performSteps(commandStack, isUndo, steps);
  await syncXml(diagram);

  const doneVerb = isUndo ? 'Undid' : 'Redid';
  return jsonResult({
    success: true,
    canUndo: commandStack.canUndo(),
    canRedo: commandStack.canRedo(),
    stepsPerformed: performed,
    message: `${doneVerb} ${performed} change(s)`,
  });
}

export const TOOL_DEFINITION = {
  name: 'dmn_history',
  description:
    'Undo or redo changes on a DMN diagram. Uses the dmn-js command stack to reverse ' +
    'or re-apply operations. Supports multiple steps.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      action: {
        type: 'string',
        enum: ['undo', 'redo'],
        description: "The history action to perform: 'undo' to reverse, 'redo' to re-apply.",
      },
      steps: {
        type: 'number',
        description: 'Number of steps to undo/redo (default: 1).',
      },
    },
    required: ['diagramId', 'action'],
  },
} as const;
