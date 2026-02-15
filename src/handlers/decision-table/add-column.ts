/**
 * Handler for add_dmn_column tool.
 *
 * Adds an input or output column to a decision table. Existing rules get
 * an empty entry for the new column. Replaces the former separate
 * add_dmn_input and add_dmn_output tools.
 */

import { type ToolResult } from '../../types';
import { invalidEnumError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';
import { requireDecisionTable } from './helpers';

export interface AddColumnArgs {
  diagramId: string;
  decisionId: string;
  columnType: 'input' | 'output';
  label?: string;
  /** FEEL expression text (input columns only, e.g. variable name). */
  expressionText?: string;
  /** Type reference (e.g. 'string', 'integer', 'boolean', 'double', 'date'). Default: 'string'. */
  typeRef?: string;
  /** Allowed values as comma-separated list (e.g. '"gold","silver","bronze"'). */
  allowedValues?: string;
  /** Output variable name (output columns only). */
  name?: string;
}

export async function handleAddColumn(args: AddColumnArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId', 'columnType']);
  const { diagramId, decisionId, columnType, label, expressionText, typeRef, allowedValues, name } =
    args;

  if (!['input', 'output'].includes(columnType)) {
    throw invalidEnumError('columnType', columnType, ['input', 'output']);
  }

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const moddle = viewer.get('moddle');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  const logic = requireDecisionTable(bo, decisionId);

  if (columnType === 'input') {
    return addInputColumn(diagram, logic, moddle, decisionId, {
      label,
      expressionText,
      typeRef,
      allowedValues,
    });
  } else {
    return addOutputColumn(diagram, logic, moddle, decisionId, {
      label,
      name,
      typeRef,
      allowedValues,
    });
  }
}

// ── Input column ───────────────────────────────────────────────────────────

async function addInputColumn(
  diagram: any,
  logic: any,
  moddle: any,
  decisionId: string,
  opts: { label?: string; expressionText?: string; typeRef?: string; allowedValues?: string }
): Promise<ToolResult> {
  const { label, expressionText, typeRef, allowedValues } = opts;

  const inputExpression = moddle.create('dmn:LiteralExpression', {
    typeRef: typeRef || 'string',
    text: expressionText || '',
  });

  const inputClause = moddle.create('dmn:InputClause', {
    label: label || undefined,
    inputExpression,
  });
  inputExpression.$parent = inputClause;

  if (allowedValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: allowedValues });
    unaryTests.$parent = inputClause;
    inputClause.inputValues = unaryTests;
  }

  if (!logic.input) logic.input = [];
  inputClause.$parent = logic;
  logic.input.push(inputClause);

  // Add empty input entries to existing rules
  if (logic.rule) {
    for (const rule of logic.rule) {
      const entry = moddle.create('dmn:UnaryTests', { text: '' });
      entry.$parent = rule;
      if (!rule.inputEntry) rule.inputEntry = [];
      rule.inputEntry.push(entry);
    }
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    columnType: 'input',
    columnId: inputClause.id,
    label: label || undefined,
    expressionText: expressionText || undefined,
    typeRef: typeRef || 'string',
    columnCount: logic.input.length,
    message: `Added input column${label ? ` "${label}"` : ''} to decision table of ${decisionId}`,
  });
}

// ── Output column ──────────────────────────────────────────────────────────

async function addOutputColumn(
  diagram: any,
  logic: any,
  moddle: any,
  decisionId: string,
  opts: { label?: string; name?: string; typeRef?: string; allowedValues?: string }
): Promise<ToolResult> {
  const { label, name, typeRef, allowedValues } = opts;

  const outputClause = moddle.create('dmn:OutputClause', {
    label: label || undefined,
    name: name || undefined,
    typeRef: typeRef || 'string',
  });

  if (allowedValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: allowedValues });
    unaryTests.$parent = outputClause;
    outputClause.outputValues = unaryTests;
  }

  if (!logic.output) logic.output = [];
  outputClause.$parent = logic;
  logic.output.push(outputClause);

  // Add empty output entries to existing rules
  if (logic.rule) {
    for (const rule of logic.rule) {
      const entry = moddle.create('dmn:LiteralExpression', { text: '' });
      entry.$parent = rule;
      if (!rule.outputEntry) rule.outputEntry = [];
      rule.outputEntry.push(entry);
    }
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    columnType: 'output',
    columnId: outputClause.id,
    label: label || undefined,
    name: name || undefined,
    typeRef: typeRef || 'string',
    columnCount: logic.output.length,
    message: `Added output column${label ? ` "${label}"` : ''} to decision table of ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_column',
  description:
    'Add an input or output column to a decision table. Existing rules get an empty entry. ' +
    'Set columnType to "input" or "output". For inputs, use expressionText for the FEEL variable name. ' +
    'For outputs, use name for the output variable name.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      columnType: {
        type: 'string',
        enum: ['input', 'output'],
        description: 'Whether to add an input or output column',
      },
      label: { type: 'string', description: 'Label for the column' },
      expressionText: {
        type: 'string',
        description: 'FEEL expression text for input columns (e.g. variable name)',
      },
      typeRef: {
        type: 'string',
        description:
          "Type reference (e.g. 'string', 'integer', 'boolean', 'double', 'date'). Default: 'string'",
      },
      allowedValues: {
        type: 'string',
        description: 'Allowed values as comma-separated list (e.g. \'"gold","silver","bronze"\')',
      },
      name: {
        type: 'string',
        description: 'Output variable name (output columns only)',
      },
    },
    required: ['diagramId', 'decisionId', 'columnType'],
  },
} as const;
