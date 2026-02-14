/**
 * Handler for export_dmn tool (XML and SVG).
 */

import { type ToolResult } from '../../types';
import { exportFailedError } from '../../errors';
import { requireDiagram, validateArgs } from '../helpers';
import * as fs from 'node:fs/promises';

export interface ExportDmnArgs {
  diagramId: string;
  format: 'xml' | 'svg' | 'both';
  filePath?: string;
}

export async function handleExportDmn(args: ExportDmnArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'format']);
  const { diagramId, format, filePath } = args;
  const diagram = requireDiagram(diagramId);

  const result: Record<string, any> = { success: true, diagramId, format };

  if (format === 'xml' || format === 'both') {
    const { xml } = await diagram.modeler.saveXML({ format: true });
    if (!xml) throw exportFailedError('saveXML returned empty result');
    result.xml = xml;

    if (filePath && format === 'xml') {
      await fs.writeFile(filePath, xml, 'utf-8');
      result.filePath = filePath;
      result.message = `DMN XML exported to ${filePath}`;
    }
  }

  if (format === 'svg' || format === 'both') {
    try {
      const { svg } = await diagram.modeler.saveSVG();
      result.svg = svg || '';
    } catch {
      result.svg = '';
      result.svgWarning = 'SVG export failed — headless SVG rendering is limited.';
    }
  }

  if (filePath && format === 'both') {
    const xml = result.xml;
    await fs.writeFile(filePath, xml, 'utf-8');
    result.filePath = filePath;
    const svgPath = filePath.replace(/\.dmn$/, '.svg');
    if (result.svg) {
      await fs.writeFile(svgPath, result.svg, 'utf-8');
      result.svgFilePath = svgPath;
    }
    result.message = `DMN exported to ${filePath}`;
  }

  if (!result.message) {
    result.message = `DMN diagram exported as ${format}`;
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export const TOOL_DEFINITION = {
  name: 'export_dmn',
  description:
    'Export a DMN diagram as XML, SVG, or both. ' +
    'Optionally write the result to a file. When format is "both" and filePath ends in .dmn, ' +
    'the SVG is written alongside with a .svg extension.',
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
        description: 'Optional file path to write the exported content to.',
      },
    },
    required: ['diagramId', 'format'],
  },
} as const;
