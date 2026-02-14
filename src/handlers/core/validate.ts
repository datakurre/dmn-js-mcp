/**
 * Handler for validate_dmn_diagram tool.
 *
 * Performs structural validation of the DMN diagram:
 * - Checks for disconnected elements
 * - Validates decision tables have at least one input and output
 * - Checks for empty decision logic
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  jsonResult,
  validateArgs,
  getVisibleElements,
  buildConnectivityWarnings,
} from '../helpers';

export interface ValidateArgs {
  diagramId: string;
}

interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  elementId?: string;
}

/** Check decision elements for missing or incomplete logic. */
function validateDecisions(elementRegistry: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const decisions = elementRegistry.filter((el: any) => el.type === 'dmn:Decision');

  for (const decision of decisions) {
    const bo = decision.businessObject;
    if (!bo.decisionLogic) {
      issues.push({
        severity: 'warning',
        message: `Decision "${bo.name || bo.id}" has no decision logic (no table or expression).`,
        elementId: bo.id,
      });
      continue;
    }

    if (bo.decisionLogic.$type === 'dmn:DecisionTable') {
      const table = bo.decisionLogic;
      if (!table.input || table.input.length === 0) {
        issues.push({
          severity: 'warning',
          message: `Decision table on "${bo.name || bo.id}" has no input columns.`,
          elementId: bo.id,
        });
      }
      if (!table.output || table.output.length === 0) {
        issues.push({
          severity: 'error',
          message: `Decision table on "${bo.name || bo.id}" has no output columns.`,
          elementId: bo.id,
        });
      }
    }

    if (bo.decisionLogic.$type === 'dmn:LiteralExpression') {
      if (!bo.decisionLogic.text) {
        issues.push({
          severity: 'warning',
          message: `Literal expression on "${bo.name || bo.id}" is empty.`,
          elementId: bo.id,
        });
      }
    }
  }

  return issues;
}

/** Check for disconnected DRD elements. */
function validateConnectivity(elementRegistry: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elements = elementRegistry.filter(
    (el: any) =>
      el.type === 'dmn:Decision' ||
      el.type === 'dmn:InputData' ||
      el.type === 'dmn:BusinessKnowledgeModel' ||
      el.type === 'dmn:KnowledgeSource'
  );

  for (const el of elements) {
    const hasIncoming = el.incoming && el.incoming.length > 0;
    const hasOutgoing = el.outgoing && el.outgoing.length > 0;

    // InputData typically only has outgoing connections
    if (el.type === 'dmn:InputData' && !hasOutgoing) {
      issues.push({
        severity: 'warning',
        message: `InputData "${el.businessObject?.name || el.id}" is not connected to any decision.`,
        elementId: el.id,
      });
    }

    // Decisions without any incoming requirements (except the root decision)
    if (el.type === 'dmn:Decision' && !hasIncoming && elements.length > 1) {
      // Only warn if there are other elements that could be connected
      const otherElements = elements.filter((e: any) => e.id !== el.id);
      if (otherElements.length > 0) {
        issues.push({
          severity: 'warning',
          message: `Decision "${el.businessObject?.name || el.id}" has no incoming requirements.`,
          elementId: el.id,
        });
      }
    }
  }

  return issues;
}

export async function handleValidate(args: ValidateArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const elements = getVisibleElements(elementRegistry);

  const issues: ValidationIssue[] = [
    ...validateDecisions(elementRegistry),
    ...validateConnectivity(elementRegistry),
  ];

  const connectivityWarnings = buildConnectivityWarnings(elementRegistry);
  for (const warning of connectivityWarnings) {
    issues.push({ severity: 'warning', message: warning });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return jsonResult({
    success: true,
    diagramId,
    elementCount: elements.length,
    issues,
    errorCount: errors.length,
    warningCount: warnings.length,
    isValid: errors.length === 0,
    message:
      errors.length === 0 && warnings.length === 0
        ? 'DMN diagram is valid with no issues.'
        : `Found ${errors.length} error(s) and ${warnings.length} warning(s).`,
  });
}

export const TOOL_DEFINITION = {
  name: 'validate_dmn_diagram',
  description:
    'Validate a DMN diagram for structural issues: disconnected elements, ' +
    'missing decision logic, empty decision tables, and more.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
    },
    required: ['diagramId'],
  },
} as const;
