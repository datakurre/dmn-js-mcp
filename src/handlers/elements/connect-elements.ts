/**
 * Handler for connect_dmn_elements tool.
 *
 * Connects two DRD elements with the appropriate requirement type.
 * Auto-detects the connection type based on source/target element types.
 *
 * Connection types:
 * - InformationRequirement: InputData/Decision → Decision
 * - KnowledgeRequirement: BKM → Decision/BKM
 * - AuthorityRequirement: KnowledgeSource → Decision/BKM/KnowledgeSource
 * - Association: any ↔ TextAnnotation
 */

import { type ToolResult } from '../../types';
import { semanticViolationError, elementNotFoundError } from '../../errors';
import { requireDiagram, jsonResult, syncXml, validateArgs, buildElementCounts } from '../helpers';

export interface ConnectArgs {
  diagramId: string;
  sourceElementId: string;
  targetElementId: string;
  connectionType?: string;
}

/** Auto-detect the appropriate DMN connection type. */
function resolveConnectionType(
  sourceType: string,
  targetType: string,
  requested?: string
): { connectionType: string; autoHint?: string } {
  // TextAnnotation → Association
  if (sourceType === 'dmn:TextAnnotation' || targetType === 'dmn:TextAnnotation') {
    return {
      connectionType: 'dmn:Association',
      ...(requested && requested !== 'dmn:Association'
        ? { autoHint: 'Auto-corrected to dmn:Association (TextAnnotation involved).' }
        : {}),
    };
  }

  if (requested) return { connectionType: requested };

  // InputData/Decision → Decision = InformationRequirement
  if (
    (sourceType === 'dmn:InputData' || sourceType === 'dmn:Decision') &&
    targetType === 'dmn:Decision'
  ) {
    return { connectionType: 'dmn:InformationRequirement' };
  }

  // BKM → Decision/BKM = KnowledgeRequirement
  if (
    sourceType === 'dmn:BusinessKnowledgeModel' &&
    (targetType === 'dmn:Decision' || targetType === 'dmn:BusinessKnowledgeModel')
  ) {
    return { connectionType: 'dmn:KnowledgeRequirement' };
  }

  // KnowledgeSource → anything = AuthorityRequirement
  if (sourceType === 'dmn:KnowledgeSource') {
    return { connectionType: 'dmn:AuthorityRequirement' };
  }

  // Fallback
  return { connectionType: 'dmn:InformationRequirement' };
}

export async function handleConnect(args: ConnectArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'sourceElementId', 'targetElementId']);
  const { diagramId, sourceElementId, targetElementId } = args;

  const diagram = requireDiagram(diagramId);
  const viewer = diagram.modeler.getActiveViewer();
  const modeling = viewer.get('modeling');
  const elementRegistry = viewer.get('elementRegistry');

  const source = elementRegistry.get(sourceElementId);
  if (!source) throw elementNotFoundError(sourceElementId);

  const target = elementRegistry.get(targetElementId);
  if (!target) throw elementNotFoundError(targetElementId);

  const sourceType = source.type || source.businessObject?.$type || '';
  const targetType = target.type || target.businessObject?.$type || '';

  const { connectionType, autoHint } = resolveConnectionType(
    sourceType,
    targetType,
    args.connectionType
  );

  // Validate the connection makes semantic sense
  if (sourceElementId === targetElementId) {
    throw semanticViolationError('Cannot connect an element to itself.');
  }

  const connection = modeling.connect(source, target, { type: connectionType });

  await syncXml(diagram);

  return jsonResult({
    success: true,
    connectionId: connection.id,
    connectionType,
    sourceElementId,
    targetElementId,
    ...(autoHint ? { autoHint } : {}),
    diagramCounts: buildElementCounts(elementRegistry),
    message: `Connected ${sourceElementId} → ${targetElementId} via ${connectionType}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'connect_dmn_elements',
  description:
    'Connect two DRD elements with a requirement or association. ' +
    'The connection type is auto-detected based on element types: ' +
    'InformationRequirement (InputData/Decision → Decision), ' +
    'KnowledgeRequirement (BKM → Decision/BKM), ' +
    'AuthorityRequirement (KnowledgeSource → any), ' +
    'Association (any ↔ TextAnnotation). ' +
    'You can override with connectionType if needed.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      sourceElementId: { type: 'string', description: 'ID of the source element' },
      targetElementId: { type: 'string', description: 'ID of the target element' },
      connectionType: {
        type: 'string',
        enum: [
          'dmn:InformationRequirement',
          'dmn:KnowledgeRequirement',
          'dmn:AuthorityRequirement',
          'dmn:Association',
        ],
        description: 'Override auto-detected connection type.',
      },
    },
    required: ['diagramId', 'sourceElementId', 'targetElementId'],
  },
} as const;
