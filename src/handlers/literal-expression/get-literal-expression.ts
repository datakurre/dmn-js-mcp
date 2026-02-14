/**
 * Handler for get_dmn_literal_expression tool.
 *
 * Gets the literal expression from a Decision element.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, validateArgs } from '../helpers';

export interface GetLiteralExpressionArgs {
  diagramId: string;
  decisionId: string;
}

export async function handleGetLiteralExpression(
  args: GetLiteralExpressionArgs
): Promise<ToolResult> {
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
  if (!logic || logic.$type !== 'dmn:LiteralExpression') {
    return jsonResult({
      success: true,
      decisionId,
      hasLiteralExpression: false,
      decisionLogicType: logic?.$type || 'none',
      message:
        `Decision ${decisionId} does not have a LiteralExpression. ` +
        (logic ? `It uses ${logic.$type} instead.` : 'No decision logic is set.'),
    });
  }

  return jsonResult({
    success: true,
    decisionId,
    hasLiteralExpression: true,
    text: logic.text || '',
    expressionLanguage: logic.expressionLanguage || 'feel',
    typeRef: logic.typeRef || undefined,
    message: `Literal expression on ${decisionId}: "${logic.text || ''}"`,
  });
}

export const TOOL_DEFINITION = {
  name: 'get_dmn_literal_expression',
  description:
    'Get the literal expression from a Decision element. Returns hasLiteralExpression: false ' +
    'if the decision uses a different logic type (e.g. DecisionTable).',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
