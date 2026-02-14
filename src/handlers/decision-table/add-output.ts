/**
 * Handler for add_dmn_output tool.
 *
 * Adds an output column to a decision table.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface AddOutputArgs {
  diagramId: string;
  decisionId: string;
  label?: string;
  name?: string;
  typeRef?: string;
  outputValues?: string;
}

export async function handleAddOutput(args: AddOutputArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, label, name, typeRef, outputValues } = args;
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

  // Create output clause
  const outputClause = moddle.create('dmn:OutputClause', {
    label: label || undefined,
    name: name || undefined,
    typeRef: typeRef || 'string',
  });

  // Add output values constraint if provided
  if (outputValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: outputValues });
    unaryTests.$parent = outputClause;
    outputClause.outputValues = unaryTests;
  }

  // Add to the table
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
    outputId: outputClause.id,
    label: label || undefined,
    name: name || undefined,
    typeRef: typeRef || 'string',
    outputCount: logic.output.length,
    message: `Added output column${label ? ` "${label}"` : ''} to decision table of ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_output',
  description:
    'Add an output column to a decision table. Existing rules get an empty output entry.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      label: { type: 'string', description: 'Label for the output column' },
      name: { type: 'string', description: 'Output variable name' },
      typeRef: {
        type: 'string',
        description: "Type reference (e.g. 'string', 'integer', 'boolean'). Default: 'string'",
      },
      outputValues: {
        type: 'string',
        description: 'Allowed output values as comma-separated list',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
