/**
 * Shared test helpers for dmn-js-mcp tests.
 */

import { type ToolResult } from '../src/types';
import {
  storeDiagram,
  generateDiagramId,
  createModeler,
  createModelerFromXml,
  clearDiagrams,
} from '../src/diagram-manager';

/** Extract the JSON payload from a tool result. */
export function parseResult(result: ToolResult): any {
  const text = result.content?.[0]?.text;
  if (!text) return {};
  return JSON.parse(text);
}

/** Create a fresh diagram and return its ID + state. */
export async function createDiagram(name?: string) {
  const diagramId = generateDiagramId();
  const modeler = await createModeler();
  const { xml } = await modeler.saveXML({ format: true });
  storeDiagram(diagramId, { modeler, xml: xml || '', name });
  return { diagramId, modeler };
}

/** Import DMN XML and return diagram ID + modeler. */
export async function importXml(xml: string) {
  const diagramId = generateDiagramId();
  const modeler = await createModelerFromXml(xml);
  const saved = await modeler.saveXML({ format: true });
  storeDiagram(diagramId, { modeler, xml: saved.xml || '' });
  return { diagramId, modeler };
}

/** Get the element registry from the active DRD viewer. */
export function getRegistry(modeler: any) {
  const viewer = modeler.getActiveViewer();
  return viewer.get('elementRegistry');
}

/** Export XML from a diagram's modeler. */
export async function exportXml(modeler: any): Promise<string> {
  const { xml } = await modeler.saveXML({ format: true });
  return xml || '';
}

export { clearDiagrams };
