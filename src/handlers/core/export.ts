/**
 * Handler for export_dmn tool (XML and SVG).
 *
 * `filePath` is **required** in the MCP tool schema so that AI agents always
 * write the result to disk.  The TypeScript interface keeps it optional for
 * internal / test usage — when omitted, content is returned inline.
 *
 * `returnContent` (default `false`) controls whether the raw XML / SVG text
 * is also included in the JSON response.  Keeping it off by default avoids
 * flooding the context window with large XML payloads.
 */

import { type ToolResult, type DmnModeler } from '../../types';
import { exportFailedError } from '../../errors';
import { requireDiagram, validateArgs } from '../helpers';
import * as fs from 'node:fs/promises';

export interface ExportDmnArgs {
  diagramId: string;
  format: 'xml' | 'svg' | 'both';
  /** Required in MCP schema; optional in TS for internal / test calls. */
  filePath?: string;
  /** When true, include raw XML/SVG in the JSON response (default false). */
  returnContent?: boolean;
}

/** Export XML from a modeler instance. */
async function exportXml(modeler: DmnModeler): Promise<string> {
  const { xml } = await modeler.saveXML({ format: true });
  if (!xml) throw exportFailedError('saveXML returned empty result');
  return xml;
}

/** Export SVG from a modeler instance (best-effort in headless mode). */
async function exportSvg(modeler: DmnModeler, result: Record<string, any>): Promise<string> {
  try {
    const { svg } = await modeler.saveSVG();
    return svg || '';
  } catch {
    result.svgWarning = 'SVG export failed — headless SVG rendering is limited.';
    return '';
  }
}

/** Write exported content to disk and annotate result. */
async function writeToDisk(
  filePath: string,
  format: string,
  xmlContent: string | undefined,
  svgContent: string | undefined,
  result: Record<string, any>
): Promise<void> {
  if (format === 'svg') {
    await fs.writeFile(filePath, svgContent ?? '', 'utf-8');
  } else {
    await fs.writeFile(filePath, xmlContent ?? '', 'utf-8');
  }
  result.filePath = filePath;

  if (format === 'both' && svgContent) {
    const svgPath = filePath.replace(/\.dmn$/, '.svg');
    await fs.writeFile(svgPath, svgContent, 'utf-8');
    result.svgFilePath = svgPath;
  }

  result.message = `DMN exported to ${filePath}`;
}

export async function handleExportDmn(args: ExportDmnArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'format']);
  const { diagramId, format, filePath, returnContent } = args;
  const diagram = requireDiagram(diagramId);

  // When no filePath, always return content inline (backward-compat / tests).
  const includeContent = returnContent === true || !filePath;

  const result: Record<string, any> = { success: true, diagramId, format };

  const needsXml = format === 'xml' || format === 'both';
  const needsSvg = format === 'svg' || format === 'both';

  const xmlContent = needsXml ? await exportXml(diagram.modeler) : undefined;
  const svgContent = needsSvg ? await exportSvg(diagram.modeler, result) : undefined;

  if (includeContent) {
    if (xmlContent !== undefined) result.xml = xmlContent;
    if (svgContent !== undefined) result.svg = svgContent;
  }

  if (filePath) {
    await writeToDisk(filePath, format, xmlContent, svgContent, result);
  } else {
    result.message = `DMN diagram exported as ${format}`;
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export const TOOL_DEFINITION = {
  name: 'export_dmn',
  description:
    'Export a DMN diagram as XML, SVG, or both and write to a file. ' +
    'When format is "both" and filePath ends in .dmn, the SVG is written ' +
    'alongside with a .svg extension. Set returnContent to true to also ' +
    'include the raw XML/SVG in the response.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      format: {
        type: 'string',
        enum: ['xml', 'svg', 'both'],
        description: "Export format: 'xml', 'svg', or 'both'",
      },
      filePath: {
        type: 'string',
        description: 'File path to write the exported content to.',
      },
      returnContent: {
        type: 'boolean',
        description:
          'When true, include raw XML/SVG in the JSON response. ' +
          'Default false to keep the response compact.',
      },
    },
    required: ['diagramId', 'format', 'filePath'],
  },
} as const;
