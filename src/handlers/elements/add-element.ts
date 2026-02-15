/**
 * Handler for add_dmn_element tool.
 *
 * Adds a new DRD element (Decision, InputData, BusinessKnowledgeModel,
 * KnowledgeSource, TextAnnotation) to the diagram.
 */

import { type ToolResult } from '../../types';
import { getElementSize, STANDARD_DMN_GAP } from '../../constants';
import { invalidEnumError } from '../../errors';
import {
  requireDiagram,
  jsonResult,
  syncXml,
  validateArgs,
  getVisibleElements,
  buildElementCounts,
} from '../helpers';

export interface AddElementArgs {
  diagramId: string;
  elementType: string;
  name?: string;
  x?: number;
  y?: number;
  afterElementId?: string;
}

/** Allowed DRD element types. */
const ALLOWED_TYPES = [
  'dmn:Decision',
  'dmn:InputData',
  'dmn:BusinessKnowledgeModel',
  'dmn:KnowledgeSource',
  'dmn:TextAnnotation',
] as const;

const ALLOWED_SET = new Set<string>(ALLOWED_TYPES);

/** Resolve the position for a new element based on args or auto-positioning. */
function resolvePosition(
  args: AddElementArgs,
  elementRegistry: { get: (id: string) => unknown; getAll: () => unknown[] },
  size: { width: number; height: number }
): { x: number; y: number } {
  let { x = 200, y = 200 } = args;

  if (args.afterElementId) {
    const afterEl = elementRegistry.get(args.afterElementId) as Record<string, number> | undefined;
    if (afterEl) {
      x = afterEl.x + (afterEl.width || size.width) + STANDARD_DMN_GAP;
      y = afterEl.y + (afterEl.height || size.height) / 2;
    }
    return { x, y };
  }

  if (!args.x && !args.y) {
    const elements = getVisibleElements(elementRegistry);
    let maxRight = 0;
    let maxRightY = 200;
    for (const el of elements) {
      const right = (el.x || 0) + (el.width || 0);
      if (right > maxRight) {
        maxRight = right;
        maxRightY = (el.y || 0) + (el.height || 0) / 2;
      }
    }
    if (elements.length > 0) {
      x = maxRight + STANDARD_DMN_GAP;
      y = maxRightY;
    }
  }

  return { x, y };
}

export async function handleAddElement(args: AddElementArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'elementType']);
  const { diagramId, elementType, name: elementName } = args;

  if (!ALLOWED_SET.has(elementType)) {
    throw invalidEnumError('elementType', elementType, [...ALLOWED_TYPES]);
  }

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementFactory = viewer.get('elementFactory');
  const elementRegistry = viewer.get('elementRegistry');
  const canvas = viewer.get('canvas');

  const size = getElementSize(elementType);
  const { x, y } = resolvePosition(args, elementRegistry, size);

  // Create the shape
  const shape = elementFactory.createShape({ type: elementType });
  const rootElement = canvas.getRootElement();

  // Position is center-based in dmn-js
  const centerX = x + size.width / 2;
  const centerY = y + size.height / 2;

  modeling.createShape(shape, { x: centerX, y: centerY }, rootElement);

  // Set name if provided
  if (elementName) {
    modeling.updateProperties(shape, { name: elementName });
  }

  await syncXml(diagram);

  return jsonResult({
    success: true,
    elementId: shape.id,
    elementType,
    name: elementName || undefined,
    position: { x: shape.x, y: shape.y },
    size: { width: shape.width, height: shape.height },
    diagramCounts: buildElementCounts(elementRegistry),
    message: `Added ${elementType} element${elementName ? ` "${elementName}"` : ''} with ID: ${shape.id}`,
    nextSteps: [
      {
        tool: 'connect_dmn_elements',
        description: 'Connect this element to other elements with requirements.',
      },
      ...(elementType === 'dmn:Decision'
        ? [
            {
              tool: 'get_dmn_decision_logic',
              description: 'Inspect the decision logic for this decision.',
            },
          ]
        : []),
    ],
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_element',
  description:
    'Add a new element to the DMN DRD (Decision Requirements Diagram). ' +
    'Supported types: dmn:Decision, dmn:InputData, dmn:BusinessKnowledgeModel, ' +
    'dmn:KnowledgeSource, dmn:TextAnnotation.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementType: {
        type: 'string',
        enum: [...ALLOWED_TYPES],
        description: 'The DMN element type to create',
      },
      name: { type: 'string', description: 'Optional name for the element' },
      x: { type: 'number', description: 'X position (top-left). Auto-positioned if omitted.' },
      y: { type: 'number', description: 'Y position (top-left). Auto-positioned if omitted.' },
      afterElementId: {
        type: 'string',
        description: 'Position the new element to the right of this element. Overrides x/y.',
      },
    },
    required: ['diagramId', 'elementType'],
  },
} as const;
