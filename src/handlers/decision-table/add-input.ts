/**
 * Handler for add_dmn_input tool.
 *
 * Adds an input column to a decision table.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface AddInputArgs {
  diagramId: string;
  decisionId: string;
  label?: string;
  expressionText?: string;
  typeRef?: string;
  inputValues?: string;
}

export async function handleAddInput(args: AddInputArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, label, expressionText, typeRef, inputValues } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const moddle = viewer.get('moddle');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }

  const logic = bo.decisionLogic;
  if (!logic || logic.$type !== 'dmn:DecisionTable') {
    throw typeMismatchError(decisionId, logic?.$type || 'none', ['dmn:DecisionTable']);
  }

  // Create input expression
  const inputExpression = moddle.create('dmn:LiteralExpression', {
    typeRef: typeRef || 'string',
    text: expressionText || '',
  });

  // Create input clause
  const inputClause = moddle.create('dmn:InputClause', {
    label: label || undefined,
    inputExpression,
  });
  inputExpression.$parent = inputClause;

  // Add input values constraint if provided
  if (inputValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: inputValues });
    unaryTests.$parent = inputClause;
    inputClause.inputValues = unaryTests;
  }

  // Add to the table
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
    inputId: inputClause.id,
    label: label || undefined,
    expressionText: expressionText || undefined,
    typeRef: typeRef || 'string',
    inputCount: logic.input.length,
    message: `Added input column${label ? ` "${label}"` : ''} to decision table of ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_input',
  description: 'Add an input column to a decision table. Existing rules get an empty input entry.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      label: { type: 'string', description: 'Label for the input column' },
      expressionText: {
        type: 'string',
        description: 'FEEL expression text for the input (e.g. variable name)',
      },
      typeRef: {
        type: 'string',
        description:
          "Type reference (e.g. 'string', 'integer', 'boolean', 'double', 'date'). Default: 'string'",
      },
      inputValues: {
        type: 'string',
        description:
          'Allowed input values as comma-separated list (e.g. \'"gold","silver","bronze"\')',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
