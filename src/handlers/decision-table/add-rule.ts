/**
 * Handler for add_dmn_rule tool.
 *
 * Adds a new rule (row) to a decision table, optionally pre-filling
 * input and output entries.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface AddRuleArgs {
  diagramId: string;
  decisionId: string;
  inputEntries?: string[];
  outputEntries?: string[];
  description?: string;
}

export async function handleAddRule(args: AddRuleArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, inputEntries, outputEntries, description } = args;
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

  const inputCount = logic.input?.length || 0;
  const outputCount = logic.output?.length || 0;

  // Create rule
  const rule = moddle.create('dmn:DecisionRule', {
    description: description || undefined,
  });
  rule.$parent = logic;

  // Create input entries
  rule.inputEntry = [];
  for (let i = 0; i < inputCount; i++) {
    const text = inputEntries?.[i] ?? '';
    const entry = moddle.create('dmn:UnaryTests', { text });
    entry.$parent = rule;
    rule.inputEntry.push(entry);
  }

  // Create output entries
  rule.outputEntry = [];
  for (let i = 0; i < outputCount; i++) {
    const text = outputEntries?.[i] ?? '';
    const entry = moddle.create('dmn:LiteralExpression', { text });
    entry.$parent = rule;
    rule.outputEntry.push(entry);
  }

  // Add to table
  if (!logic.rule) logic.rule = [];
  logic.rule.push(rule);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    ruleId: rule.id,
    ruleIndex: logic.rule.length - 1,
    inputEntries: rule.inputEntry.map((e: any) => e.text || ''),
    outputEntries: rule.outputEntry.map((e: any) => e.text || ''),
    ruleCount: logic.rule.length,
    message: `Added rule #${logic.rule.length} to decision table of ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_rule',
  description:
    'Add a new rule (row) to a decision table. Provide inputEntries and outputEntries ' +
    'arrays to pre-fill cell values, or leave empty for blank entries.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      inputEntries: {
        type: 'array',
        items: { type: 'string' },
        description:
          "Input cell values in column order. Use FEEL unary tests (e.g. '> 100', '\"gold\"', '[1..10]')",
      },
      outputEntries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Output cell values in column order. Use FEEL expressions.',
      },
      description: {
        type: 'string',
        description: 'Optional description/annotation for the rule',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
