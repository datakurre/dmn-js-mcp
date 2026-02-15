/**
 * Handler for get_dmn_element_properties tool.
 *
 * Returns properties of a DMN DRD element including standard attributes,
 * decision logic type, connections, and Camunda extension properties.
 */

import { type ToolResult } from '../../types';
import { requireDiagram, requireElement, jsonResult, validateArgs } from '../helpers';

export interface GetPropertiesArgs {
  diagramId: string;
  elementId: string;
}

/** Extract camunda:* attributes from a business object, if any. */
export function extractCamundaAttrs(bo: any): Record<string, any> | undefined {
  if (!bo?.$attrs) return undefined;
  const attrs: Record<string, any> = {};
  for (const [key, value] of Object.entries(bo.$attrs)) {
    if (key.startsWith('camunda:')) attrs[key] = value;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/** Serialize connection information. */
export function serializeConnections(element: any): { incoming?: any[]; outgoing?: any[] } {
  const result: { incoming?: any[]; outgoing?: any[] } = {};
  if (element.incoming?.length) {
    result.incoming = element.incoming.map((c: any) => ({
      id: c.id,
      type: c.type,
      sourceId: c.source?.id,
    }));
  }
  if (element.outgoing?.length) {
    result.outgoing = element.outgoing.map((c: any) => ({
      id: c.id,
      type: c.type,
      targetId: c.target?.id,
    }));
  }
  return result;
}

/** Serialize decision logic summary. */
export function serializeDecisionLogic(bo: any): Record<string, any> | undefined {
  const logic = bo.decisionLogic;
  if (!logic) return undefined;

  const result: Record<string, any> = { type: logic.$type };

  if (logic.$type === 'dmn:DecisionTable') {
    result.inputCount = logic.input?.length || 0;
    result.outputCount = logic.output?.length || 0;
    result.ruleCount = logic.rule?.length || 0;
    result.hitPolicy = logic.hitPolicy || 'UNIQUE';
  } else if (logic.$type === 'dmn:LiteralExpression') {
    result.text = logic.text || '';
    result.expressionLanguage = logic.expressionLanguage || 'feel';
  }

  return result;
}

export async function handleGetProperties(args: GetPropertiesArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementId']);
  const { diagramId, elementId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, elementId);
  const bo = element.businessObject;

  const result: Record<string, any> = {
    id: bo.id,
    type: element.type,
    name: bo.name,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };

  const camunda = extractCamundaAttrs(bo);
  if (camunda) result.camundaProperties = camunda;

  const connections = serializeConnections(element);
  if (connections.incoming) result.incoming = connections.incoming;
  if (connections.outgoing) result.outgoing = connections.outgoing;

  const logic = serializeDecisionLogic(bo);
  if (logic) result.decisionLogic = logic;

  return jsonResult(result);
}

export const TOOL_DEFINITION = {
  name: 'get_dmn_element_properties',
  description:
    'Get all properties of a DMN DRD element, including standard attributes, ' +
    'decision logic summary, connections, and Camunda extension properties.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: {
        type: 'string',
        description: 'The ID of the element to inspect',
      },
    },
    required: ['diagramId', 'elementId'],
  },
} as const;
