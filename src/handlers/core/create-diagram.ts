/**
 * Handler for create_dmn_diagram tool.
 *
 * Unified entry point: creates a blank diagram or imports existing DMN XML.
 * When `xml` or `filePath` is provided, imports the XML; otherwise creates
 * a blank diagram with a single Decision element and empty DecisionTable.
 */

import { type ToolResult, type HintLevel } from '../../types';
import {
  storeDiagram,
  generateDiagramId,
  createModeler,
  createModelerFromXml,
} from '../../diagram-manager';
import { jsonResult, syncXml } from '../helpers';
import * as fs from 'node:fs';

export interface CreateDiagramArgs {
  name?: string;
  xml?: string;
  filePath?: string;
  hintLevel?: HintLevel;
}

/** Resolve the XML source (file / inline / blank) and create a modeler. */
async function resolveModeler(
  args: CreateDiagramArgs
): Promise<{ modeler: any; sourceFile?: string } | ToolResult> {
  if (args.filePath) {
    if (!fs.existsSync(args.filePath)) {
      return { content: [{ type: 'text', text: `File not found: ${args.filePath}` }] };
    }
    const xml = fs.readFileSync(args.filePath, 'utf-8');
    return { modeler: await createModelerFromXml(xml), sourceFile: args.filePath };
  }
  if (args.xml) {
    return { modeler: await createModelerFromXml(args.xml) };
  }
  return { modeler: await createBlankModeler(args.name) };
}

/** Create a blank modeler, optionally renaming the initial Decision. */
async function createBlankModeler(name?: string): Promise<any> {
  const modeler = await createModeler();
  if (!name) return modeler;
  const viewer = modeler.getActiveViewer();
  if (!viewer) return modeler;
  const elementRegistry = viewer.get('elementRegistry');
  const decision = elementRegistry.get('Decision_1');
  if (decision) viewer.get('modeling').updateProperties(decision, { name });
  return modeler;
}

/** Check whether a result is a ToolResult (early return / error). */
function isToolResult(v: any): v is ToolResult {
  return 'content' in v;
}

export async function handleCreateDiagram(args: CreateDiagramArgs): Promise<ToolResult> {
  const resolved = await resolveModeler(args);
  if (isToolResult(resolved)) return resolved;

  const { modeler, sourceFile } = resolved;
  const hintLevel: HintLevel | undefined = args.hintLevel;
  const diagramId = generateDiagramId();
  const isImport = !!(args.filePath || args.xml);

  const { xml: savedXml } = await modeler.saveXML({ format: true });

  const diagram = {
    modeler,
    xml: savedXml || '',
    name: args.name,
    hintLevel,
  };

  storeDiagram(diagramId, diagram);
  if (isImport) await syncXml(diagram);

  return jsonResult({
    success: true,
    diagramId,
    ...(args.name ? { name: args.name } : {}),
    ...(sourceFile ? { sourceFile } : {}),
    hintLevel: hintLevel ?? 'full',
    message: sourceFile
      ? `Imported DMN diagram with ID: ${diagramId} from ${sourceFile}`
      : args.xml
        ? `Imported DMN diagram with ID: ${diagramId}`
        : `Created new DMN diagram with ID: ${diagramId}`,
    nextSteps: isImport
      ? [
          {
            tool: 'list_dmn_elements',
            description: 'List all elements in the imported diagram to understand its structure.',
          },
          {
            tool: 'get_dmn_decision_logic',
            description: 'Inspect the decision logic of a decision element.',
          },
        ]
      : [
          {
            tool: 'add_dmn_element',
            description:
              'Add DRD elements (decisions, inputs, knowledge models) to build the diagram.',
          },
        ],
  });
}

export const TOOL_DEFINITION = {
  name: 'create_dmn_diagram',
  description:
    'Create a new DMN diagram or import an existing one. Returns a diagram ID for use with other tools. ' +
    'When xml or filePath is provided, imports the DMN XML. ' +
    'When neither is provided, creates a blank diagram with a single Decision element containing an empty DecisionTable.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Optional name for the first decision element',
      },
      xml: {
        type: 'string',
        description: 'DMN XML to import. When provided, creates a diagram from this XML.',
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
          "Controls implicit feedback verbosity. 'full' (default) includes " +
          "all hints. 'minimal' includes only errors. 'none' suppresses all feedback.",
      },
    },
  },
} as const;
