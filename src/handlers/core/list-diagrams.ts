/**
 * Handler for list_dmn_diagrams tool.
 */

import { type ToolResult } from '../../types';
import { getAllDiagrams } from '../../diagram-manager';
import { jsonResult, getVisibleElements } from '../helpers';

export async function handleListDiagrams(): Promise<ToolResult> {
  const diagrams = getAllDiagrams();
  const list: any[] = [];

  for (const [id, state] of diagrams) {
    let elementCount = 0;
    try {
      const viewer = state.modeler.getActiveViewer();
      if (viewer) {
        const elementRegistry = viewer.get('elementRegistry');
        const elements = getVisibleElements(elementRegistry);
        elementCount = elements.length;
      }
    } catch {
      // If viewer isn't available, count is 0
    }
    list.push({
      id,
      name: state.name || '(unnamed)',
      elementCount,
    });
  }

  return jsonResult({
    success: true,
    diagrams: list,
    count: list.length,
  });
}

export const TOOL_DEFINITION = {
  name: 'list_dmn_diagrams',
  description: 'List all DMN diagrams in memory with their IDs, names, and element counts.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
} as const;
