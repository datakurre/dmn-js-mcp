/**
 * Handler for import_dmn_xml tool.
 */

import { type ToolResult, type HintLevel } from '../../types';
import { storeDiagram, generateDiagramId, createModelerFromXml } from '../../diagram-manager';
import { jsonResult, syncXml } from '../helpers';
import * as fs from 'node:fs';

export interface ImportXmlArgs {
  xml?: string;
  filePath?: string;
  hintLevel?: HintLevel;
}

export async function handleImportXml(args: ImportXmlArgs): Promise<ToolResult> {
  const { filePath } = args;

  // Resolve XML content from either args.xml or args.filePath
  let xml: string;
  if (filePath) {
    if (!fs.existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `File not found: ${filePath}` }],
      };
    }
    xml = fs.readFileSync(filePath, 'utf-8');
  } else if (args.xml) {
    xml = args.xml;
  } else {
    return {
      content: [{ type: 'text', text: 'Either xml or filePath must be provided.' }],
    };
  }

  const diagramId = generateDiagramId();
  const modeler = await createModelerFromXml(xml);
  const hintLevel: HintLevel | undefined = args.hintLevel;

  const diagram = {
    modeler,
    xml,
    hintLevel,
  };

  await syncXml(diagram);
  storeDiagram(diagramId, diagram);

  return jsonResult({
    success: true,
    diagramId,
    ...(filePath ? { sourceFile: filePath } : {}),
    message: `Imported DMN diagram with ID: ${diagramId}${filePath ? ` from ${filePath}` : ''}`,
    nextSteps: [
      {
        tool: 'list_dmn_elements',
        description: 'List all elements in the imported diagram to understand its structure.',
      },
      {
        tool: 'get_dmn_decision_logic',
        description: 'Inspect the decision logic of a decision element.',
      },
    ],
  });
}

export const TOOL_DEFINITION = {
  name: 'import_dmn_xml',
  description:
    'Import an existing DMN XML diagram. Provide either xml (inline content) or filePath (read from disk). ' +
    'Combine with export_dmn filePath to implement an open→edit→save workflow.',
  inputSchema: {
    type: 'object',
    properties: {
      xml: {
        type: 'string',
        description: 'The DMN XML to import. Required unless filePath is provided.',
      },
      filePath: {
        type: 'string',
        description:
          'Path to a .dmn file to read and import. When provided, xml parameter is ignored.',
      },
      hintLevel: {
        type: 'string',
        enum: ['none', 'minimal', 'full'],
        description:
          "Controls implicit feedback verbosity. 'full' (default) includes all hints. " +
          "'minimal' includes only errors. 'none' suppresses all feedback.",
      },
    },
  },
} as const;
