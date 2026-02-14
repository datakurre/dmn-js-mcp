/**
 * Handler for set_dmn_camunda_properties tool.
 *
 * Sets Camunda 7 extension properties on DMN elements. These are
 * namespace-prefixed attributes defined by the camunda-dmn-moddle extension:
 *
 * - Decision: camunda:versionTag, camunda:historyTimeToLive
 * - Definitions: camunda:diagramRelationId
 * - InputClause: camunda:inputVariable
 */

import { type ToolResult } from '../../types';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';
import { typeMismatchError, invalidEnumError } from '../../errors';

export interface SetCamundaPropertiesArgs {
  diagramId: string;
  elementId: string;
  properties: Record<string, string>;
}

/** Known Camunda properties per DMN element type. */
const CAMUNDA_PROPERTIES: Record<string, string[]> = {
  'dmn:Decision': ['versionTag', 'historyTimeToLive'],
  'dmn:Definitions': ['diagramRelationId'],
  'dmn:InputClause': ['inputVariable'],
};

/** All known Camunda property names (without prefix). */
const ALL_KNOWN_PROPERTIES = new Set<string>(Object.values(CAMUNDA_PROPERTIES).flat());

/** Strip the optional camunda: prefix from a property name. */
function normalizePropName(key: string): string {
  return key.startsWith('camunda:') ? key.slice(8) : key;
}

/** Validate that a property is allowed for the given element type. */
function validateProperty(propName: string, elementType: string): void {
  if (!ALL_KNOWN_PROPERTIES.has(propName)) {
    throw invalidEnumError('property', propName, [...ALL_KNOWN_PROPERTIES]);
  }

  const allowed = CAMUNDA_PROPERTIES[elementType];
  if (allowed && allowed.includes(propName)) return;

  const supportedTypes = Object.entries(CAMUNDA_PROPERTIES)
    .filter(([, props]) => props.includes(propName))
    .map(([type]) => type);
  throw typeMismatchError('element', elementType, supportedTypes);
}

/** Apply validated properties to the business object's $attrs. */
function applyToAttrs(bo: any, props: Record<string, string>): string[] {
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

export async function handleSetCamundaProperties(
  args: SetCamundaPropertiesArgs
): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementId', 'properties']);
  const { diagramId, elementId, properties } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, elementId);

  const bo = element.businessObject;
  const elementType: string = bo.$type;

  // Normalize and validate all properties
  const validated: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    const propName = normalizePropName(key);
    validateProperty(propName, elementType);
    validated[propName] = value;
  }

  const appliedKeys = applyToAttrs(bo, validated);
  await syncXml(diagram);

  const count = appliedKeys.length;
  return jsonResult({
    success: true,
    elementId,
    elementType,
    appliedProperties: appliedKeys,
    message: `Set ${count} Camunda propert${count === 1 ? 'y' : 'ies'} on ${elementId}: ${appliedKeys.join(', ')}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'set_dmn_camunda_properties',
  description:
    'Set Camunda 7 extension properties on a DMN element. ' +
    'Available properties: ' +
    'Decision — versionTag, historyTimeToLive; ' +
    'Definitions — diagramRelationId. ' +
    'Property names can be given with or without the camunda: prefix. ' +
    'Set a property to empty string to remove it.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: {
        type: 'string',
        description: 'The element ID (Decision or Definitions element)',
      },
      properties: {
        type: 'object',
        description:
          'Key-value map of Camunda properties. Keys can be "versionTag" or ' +
          '"camunda:versionTag" (prefix is optional). ' +
          'Available: versionTag, historyTimeToLive (Decision), ' +
          'diagramRelationId (Definitions).',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['diagramId', 'elementId', 'properties'],
  },
} as const;
