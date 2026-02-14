/**
 * Handler for layout_dmn_diagram tool.
 *
 * Uses elkjs (Eclipse Layout Kernel) with the Sugiyama layered algorithm
 * to produce clean top-to-bottom layouts of DRD (Decision Requirements
 * Diagrams). DRDs are flat directed graphs with no lanes/containers, so
 * the layout is simpler than BPMN.
 *
 * Flow: decisions depend on inputs and other decisions, so the natural
 * layout is bottom-to-top: InputData at the bottom, intermediate
 * decisions in the middle, final decisions at the top.
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  jsonResult,
  syncXml,
  getVisibleElements,
  isConnectionElement,
  buildElementCounts,
  validateArgs,
} from '../helpers';
import {
  getElementSize,
  ELK_LAYER_SPACING,
  ELK_NODE_SPACING,
  ELK_EDGE_NODE_SPACING,
} from '../../constants';

export interface LayoutDiagramArgs {
  diagramId: string;
  direction?: 'UP' | 'DOWN' | 'RIGHT' | 'LEFT';
  nodeSpacing?: number;
  layerSpacing?: number;
}

/** Map of ELK direction strings to elkjs algorithm options. */
const DIRECTION_MAP: Record<string, string> = {
  UP: 'UP',
  DOWN: 'DOWN',
  RIGHT: 'RIGHT',
  LEFT: 'LEFT',
};

/** Build the ELK graph descriptor from DRD elements. */
function buildElkGraph(
  nodeElements: any[],
  connections: any[],
  direction: string,
  nodeSpacing: number,
  layerSpacing: number
) {
  const children = nodeElements.map((el: any) => {
    const size = getElementSize(el.type);
    return {
      id: el.id,
      width: el.width || size.width,
      height: el.height || size.height,
    };
  });

  const edges = connections
    .filter((conn: any) => conn.source && conn.target)
    .map((conn: any) => ({
      id: conn.id,
      sources: [conn.source.id],
      targets: [conn.target.id],
    }));

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.spacing.edgeNode': String(ELK_EDGE_NODE_SPACING),
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children,
    edges,
  };
}

/** Apply ELK-computed positions back to DRD elements via the modeling API. */
function applyPositions(
  layoutResult: any,
  elementRegistry: any,
  modeling: any
): { movedCount: number; movedElements: any[] } {
  let movedCount = 0;
  const movedElements: any[] = [];

  for (const elkNode of layoutResult.children || []) {
    const element = elementRegistry.get(elkNode.id);
    if (!element) continue;

    const newX = elkNode.x ?? 0;
    const newY = elkNode.y ?? 0;
    const deltaX = newX - element.x;
    const deltaY = newY - element.y;

    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      movedElements.push({
        id: element.id,
        from: { x: element.x, y: element.y },
        to: { x: newX, y: newY },
      });
      modeling.moveElements([element], { x: deltaX, y: deltaY });
      movedCount++;
    }
  }

  return { movedCount, movedElements };
}

export async function handleLayoutDiagram(args: LayoutDiagramArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId, direction = 'UP', nodeSpacing, layerSpacing } = args;

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');

  const allElements = getVisibleElements(elementRegistry);
  const nodeElements = allElements.filter((el: any) => !isConnectionElement(el.type));
  const connections = allElements.filter((el: any) => isConnectionElement(el.type));

  if (nodeElements.length === 0) {
    return jsonResult({ success: true, message: 'No elements to layout.', elementsMoved: 0 });
  }

  const elkDirection = DIRECTION_MAP[direction] || 'UP';
  const elkGraph = buildElkGraph(
    nodeElements,
    connections,
    elkDirection,
    nodeSpacing ?? ELK_NODE_SPACING,
    layerSpacing ?? ELK_LAYER_SPACING
  );

  // Dynamically import elkjs (it's externalised in esbuild)
  const ELK = (await import('elkjs')).default;
  const elk = new ELK();
  const layoutResult = await elk.layout(elkGraph);

  const { movedCount, movedElements } = applyPositions(layoutResult, elementRegistry, modeling);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    direction: elkDirection,
    elementsMoved: movedCount,
    totalElements: nodeElements.length,
    diagramCounts: buildElementCounts(elementRegistry),
    message: `Layout applied: moved ${movedCount}/${nodeElements.length} elements (direction: ${elkDirection})`,
    ...(movedElements.length > 0 && movedElements.length <= 20 ? { movedElements } : {}),
  });
}

export const TOOL_DEFINITION = {
  name: 'layout_dmn_diagram',
  description:
    'Automatically arrange elements in a DMN DRD (Decision Requirements Diagram) using ' +
    'the ELK layered algorithm. Produces a clean hierarchical layout with InputData at the ' +
    'leaves, intermediate decisions in the middle, and final decisions at the root. ' +
    'Default direction is UP (bottom-to-top), which matches the natural DRD convention.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      direction: {
        type: 'string',
        enum: ['UP', 'DOWN', 'RIGHT', 'LEFT'],
        description:
          'Layout direction. UP = bottom-to-top (default, standard DRD convention), ' +
          'DOWN = top-to-bottom, RIGHT = left-to-right, LEFT = right-to-left.',
      },
      nodeSpacing: {
        type: 'number',
        description: `Spacing in pixels between nodes in the same layer (default: ${ELK_NODE_SPACING}).`,
      },
      layerSpacing: {
        type: 'number',
        description: `Spacing in pixels between layers (default: ${ELK_LAYER_SPACING}).`,
      },
    },
    required: ['diagramId'],
  },
} as const;
