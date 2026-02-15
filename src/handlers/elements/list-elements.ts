/**
 * Handler for list_dmn_elements tool.
 *
 * Lists all elements in the DRD with their types, names, positions,
 * and connection information. Supports optional filters.
 *
 * When `elementId` is provided, returns a rich single-element view with
 * Camunda extension properties, detailed connections, and decision logic summary.
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  requireElement,
  jsonResult,
  getVisibleElements,
  validateArgs,
} from '../helpers';
import {
  extractCamundaAttrs,
  serializeConnections,
  serializeDecisionLogic,
} from './get-properties';

export interface ListElementsArgs {
  diagramId: string;
  elementId?: string;
  namePattern?: string;
  elementType?: string;
}

/** Convert a registry element to a serialisable list entry. */
function mapElementToEntry(el: any): Record<string, any> {
  const entry: Record<string, any> = {
    id: el.id,
    type: el.type,
    name: el.businessObject?.name || '(unnamed)',
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  };

  if (el.incoming?.length) entry.incoming = el.incoming.map((c: any) => c.id);
  if (el.outgoing?.length) entry.outgoing = el.outgoing.map((c: any) => c.id);

  if (el.source) entry.sourceId = el.source.id;
  if (el.target) entry.targetId = el.target.id;
  if (el.waypoints && el.waypoints.length > 0) {
    entry.waypoints = el.waypoints.map((wp: any) => ({ x: wp.x, y: wp.y }));
  }

  // For Decision elements, show the decision logic type
  const bo = el.businessObject;
  if (bo?.decisionLogic) {
    entry.decisionLogicType = bo.decisionLogic.$type;
  }

  return entry;
}

export async function handleListElements(args: ListElementsArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId, elementId, namePattern, elementType } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');

  // ── Single-element mode: rich view with Camunda attrs, connections, logic ─
  if (elementId) {
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

  // ── List mode: all elements with optional filters ─────────────────────────
  let elements = getVisibleElements(elementRegistry);

  const hasFilters = !!(namePattern || elementType);

  // Filter by element type
  if (elementType) {
    elements = elements.filter((el: any) => el.type === elementType);
  }

  // Filter by name pattern (case-insensitive regex)
  if (namePattern) {
    const regex = new RegExp(namePattern, 'i');
    elements = elements.filter((el: any) => regex.test(el.businessObject?.name || ''));
  }

  const elementList = elements.map(mapElementToEntry);

  return jsonResult({
    success: true,
    elements: elementList,
    count: elementList.length,
    ...(hasFilters
      ? {
          filters: {
            ...(namePattern ? { namePattern } : {}),
            ...(elementType ? { elementType } : {}),
          },
        }
      : {}),
  });
}

export const TOOL_DEFINITION = {
  name: 'list_dmn_elements',
  description:
    'List all elements in a DMN DRD with their types, names, positions, and connections. ' +
    'Supports optional filters to search by name pattern or element type. ' +
    'When elementId is provided, returns a rich single-element view including ' +
    'Camunda extension properties, detailed connections, and decision logic summary.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: {
        type: 'string',
        description:
          'The ID of a specific element to inspect. Returns a rich view with Camunda properties, detailed connections, and decision logic summary.',
      },
      namePattern: {
        type: 'string',
        description:
          'Regex pattern to match against element names (case-insensitive). Ignored when elementId is set.',
      },
      elementType: {
        type: 'string',
        description:
          "DMN element type to filter by (e.g. 'dmn:Decision', 'dmn:InputData'). Ignored when elementId is set.",
      },
    },
    required: ['diagramId'],
  },
} as const;
