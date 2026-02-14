/**
 * MCP Resources — stable, addressable read-context endpoints.
 *
 * Exposes diagram data as MCP resources so AI callers can re-ground
 * context mid-conversation without tool calls:
 *
 *   dmn://diagrams               — list all in-memory diagrams
 *   dmn://diagram/{id}/summary   — lightweight diagram summary
 *   dmn://diagram/{id}/variables — input/output variable references
 *   dmn://diagram/{id}/xml       — current DMN XML
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAllDiagrams, getDiagram } from './diagram-manager';
import { handleSummarizeDiagram } from './handlers/core/summarize';
import { handleValidate } from './handlers/core/validate';
import { handleListVariables } from './handlers/core/list-variables';
import { handleListDiagrams } from './handlers/core/list-diagrams';

/** Resource template definitions for dmn:// URIs. */
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'dmn://diagram/{diagramId}/summary',
    name: 'Diagram summary',
    description:
      'Lightweight summary of a DMN diagram: decision names and logic types, element ' +
      'counts by type, named elements, and connectivity stats.',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'dmn://diagram/{diagramId}/validate',
    name: 'Diagram validation',
    description:
      'Structural validation issues: disconnected elements, missing decision logic, ' +
      'empty tables, and connectivity problems.',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'dmn://diagram/{diagramId}/variables',
    name: 'Decision variables',
    description:
      'All input and output variables referenced in the diagram with type information ' +
      'and source element references.',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'dmn://diagram/{diagramId}/xml',
    name: 'Diagram XML',
    description:
      'Current DMN 1.3 XML of the diagram. Useful for re-grounding context during ' +
      'iterative editing sessions.',
    mimeType: 'application/xml',
  },
];

/**
 * List all currently available concrete resources.
 * Returns a `dmn://diagrams` entry plus per-diagram resources.
 */
export function listResources(): any[] {
  const diagrams = getAllDiagrams();
  const resources: any[] = [];

  // Static resource: diagram list
  resources.push({
    uri: 'dmn://diagrams',
    name: 'All diagrams',
    description: `List of all ${diagrams.size} in-memory DMN diagrams`,
    mimeType: 'application/json',
  });

  // Per-diagram resources
  for (const [id, state] of diagrams) {
    const name = state.name || '(unnamed)';
    resources.push({
      uri: `dmn://diagram/${id}/summary`,
      name: `${name} — summary`,
      description: `Lightweight summary of diagram "${name}"`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `dmn://diagram/${id}/validate`,
      name: `${name} — validation`,
      description: `Validation issues for diagram "${name}"`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `dmn://diagram/${id}/variables`,
      name: `${name} — variables`,
      description: `Decision variables in diagram "${name}"`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `dmn://diagram/${id}/xml`,
      name: `${name} — XML`,
      description: `DMN 1.3 XML of diagram "${name}"`,
      mimeType: 'application/xml',
    });
  }

  return resources;
}

/** Extract the text content from a handler ToolResult. */
function extractText(result: any): string {
  if (result?.content?.[0]?.text) return result.content[0].text;
  return JSON.stringify(result);
}

/**
 * Read a specific resource by URI.
 * Returns `{ contents: [{ uri, mimeType, text }] }`.
 */
export async function readResource(
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  // dmn://diagrams
  if (uri === 'dmn://diagrams') {
    const result = await handleListDiagrams();
    return {
      contents: [{ uri, mimeType: 'application/json', text: extractText(result) }],
    };
  }

  // dmn://diagram/{id}/summary
  const summaryMatch = uri.match(/^dmn:\/\/diagram\/([^/]+)\/summary$/);
  if (summaryMatch) {
    const diagramId = summaryMatch[1];
    ensureDiagramExists(diagramId);
    const result = await handleSummarizeDiagram({ diagramId });
    return {
      contents: [{ uri, mimeType: 'application/json', text: extractText(result) }],
    };
  }

  // dmn://diagram/{id}/validate
  const validateMatch = uri.match(/^dmn:\/\/diagram\/([^/]+)\/validate$/);
  if (validateMatch) {
    const diagramId = validateMatch[1];
    ensureDiagramExists(diagramId);
    const result = await handleValidate({ diagramId });
    return {
      contents: [{ uri, mimeType: 'application/json', text: extractText(result) }],
    };
  }

  // dmn://diagram/{id}/variables
  const varsMatch = uri.match(/^dmn:\/\/diagram\/([^/]+)\/variables$/);
  if (varsMatch) {
    const diagramId = varsMatch[1];
    ensureDiagramExists(diagramId);
    const result = await handleListVariables({ diagramId });
    return {
      contents: [{ uri, mimeType: 'application/json', text: extractText(result) }],
    };
  }

  // dmn://diagram/{id}/xml
  const xmlMatch = uri.match(/^dmn:\/\/diagram\/([^/]+)\/xml$/);
  if (xmlMatch) {
    const diagramId = xmlMatch[1];
    ensureDiagramExists(diagramId);
    const diagram = getDiagram(diagramId)!;
    return {
      contents: [{ uri, mimeType: 'application/xml', text: diagram.xml }],
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
}

/** Validate that a diagram ID exists, throwing McpError if not. */
function ensureDiagramExists(diagramId: string): void {
  if (!getDiagram(diagramId)) {
    throw new McpError(ErrorCode.InvalidRequest, `Diagram not found: ${diagramId}`);
  }
}
