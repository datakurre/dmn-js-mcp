/**
 * Handler for set_dmn_literal_expression tool.
 *
 * Sets or replaces the literal expression on a Decision element.
 * Converts the decision logic from DecisionTable to LiteralExpression
 * if needed.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface SetLiteralExpressionArgs {
  diagramId: string;
  decisionId: string;
  text: string;
  expressionLanguage?: string;
  typeRef?: string;
}

export async function handleSetLiteralExpression(
  args: SetLiteralExpressionArgs
): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId', 'text']);
  const { diagramId, decisionId, text, expressionLanguage, typeRef } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const moddle = viewer.get('moddle');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }

  // Create or update the literal expression
  let literalExpression = bo.decisionLogic;
  if (!literalExpression || literalExpression.$type !== 'dmn:LiteralExpression') {
    literalExpression = moddle.create('dmn:LiteralExpression', {});
    literalExpression.$parent = bo;
    bo.decisionLogic = literalExpression;
  }

  literalExpression.text = text;
  if (expressionLanguage) {
    literalExpression.expressionLanguage = expressionLanguage;
  }
  if (typeRef) {
    literalExpression.typeRef = typeRef;
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    text,
    expressionLanguage: literalExpression.expressionLanguage || 'feel',
    typeRef: literalExpression.typeRef || undefined,
    message: `Set literal expression on ${decisionId}: "${text}"`,
  });
}

export const TOOL_DEFINITION = {
  name: 'set_dmn_literal_expression',
  description:
    'Set a literal expression on a Decision element. If the decision currently uses a ' +
    'DecisionTable, it will be replaced with a LiteralExpression.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      text: { type: 'string', description: 'The FEEL expression text' },
      expressionLanguage: {
        type: 'string',
        description: "Expression language (default: 'feel')",
      },
      typeRef: {
        type: 'string',
        description: "Result type reference (e.g. 'string', 'integer', 'boolean')",
      },
    },
    required: ['diagramId', 'decisionId', 'text'],
  },
} as const;
