/**
 * @internal List all in-memory diagrams.
 *
 * Not a registered MCP tool — the same data is served via the
 * `dmn://diagrams` resource (see src/resources.ts). This handler
 * is kept as an internal helper for backward compatibility.
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
