/**
 * Handler for list_dmn_elements tool.
 *
 * Lists all elements in the DRD with their types, names, positions,
 * and connection information. Supports optional filters.
 */

import { type ToolResult } from '../../types';
import { requireDiagram, jsonResult, getVisibleElements, validateArgs } from '../helpers';

export interface ListElementsArgs {
  diagramId: string;
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
  const { diagramId, namePattern, elementType } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
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
    'Supports optional filters to search by name pattern or element type.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      namePattern: {
        type: 'string',
        description: 'Regex pattern to match against element names (case-insensitive).',
      },
      elementType: {
        type: 'string',
        description: "DMN element type to filter by (e.g. 'dmn:Decision', 'dmn:InputData')",
      },
    },
    required: ['diagramId'],
  },
} as const;
