/**
 * Handler for set_dmn_element_properties tool.
 *
 * Updates properties on a DMN DRD element: standard attributes (name, id),
 * Camunda 7 extension properties (camunda:* prefix), decision table
 * settings (hitPolicy, aggregation), and element position (x, y).
 *
 * Position properties (x, y) are applied via `modeling.moveElements` —
 * they specify absolute coordinates. At least one of x/y must be provided
 * when repositioning.
 *
 * Camunda properties are validated against a whitelist per element type:
 *   - Decision: camunda:versionTag, camunda:historyTimeToLive
 *   - Definitions: camunda:diagramRelationId
 *   - InputClause: camunda:inputVariable
 *
 * Decision table properties:
 *   - hitPolicy: one of UNIQUE, FIRST, PRIORITY, ANY, COLLECT, RULE ORDER, OUTPUT ORDER
 *   - aggregation: SUM, MIN, MAX, COUNT (only for COLLECT hit policy)
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  requireElement,
  jsonResult,
  syncXml,
  validateArgs,
  typeMismatchError,
  invalidEnumError,
} from '../helpers';

export interface SetPropertiesArgs {
  diagramId: string;
  elementId: string;
  properties: Record<string, any>;
}

// ── Camunda property validation ────────────────────────────────────────────

/** Known Camunda properties per DMN element type. */
const CAMUNDA_PROPERTIES: Record<string, string[]> = {
  'dmn:Decision': ['versionTag', 'historyTimeToLive'],
  'dmn:Definitions': ['diagramRelationId'],
  'dmn:InputClause': ['inputVariable'],
};

/** All known Camunda property names (without prefix). */
const ALL_KNOWN_CAMUNDA = new Set<string>(Object.values(CAMUNDA_PROPERTIES).flat());

/** Strip the camunda: prefix from a property name. */
function normalizeCamundaKey(key: string): string {
  return key.startsWith('camunda:') ? key.slice(8) : key;
}

/** Validate that a camunda property is allowed for the given element type. */
function validateCamundaProperty(propName: string, elementType: string): void {
  if (!ALL_KNOWN_CAMUNDA.has(propName)) {
    throw invalidEnumError('property', propName, [...ALL_KNOWN_CAMUNDA]);
  }
  const allowed = CAMUNDA_PROPERTIES[elementType];
  if (allowed && allowed.includes(propName)) return;
  const supportedTypes = Object.entries(CAMUNDA_PROPERTIES)
    .filter(([, props]) => props.includes(propName))
    .map(([type]) => type);
  throw typeMismatchError('element', elementType, supportedTypes);
}

/** Apply validated camunda properties to the business object's $attrs. */
function applyCamundaAttrs(bo: any, props: Record<string, string>): string[] {
  if (!bo.$attrs) bo.$attrs = {};
  const applied: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    const fullKey = `camunda:${key}`;
    if (value === '' || value === null || value === undefined) {
      delete bo.$attrs[fullKey];
    } else {
      bo.$attrs[fullKey] = value;
    }
    applied.push(fullKey);
  }
  return applied;
}

// ── Hit policy / decision table helpers ────────────────────────────────────

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

/** Require a decision table from a business object, throwing on mismatch. */
function requireDecisionTable(elementId: string, bo: any): any {
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(elementId, bo.$type, ['dmn:Decision']);
  }
  const logic = bo.decisionLogic;
  if (!logic || logic.$type !== 'dmn:DecisionTable') {
    throw typeMismatchError(elementId, logic?.$type || 'none', ['dmn:DecisionTable']);
  }
  return logic;
}

