/**
 * Handler for remove_dmn_rule tool.
 *
 * Removes a rule (row) from a decision table by index.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError, invalidEnumError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface RemoveRuleArgs {
  diagramId: string;
  decisionId: string;
  ruleIndex: number;
}

export async function handleRemoveRule(args: RemoveRuleArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, ruleIndex } = args;

  if (ruleIndex === undefined || ruleIndex === null) {
    throw invalidEnumError('ruleIndex', String(ruleIndex), ['0', '1', '2', '...']);
  }

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
    throw typeMismatchError(decisionId, logic?.$type || 'none', ['dmn:DecisionTable']);
  }

  const rules = logic.rule || [];
  if (ruleIndex < 0 || ruleIndex >= rules.length) {
    throw invalidEnumError(
      'ruleIndex',
      String(ruleIndex),
      rules.map((_: any, i: number) => String(i))
    );
  }

  const removed = rules[ruleIndex];
  rules.splice(ruleIndex, 1);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    removedRuleId: removed.id,
    ruleIndex,
    remainingRules: rules.length,
    message: `Removed rule #${ruleIndex + 1} from decision table of ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'remove_dmn_rule',
  description: 'Remove a rule (row) from a decision table by its zero-based index.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      ruleIndex: { type: 'number', description: 'Zero-based index of the rule to remove' },
    },
    required: ['diagramId', 'decisionId', 'ruleIndex'],
  },
} as const;
