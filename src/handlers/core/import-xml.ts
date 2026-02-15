/**
 * Handler for import_dmn_xml tool.
 *
 * @deprecated Merged into create_dmn_diagram. This wrapper is kept for
 * backward compatibility only — the tool is no longer registered.
 */

import { type ToolResult, type HintLevel } from '../../types';
import { handleCreateDiagram } from './create-diagram';

export interface ImportXmlArgs {
  xml?: string;
  filePath?: string;
  hintLevel?: HintLevel;
}

/**
 * @deprecated Use handleCreateDiagram with xml/filePath params instead.
 */
export async function handleImportXml(args: ImportXmlArgs): Promise<ToolResult> {
  if (!args.xml && !args.filePath) {
    return {
      content: [{ type: 'text', text: 'Either xml or filePath must be provided.' }],
    };
  }
  return handleCreateDiagram(args);
}
