/**
 * Handler for create_dmn_diagram tool.
 */

import { type ToolResult, type HintLevel } from '../../types';
import { storeDiagram, generateDiagramId, createModeler } from '../../diagram-manager';
import { jsonResult } from '../helpers';

export interface CreateDiagramArgs {
  name?: string;
  hintLevel?: HintLevel;
}

export async function handleCreateDiagram(args: CreateDiagramArgs): Promise<ToolResult> {
  const diagramId = generateDiagramId();
  const modeler = await createModeler();

  // If a name was provided, update the definitions name
  if (args.name) {
    const viewer = modeler.getActiveViewer();
    if (viewer) {
      const elementRegistry = viewer.get('elementRegistry');
      const modeling = viewer.get('modeling');
      const decision = elementRegistry.get('Decision_1');
      if (decision) {
        modeling.updateProperties(decision, { name: args.name });
      }
    }
  }

  const { xml } = await modeler.saveXML({ format: true });
  const hintLevel: HintLevel | undefined = args.hintLevel;

  storeDiagram(diagramId, {
    modeler,
    xml: xml || '',
    name: args.name,
    hintLevel,
  });

  return jsonResult({
    success: true,
    diagramId,
    name: args.name || undefined,
    hintLevel: hintLevel ?? 'full',
    message: `Created new DMN diagram with ID: ${diagramId}`,
    nextSteps: [
      {
        tool: 'add_dmn_element',
        description: 'Add DRD elements (decisions, inputs, knowledge models) to build the diagram.',
      },
      {
        tool: 'import_dmn_xml',
        description: 'Or import an existing DMN XML file instead of building from scratch.',
      },
    ],
  });
}

export const TOOL_DEFINITION = {
  name: 'create_dmn_diagram',
  description:
    'Create a new DMN diagram. Returns a diagram ID for use with other tools. ' +
    'The diagram starts with a single Decision element containing an empty DecisionTable.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Optional name for the first decision element',
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
