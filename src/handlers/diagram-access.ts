/**
 * @internal
 * Diagram and element lookup helpers with MCP error handling.
 *
 * Provides typed accessors that throw McpError when resources are not found.
 * Adapted for DMN-specific element types and DRD services.
 */

import { type ToolResult } from '../types';
import { getDiagram, getAllDiagrams } from '../diagram-manager';
import { isPersistenceEnabled, persistDiagram } from '../persistence';
import { diagramNotFoundError, elementNotFoundError } from '../errors';

/** Look up a diagram by ID, throwing an MCP error if not found. */
export function requireDiagram(diagramId: string) {
  const diagram = getDiagram(diagramId);
  if (!diagram) {
    throw diagramNotFoundError(diagramId);
  }
  return diagram;
}

/** Look up an element by ID, throwing an MCP error if not found. */
export function requireElement(elementRegistry: any, elementId: string) {
  const element = elementRegistry.get(elementId);
  if (!element) {
    throw elementNotFoundError(elementId);
  }
  return element;
}

/** Wrap a plain object into the MCP tool-result envelope. */
export function jsonResult(data: Record<string, any>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/** Save XML back to diagram state and auto-persist if enabled. */
export async function syncXml(diagram: ReturnType<typeof requireDiagram>) {
  const { xml } = await diagram.modeler.saveXML({ format: true });
  diagram.xml = xml || '';

  // Auto-persist when file-backed persistence is enabled
  if (isPersistenceEnabled()) {
    for (const [id, state] of getAllDiagrams()) {
      if (state === diagram) {
        // Fire-and-forget — persistence failures are non-fatal
        persistDiagram(id, diagram).catch(() => {});
        break;
      }
    }
  }
}

// ── Shared element-filtering helpers ───────────────────────────────────────

/** DMN connection types (requirements, associations). */
const CONNECTION_TYPES = new Set([
  'dmn:InformationRequirement',
  'dmn:KnowledgeRequirement',
  'dmn:AuthorityRequirement',
  'dmn:Association',
]);

/** Infrastructure types filtered from "visible" element lists. */
const INFRASTRUCTURE_TYPES = new Set(['dmn:Definitions', 'label']);

/**
 * Return all "visible" elements from the DRD registry, filtering out
 * infrastructure types (Definitions, labels, diagram planes).
 */
export function getVisibleElements(elementRegistry: any): any[] {
  return elementRegistry.filter(
    (el: any) =>
      el.type &&
      !INFRASTRUCTURE_TYPES.has(el.type) &&
      !el.type.includes('DMNDiagram') &&
      !el.type.includes('DMNPlane')
  );
}

/** Check if an element type is a connection (requirement/association). */
export function isConnectionElement(type: string): boolean {
  return CONNECTION_TYPES.has(type);
}

// ── Element count summary ──────────────────────────────────────────────────

/**
 * Build a compact element-count summary for a DMN DRD.
 *
 * Returns: { decisions, inputData, bkm, knowledgeSources, connections, total }
 */
export function buildElementCounts(elementRegistry: any): Record<string, number> {
  const elements = getVisibleElements(elementRegistry);
  let decisions = 0;
  let inputData = 0;
  let bkm = 0;
  let knowledgeSources = 0;
  let textAnnotations = 0;
  let connections = 0;

  for (const el of elements) {
    const t = el.type || '';
    if (t === 'dmn:Decision') decisions++;
    else if (t === 'dmn:InputData') inputData++;
    else if (t === 'dmn:BusinessKnowledgeModel') bkm++;
    else if (t === 'dmn:KnowledgeSource') knowledgeSources++;
    else if (t === 'dmn:TextAnnotation') textAnnotations++;
    else if (CONNECTION_TYPES.has(t)) connections++;
  }

  return {
    decisions,
    inputData,
    bkm,
    knowledgeSources,
    textAnnotations,
    connections,
    total: elements.length,
  };
}

// ── Connectivity warnings ──────────────────────────────────────────────────

/** Build warnings about disconnected DRD elements. */
export function buildConnectivityWarnings(elementRegistry: any): string[] {
  const elements = elementRegistry.filter(
    (el: any) =>
      el.type &&
      (el.type === 'dmn:Decision' ||
        el.type === 'dmn:InputData' ||
        el.type === 'dmn:BusinessKnowledgeModel' ||
        el.type === 'dmn:KnowledgeSource')
  );
  const connections = elementRegistry.filter((el: any) => CONNECTION_TYPES.has(el.type));

  const warnings: string[] = [];
  if (elements.length > 1 && connections.length === 0) {
    warnings.push(
      `⚠️ Note: DRD has ${elements.length} elements but no connections. ` +
        'Use connect_dmn_elements to add requirements.'
    );
  }

  return warnings;
}