/** Validate and apply hit-policy and/or aggregation to a decision table. */
function applyHitPolicyProps(
  elementId: string,
  bo: any,
  hitPolicy: string | undefined,
  aggregation: string | undefined
): void {
  if (hitPolicy !== undefined) {
    if (!VALID_HIT_POLICIES.includes(hitPolicy as any)) {
      throw invalidEnumError('hitPolicy', hitPolicy, [...VALID_HIT_POLICIES]);
    }
    const logic = requireDecisionTable(elementId, bo);
    logic.hitPolicy = hitPolicy;
    if (aggregation && hitPolicy === 'COLLECT') {
      if (!VALID_AGGREGATIONS.includes(aggregation as any)) {
        throw invalidEnumError('aggregation', aggregation, [...VALID_AGGREGATIONS]);
      }
      logic.aggregation = aggregation;
    } else {
      delete logic.aggregation;
    }
  } else if (aggregation !== undefined) {
    if (!VALID_AGGREGATIONS.includes(aggregation as any)) {
      throw invalidEnumError('aggregation', aggregation, [...VALID_AGGREGATIONS]);
    }
    const logic = requireDecisionTable(elementId, bo);
    if (logic.hitPolicy === 'COLLECT') {
      logic.aggregation = aggregation;
    }
  }
}

/** Partition properties into standard, camunda, decision-table, and position buckets. */
function partitionProperties(
  properties: Record<string, any>,
  elementType: string
): {
  standardProps: Record<string, any>;
  camundaProps: Record<string, string>;
  hitPolicy: string | undefined;
  aggregation: string | undefined;
  posX: number | undefined;
  posY: number | undefined;
} {
  const standardProps: Record<string, any> = {};
  const camundaProps: Record<string, string> = {};
  let hitPolicy: string | undefined;
  let aggregation: string | undefined;
  let posX: number | undefined;
  let posY: number | undefined;

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'hitPolicy') {
      hitPolicy = value;
    } else if (key === 'aggregation') {
      aggregation = value;
    } else if (key === 'x') {
      posX = value;
    } else if (key === 'y') {
      posY = value;
    } else if (key.startsWith('camunda:')) {
      const bare = normalizeCamundaKey(key);
      validateCamundaProperty(bare, elementType);
      camundaProps[bare] = value;
    } else {
      standardProps[key] = value;
    }
  }

  return { standardProps, camundaProps, hitPolicy, aggregation, posX, posY };
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function handleSetProperties(args: SetPropertiesArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementId', 'properties']);
  const { diagramId, elementId, properties } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, elementId);
  const bo = element.businessObject;

  const { standardProps, camundaProps, hitPolicy, aggregation, posX, posY } = partitionProperties(
    properties,
    bo.$type
  );

  // Apply position via modeling.moveElements (absolute coordinates)
  if (posX !== undefined || posY !== undefined) {
    const targetX = posX ?? element.x;
    const targetY = posY ?? element.y;
    const deltaX = targetX - element.x;
    const deltaY = targetY - element.y;
    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      modeling.moveElements([element], { x: deltaX, y: deltaY });
    }
  }

  // Apply standard properties via modeling API
  if (Object.keys(standardProps).length > 0) {
    modeling.updateProperties(element, standardProps);
  }

  // Apply camunda properties via $attrs
  if (Object.keys(camundaProps).length > 0) {
    applyCamundaAttrs(bo, camundaProps);
  }

  // Apply hit-policy / aggregation to the decision table
  applyHitPolicyProps(elementId, bo, hitPolicy, aggregation);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    elementId,
    updatedProperties: Object.keys(properties),
    message: `Updated ${Object.keys(properties).length} propert${Object.keys(properties).length === 1 ? 'y' : 'ies'} on ${elementId}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'set_dmn_element_properties',
  description:
    'Set properties on a DMN DRD element. Supports standard DMN attributes (name, id), ' +
    'Camunda extension properties (camunda:versionTag, camunda:historyTimeToLive, ' +
    'camunda:diagramRelationId — prefix is required), decision table ' +
    'settings (hitPolicy, aggregation), and element position (x, y — absolute coordinates). ' +
    'Set a camunda property to empty string to remove it.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: { type: 'string', description: 'The element ID' },
      properties: {
        type: 'object',
        description:
          'Key-value map of properties to set. Use camunda: prefix for Camunda properties ' +
          '(e.g. "camunda:versionTag"). Use hitPolicy / aggregation for decision table settings. ' +
          'Use x / y for absolute element positioning.',
      },
    },
    required: ['diagramId', 'elementId', 'properties'],
  },
} as const;
