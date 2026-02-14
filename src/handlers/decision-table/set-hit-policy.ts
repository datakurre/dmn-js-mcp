/**
 * Handler for set_dmn_hit_policy tool.
 *
 * Sets the hit policy (and optional aggregation) on a decision table.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError, invalidEnumError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface SetHitPolicyArgs {
  diagramId: string;
  decisionId: string;
  hitPolicy: string;
  aggregation?: string;
}

const VALID_HIT_POLICIES = [
  'UNIQUE',
  'FIRST',
  'PRIORITY',
  'ANY',
  'COLLECT',
  'RULE ORDER',
  'OUTPUT ORDER',
] as const;

const VALID_AGGREGATIONS = ['SUM', 'MIN', 'MAX', 'COUNT'] as const;

export async function handleSetHitPolicy(args: SetHitPolicyArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId', 'hitPolicy']);
  const { diagramId, decisionId, hitPolicy, aggregation } = args;

  if (!VALID_HIT_POLICIES.includes(hitPolicy as any)) {
    throw invalidEnumError('hitPolicy', hitPolicy, [...VALID_HIT_POLICIES]);
  }

  if (aggregation && !VALID_AGGREGATIONS.includes(aggregation as any)) {
    throw invalidEnumError('aggregation', aggregation, [...VALID_AGGREGATIONS]);
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

  logic.hitPolicy = hitPolicy;
  if (aggregation && hitPolicy === 'COLLECT') {
    logic.aggregation = aggregation;
  } else {
    delete logic.aggregation;
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    hitPolicy,
    aggregation: hitPolicy === 'COLLECT' ? aggregation || undefined : undefined,
    message: `Set hit policy to ${hitPolicy}${aggregation && hitPolicy === 'COLLECT' ? ` (${aggregation})` : ''} on ${decisionId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'set_dmn_hit_policy',
  description:
    'Set the hit policy on a decision table. ' +
    'Aggregation is only applicable when hitPolicy is COLLECT.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      hitPolicy: {
        type: 'string',
        enum: [...VALID_HIT_POLICIES],
        description: 'The hit policy to set',
      },
      aggregation: {
        type: 'string',
        enum: [...VALID_AGGREGATIONS],
        description: 'Aggregation function (only for COLLECT hit policy)',
      },
    },
    required: ['diagramId', 'decisionId', 'hitPolicy'],
  },
} as const;
