/**
 * Handler for set_dmn_element_properties tool.
 *
 * Updates properties on a DMN DRD element (name, and other standard attributes).
 */

import { type ToolResult } from '../../types';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface SetPropertiesArgs {
  diagramId: string;
  elementId: string;
  properties: Record<string, any>;
}

export async function handleSetProperties(args: SetPropertiesArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementId', 'properties']);
  const { diagramId, elementId, properties } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, elementId);

  // Separate camunda: prefixed properties from standard ones
  const standardProps: Record<string, any> = {};
  const camundaProps: Record<string, any> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('camunda:')) {
      camundaProps[key] = value;
    } else {
      standardProps[key] = value;
    }
  }

  // Apply standard properties
  if (Object.keys(standardProps).length > 0) {
    modeling.updateProperties(element, standardProps);
  }

  // Apply camunda properties via $attrs
  if (Object.keys(camundaProps).length > 0) {
    const bo = element.businessObject;
    if (!bo.$attrs) bo.$attrs = {};
    for (const [key, value] of Object.entries(camundaProps)) {
      bo.$attrs[key] = value;
    }
  }

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
    'Set properties on a DMN DRD element. Supports standard DMN attributes (name, id) ' +
    'and Camunda extension properties (camunda:* prefix).',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: { type: 'string', description: 'The element ID' },
      properties: {
        type: 'object',
        description:
          'Key-value map of properties to set. Use camunda: prefix for Camunda properties.',
      },
    },
    required: ['diagramId', 'elementId', 'properties'],
  },
} as const;
