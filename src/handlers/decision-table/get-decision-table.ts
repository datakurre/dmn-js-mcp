/**
 * Handler for get_dmn_decision_table tool.
 *
 * Returns the full structure of a decision table: hit policy, inputs,
 * outputs, and rules with their cell values.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, validateArgs } from '../helpers';

export interface GetDecisionTableArgs {
  diagramId: string;
  decisionId: string;
}

/** Serialize an input column. */
function serializeInput(input: any, index: number): Record<string, any> {
  return {
    id: input.id,
    index,
    label: input.label || undefined,
    inputExpression: input.inputExpression
      ? {
          id: input.inputExpression.id,
          typeRef: input.inputExpression.typeRef || undefined,
          text: input.inputExpression.text || '',
        }
      : undefined,
    inputValues: input.inputValues?.text || undefined,
  };
}

/** Serialize an output column. */
function serializeOutput(output: any, index: number): Record<string, any> {
  return {
    id: output.id,
    index,
    label: output.label || undefined,
    name: output.name || undefined,
    typeRef: output.typeRef || undefined,
    outputValues: output.outputValues?.text || undefined,
  };
}

/** Serialize a rule (row). */
function serializeRule(rule: any, index: number): Record<string, any> {
  return {
    id: rule.id,
    index,
    description: rule.description || undefined,
    inputEntries: (rule.inputEntry || []).map((entry: any) => ({
      id: entry.id,
      text: entry.text || '',
    })),
    outputEntries: (rule.outputEntry || []).map((entry: any) => ({
      id: entry.id,
      text: entry.text || '',
    })),
  };
}

export async function handleGetDecisionTable(args: GetDecisionTableArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }

  const logic = bo.decisionLogic;
  if (!logic || logic.$type !== 'dmn:DecisionTable') {
    return jsonResult({
      success: true,
      decisionId,
      hasDecisionTable: false,
      decisionLogicType: logic?.$type || 'none',
      message:
        `Decision ${decisionId} does not have a DecisionTable. ` +
        (logic ? `It uses ${logic.$type} instead.` : 'No decision logic is set.'),
    });
  }

  const inputs = (logic.input || []).map(serializeInput);
  const outputs = (logic.output || []).map(serializeOutput);
  const rules = (logic.rule || []).map(serializeRule);

  return jsonResult({
    success: true,
    decisionId,
    hasDecisionTable: true,
    hitPolicy: logic.hitPolicy || 'UNIQUE',
    aggregation: logic.aggregation || undefined,
    inputs,
    outputs,
    rules,
    message: `Decision table for ${decisionId}: ${inputs.length} input(s), ${outputs.length} output(s), ${rules.length} rule(s)`,
  });
}

export const TOOL_DEFINITION = {
  name: 'get_dmn_decision_table',
  description:
    'Get the full structure of a decision table: hit policy, input columns, ' +
    'output columns, and rules with their cell values. ' +
    'Returns hasDecisionTable: false if the decision uses a different logic type.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: {
        type: 'string',
        description: 'The ID of the Decision element containing the table',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
