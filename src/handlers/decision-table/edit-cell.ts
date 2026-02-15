/**
 * Handler for edit_dmn_cell tool.
 *
 * Edits a single cell value in a decision table rule.
 */

import { type ToolResult } from '../../types';
import { invalidEnumError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';
import { requireDecisionTable } from './helpers';

export interface EditCellArgs {
  diagramId: string;
  decisionId: string;
  ruleIndex: number;
  columnType: 'input' | 'output';
  columnIndex: number;
  value: string;
}

/** Validate cell-edit arguments that aren't covered by validateArgs. */
function validateCellArgs(args: EditCellArgs): void {
  const { ruleIndex, columnType, columnIndex } = args;
  if (ruleIndex === undefined || ruleIndex === null) {
    throw invalidEnumError('ruleIndex', String(ruleIndex), ['0', '1', '2', '...']);
  }
  if (!columnType || !['input', 'output'].includes(columnType)) {
    throw invalidEnumError('columnType', String(columnType), ['input', 'output']);
  }
  if (columnIndex === undefined || columnIndex === null) {
    throw invalidEnumError('columnIndex', String(columnIndex), ['0', '1', '2', '...']);
  }
}

export async function handleEditCell(args: EditCellArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  validateCellArgs(args);
  const { diagramId, decisionId, ruleIndex, columnType, columnIndex, value } = args;

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, decisionId);

  const logic = requireDecisionTable(element.businessObject, decisionId);

  const rules = logic.rule || [];
  if (ruleIndex < 0 || ruleIndex >= rules.length) {
    throw invalidEnumError(
      'ruleIndex',
      String(ruleIndex),
      rules.map((_: any, i: number) => String(i))
    );
  }

  const rule = rules[ruleIndex];
  const entries = columnType === 'input' ? rule.inputEntry : rule.outputEntry;
  if (!entries || columnIndex < 0 || columnIndex >= entries.length) {
    throw invalidEnumError(
      'columnIndex',
      String(columnIndex),
      (entries || []).map((_: any, i: number) => String(i))
    );
  }

  entries[columnIndex].text = value ?? '';

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    ruleIndex,
    columnType,
    columnIndex,
    value: value ?? '',
    message: `Updated ${columnType}[${columnIndex}] of rule #${ruleIndex + 1} to "${value}"`,
  });
}

export const TOOL_DEFINITION = {
  name: 'edit_dmn_cell',
  description:
    'Edit a single cell value in a decision table. Specify the rule (row) index, ' +
    'column type (input/output), column index, and the new FEEL expression value.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      ruleIndex: { type: 'number', description: 'Zero-based rule (row) index' },
      columnType: {
        type: 'string',
        enum: ['input', 'output'],
        description: 'Whether to edit an input or output cell',
      },
      columnIndex: { type: 'number', description: 'Zero-based column index' },
      value: { type: 'string', description: 'New FEEL expression value for the cell' },
    },
    required: ['diagramId', 'decisionId', 'ruleIndex', 'columnType', 'columnIndex', 'value'],
  },
} as const;
