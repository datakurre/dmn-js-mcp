/**
 * Handler for move_dmn_element tool.
 *
 * Moves a DRD element to absolute coordinates.
 */

import { type ToolResult } from '../../types';
import { illegalCombinationError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';

export interface MoveElementArgs {
  diagramId: string;
  elementId: string;
  x?: number;
  y?: number;
}

export async function handleMoveElement(args: MoveElementArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementId']);
  const { diagramId, elementId, x, y } = args;

  if (x === undefined && y === undefined) {
    throw illegalCombinationError('At least one of x or y must be provided.', ['x', 'y']);
  }

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, elementId);

  const targetX = x ?? element.x;
  const targetY = y ?? element.y;
  const deltaX = targetX - element.x;
  const deltaY = targetY - element.y;

  if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
    modeling.moveElements([element], { x: deltaX, y: deltaY });
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    elementId,
    position: { x: targetX, y: targetY },
    message: `Moved element ${elementId} to (${targetX}, ${targetY})`,
  });
}

export const TOOL_DEFINITION = {
  name: 'move_dmn_element',
  description: 'Move a DRD element to an absolute position.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: { type: 'string', description: 'The element ID to move' },
      x: { type: 'number', description: 'New X coordinate (top-left)' },
      y: { type: 'number', description: 'New Y coordinate (top-left)' },
    },
    required: ['diagramId', 'elementId'],
  },
} as const;
