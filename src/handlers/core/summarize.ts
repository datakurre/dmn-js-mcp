/**
 * Handler for summarize_dmn_diagram tool.
 *
 * Returns a lightweight summary of a DMN diagram: decision names, element
 * counts by type, decision logic types, and connectivity stats.
 * Useful for AI callers to orient before making changes.
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  jsonResult,
  getVisibleElements,
  isConnectionElement,
  buildElementCounts,
  validateArgs,
} from '../helpers';

export interface SummarizeDiagramArgs {
  diagramId: string;
}

/** Classify a DRD element as disconnected (missing expected connections). */
function isDisconnected(el: any): boolean {
  const hasIncoming = el.incoming && el.incoming.length > 0;
  const hasOutgoing = el.outgoing && el.outgoing.length > 0;
  if (el.type === 'dmn:TextAnnotation') return false;
  // InputData typically only has outgoing
  if (el.type === 'dmn:InputData') return !hasOutgoing;
  // Decisions should have incoming requirements (unless they are the only decision)
  if (el.type === 'dmn:Decision') return !hasIncoming && !hasOutgoing;
  return !hasIncoming && !hasOutgoing;
}

export async function handleSummarizeDiagram(args: SummarizeDiagramArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const allElements = getVisibleElements(elementRegistry);

  // Element counts
  const elementCounts = buildElementCounts(elementRegistry);

  // Decision info
  const decisions = allElements.filter((el: any) => el.type === 'dmn:Decision');
  const decisionInfo = decisions.map((d: any) => {
    const bo = d.businessObject;
    const logic = bo.decisionLogic;
    return {
      id: d.id,
      name: bo.name || '(unnamed)',
      decisionLogicType: logic?.$type || 'none',
    };
  });

  // Connections
  const connections = allElements.filter((el: any) => isConnectionElement(el.type));

  // Non-connection elements
  const nodeElements = allElements.filter((el: any) => !isConnectionElement(el.type));

  // Disconnected elements
  const disconnected = nodeElements.filter(isDisconnected);

  // Named elements
  const namedElements = nodeElements
    .filter((el: any) => el.businessObject?.name)
    .map((el: any) => ({
      id: el.id,
      type: el.type,
      name: el.businessObject.name,
    }));

  return jsonResult({
    success: true,
    diagramName: diagram.name || '(unnamed)',
    hintLevel: diagram.hintLevel ?? 'full',
    decisions: decisionInfo,
    elementCounts,
    totalElements: allElements.length,
    nodeCount: nodeElements.length,
    connectionCount: connections.length,
    disconnectedCount: disconnected.length,
    namedElements,
    ...(disconnected.length > 0
      ? {
          disconnectedElements: disconnected.map((el: any) => ({
            id: el.id,
            type: el.type,
            name: el.businessObject?.name || '(unnamed)',
          })),
        }
      : {}),
  });
}

export const TOOL_DEFINITION = {
  name: 'summarize_dmn_diagram',
  description:
    'Get a lightweight summary of a DMN diagram: decision names and logic types, element ' +
    'counts by type, named elements, and connectivity stats. Useful for orienting ' +
    'before making changes — avoids the overhead of listing every element with full details.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
    },
    required: ['diagramId'],
  },
} as const;
