/**
 * Handler for delete_dmn_element tool.
 *
 * Supports single and bulk DRD element deletion, and decision table
 * rule removal (when decisionId + ruleIndex are provided).
 */

import { type ToolResult } from '../../types';
import { elementNotFoundError, missingRequiredError } from '../../errors';
import {
  requireDiagram,
  requireElement,
  jsonResult,
  syncXml,
  buildElementCounts,
} from '../helpers';
import { handleRemoveRule } from '../decision-table/remove-rule';

export interface DeleteElementArgs {
  diagramId: string;
  elementId?: string;
  elementIds?: string[];
  decisionId?: string;
  ruleIndex?: number;
}

export async function handleDeleteElement(args: DeleteElementArgs): Promise<ToolResult> {
  const { diagramId, elementId, elementIds, decisionId, ruleIndex } = args;

  // Decision table rule deletion mode
  if (decisionId !== undefined && ruleIndex !== undefined) {
    return handleRemoveRule({ diagramId, decisionId, ruleIndex });
  }

  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');

  // Bulk deletion mode
  if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
    const elements: any[] = [];
    const notFound: string[] = [];
    for (const id of elementIds) {
      const el = elementRegistry.get(id);
      if (el) {
        elements.push(el);
      } else {
        notFound.push(id);
      }
    }

    if (elements.length === 0) {
      throw elementNotFoundError(elementIds.join(', '));
    }

    modeling.removeElements(elements);
    await syncXml(diagram);

    return jsonResult({
      success: true,
      deletedCount: elements.length,
      deletedIds: elements.map((el: any) => el.id),
      ...(notFound.length > 0
        ? { notFound, warning: `${notFound.length} element(s) not found` }
        : {}),
      diagramCounts: buildElementCounts(elementRegistry),
      message: `Removed ${elements.length} element(s) from diagram`,
    });
  }

  // Single element deletion
  if (!elementId) {
    throw missingRequiredError(['elementId']);
  }

  const element = requireElement(elementRegistry, elementId);
  modeling.removeElements([element]);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    elementId,
    diagramCounts: buildElementCounts(elementRegistry),
    message: `Removed element ${elementId} from diagram`,
  });
}

export const TOOL_DEFINITION = {
  name: 'delete_dmn_element',
  description:
    'Remove one or more elements from a DMN DRD, or remove a rule from a decision table. ' +
    'Supports single deletion via elementId, bulk deletion via elementIds, ' +
    'or decision table rule removal via decisionId + ruleIndex.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      elementId: {
        type: 'string',
        description: 'The ID of the element to remove (single mode)',
      },
      elementIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of element IDs to remove (bulk mode). Overrides elementId.',
      },
      decisionId: {
        type: 'string',
        description:
          'The Decision element ID (rule removal mode). Use with ruleIndex to remove a decision table rule.',
      },
      ruleIndex: {
        type: 'number',
        description:
          'Zero-based index of the rule to remove (rule removal mode). Use with decisionId.',
      },
    },
    required: ['diagramId'],
  },
} as const;
