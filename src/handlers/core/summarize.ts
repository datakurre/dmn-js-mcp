/**
 * Handler for summarize_dmn_diagram tool.
 *
 * Returns a lightweight summary of a DMN diagram: decision names, element
 * counts by type, decision logic types, and connectivity stats.
 * Optionally includes structural validation issues and variable inventory.
 * Useful for AI callers to orient before making changes.
 */

import { type ToolResult } from '../../types';
import {
  requireDiagram,
  jsonResult,
  getVisibleElements,
  isConnectionElement,
  buildElementCounts,
  buildConnectivityWarnings,
  validateArgs,
} from '../helpers';

export interface SummarizeDiagramArgs {
  diagramId: string;
  includeValidation?: boolean;
  includeVariables?: boolean;
}

// ── Type constants to avoid string duplication ─────────────────────────────
const DMN_DECISION = 'dmn:Decision';
const DMN_DECISION_TABLE = 'dmn:DecisionTable';
const DMN_LITERAL_EXPRESSION = 'dmn:LiteralExpression';
const DMN_INPUT_DATA = 'dmn:InputData';

/** Classify a DRD element as disconnected (missing expected connections). */
function isDisconnected(el: any): boolean {
  const hasIncoming = el.incoming && el.incoming.length > 0;
  const hasOutgoing = el.outgoing && el.outgoing.length > 0;
  if (el.type === 'dmn:TextAnnotation') return false;
  // InputData typically only has outgoing
  if (el.type === DMN_INPUT_DATA) return !hasOutgoing;
  // Decisions should have incoming requirements (unless they are the only decision)
  if (el.type === DMN_DECISION) return !hasIncoming && !hasOutgoing;
  return !hasIncoming && !hasOutgoing;
}

// ── Validation (absorbed from the former validate handler) ─────────────────

interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  elementId?: string;
}

/** Check decision elements for missing or incomplete logic. */
function validateDecisions(elementRegistry: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const decisions = elementRegistry.filter((el: any) => el.type === DMN_DECISION);

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

    if (bo.decisionLogic.$type === DMN_DECISION_TABLE) {
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

    if (bo.decisionLogic.$type === DMN_LITERAL_EXPRESSION) {
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
      el.type === DMN_DECISION ||
      el.type === DMN_INPUT_DATA ||
      el.type === 'dmn:BusinessKnowledgeModel' ||
      el.type === 'dmn:KnowledgeSource'
  );

  for (const el of elements) {
    const hasIncoming = el.incoming && el.incoming.length > 0;
    const hasOutgoing = el.outgoing && el.outgoing.length > 0;

    if (el.type === DMN_INPUT_DATA && !hasOutgoing) {
      issues.push({
        severity: 'warning',
        message: `InputData "${el.businessObject?.name || el.id}" is not connected to any decision.`,
        elementId: el.id,
      });
    }

    if (el.type === DMN_DECISION && !hasIncoming && elements.length > 1) {
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

/** Build validation result. Exported for the resources module. */
export function buildValidation(elementRegistry: any): {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  isValid: boolean;
} {
  const issues: ValidationIssue[] = [
    ...validateDecisions(elementRegistry),
    ...validateConnectivity(elementRegistry),
  ];

  const connectivityWarnings = buildConnectivityWarnings(elementRegistry);
  for (const warning of connectivityWarnings) {
    issues.push({ severity: 'warning', message: warning });
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return { issues, errorCount, warningCount, isValid: errorCount === 0 };
}

// ── Variable extraction (absorbed from the former list-variables handler) ──

interface VariableReference {
  name: string;
  type: 'input' | 'output';
  typeRef?: string;
  sourceElementId: string;
  sourceElementName: string;
  sourceType: string;
}

function extractDecisionTableVars(
  decisionId: string,
  decisionName: string,
  table: any
): VariableReference[] {
  const vars: VariableReference[] = [];
  for (const input of table.input || []) {
    const expr = input.inputExpression;
    if (expr?.text) {
      vars.push({
        name: input.label || expr.text,
        type: 'input',
        typeRef: expr.typeRef || undefined,
        sourceElementId: decisionId,
        sourceElementName: decisionName,
        sourceType: 'decisionTable',
      });
    }
  }
  for (const output of table.output || []) {
    vars.push({
      name: output.name || output.label || output.id,
      type: 'output',
      typeRef: output.typeRef || undefined,
      sourceElementId: decisionId,
      sourceElementName: decisionName,
      sourceType: 'decisionTable',
    });
  }
  return vars;
}

function extractLiteralExpressionVars(
  decisionId: string,
  decisionName: string,
  expr: any,
  bo: any
): VariableReference[] {
  const vars: VariableReference[] = [];
  if (expr.text) {
    vars.push({
      name: bo.variable?.name || decisionName,
      type: 'output',
      typeRef: bo.variable?.typeRef || expr.typeRef || undefined,
      sourceElementId: decisionId,
      sourceElementName: decisionName,
      sourceType: 'literalExpression',
    });
  }
  return vars;
}

/** Build variables result. Exported for the resources module. */
export function buildVariables(allElements: any[]): {
  variables: any[];
  totalVariables: number;
  inputVariables: number;
  outputVariables: number;
} {
  const allVars: VariableReference[] = [];

  const decisions = allElements.filter((el: any) => el.type === DMN_DECISION);
  for (const decision of decisions) {
    const bo = decision.businessObject;
    const name = bo.name || bo.id;
    const logic = bo.decisionLogic;
    if (!logic) continue;
    if (logic.$type === DMN_DECISION_TABLE) {
      allVars.push(...extractDecisionTableVars(decision.id, name, logic));
    } else if (logic.$type === DMN_LITERAL_EXPRESSION) {
      allVars.push(...extractLiteralExpressionVars(decision.id, name, logic, bo));
    }
  }

  const inputData = allElements.filter((el: any) => el.type === DMN_INPUT_DATA);
  for (const input of inputData) {
    const bo = input.businessObject;
    allVars.push({
      name: bo.name || bo.id,
      type: 'input',
      typeRef: bo.variable?.typeRef || undefined,
      sourceElementId: input.id,
      sourceElementName: bo.name || bo.id,
      sourceType: 'inputData',
    });
  }

  const varMap = new Map<string, { refs: VariableReference[]; typeRef?: string }>();
  for (const v of allVars) {
    const key = `${v.name}::${v.type}`;
    if (!varMap.has(key)) {
      varMap.set(key, { refs: [], typeRef: v.typeRef });
    }
    varMap.get(key)!.refs.push(v);
  }

  const variables = Array.from(varMap.entries())
    .map(([, { refs, typeRef }]) => ({
      name: refs[0].name,
      type: refs[0].type,
      typeRef,
      sources: refs.map((r) => ({
        elementId: r.sourceElementId,
        elementName: r.sourceElementName,
        sourceType: r.sourceType,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const inputCount = variables.filter((v) => v.type === 'input').length;
  const outputCount = variables.filter((v) => v.type === 'output').length;

  return {
    variables,
    totalVariables: variables.length,
    inputVariables: inputCount,
    outputVariables: outputCount,
  };
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function handleSummarizeDiagram(args: SummarizeDiagramArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId, includeValidation = true, includeVariables = false } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const allElements = getVisibleElements(elementRegistry);

  // Element counts
  const elementCounts = buildElementCounts(elementRegistry);

  // Decision info
  const decisions = allElements.filter((el: any) => el.type === DMN_DECISION);
  const decisionInfo = decisions.map((d: any) => {
    const bo = d.businessObject;
    const logic = bo.decisionLogic;
    return {
      id: d.id,
      name: bo.name || '(unnamed)',
      decisionLogicType: logic?.$type || 'none',
    };
  });

  // Connections
  const connections = allElements.filter((el: any) => isConnectionElement(el.type));

  // Non-connection elements
  const nodeElements = allElements.filter((el: any) => !isConnectionElement(el.type));

  // Disconnected elements
  const disconnected = nodeElements.filter(isDisconnected);

  // Named elements
  const namedElements = nodeElements
    .filter((el: any) => el.businessObject?.name)
    .map((el: any) => ({
      id: el.id,
      type: el.type,
      name: el.businessObject.name,
    }));

  const result: Record<string, any> = {
    success: true,
    diagramName: diagram.name || '(unnamed)',
    hintLevel: diagram.hintLevel ?? 'full',
    decisions: decisionInfo,
    elementCounts,
    totalElements: allElements.length,
    nodeCount: nodeElements.length,
    connectionCount: connections.length,
    disconnectedCount: disconnected.length,
    namedElements,
    ...(disconnected.length > 0
      ? {
          disconnectedElements: disconnected.map((el: any) => ({
            id: el.id,
            type: el.type,
            name: el.businessObject?.name || '(unnamed)',
          })),
        }
      : {}),
  };

  // Optional validation
  if (includeValidation) {
    const validation = buildValidation(elementRegistry);
    result.validation = {
      issues: validation.issues,
      errorCount: validation.errorCount,
      warningCount: validation.warningCount,
      isValid: validation.isValid,
    };
  }

  // Optional variables
  if (includeVariables) {
    const vars = buildVariables(allElements);
    result.variables = vars.variables;
    result.totalVariables = vars.totalVariables;
    result.inputVariables = vars.inputVariables;
    result.outputVariables = vars.outputVariables;
  }

  return jsonResult(result);
}

export const TOOL_DEFINITION = {
  name: 'summarize_dmn_diagram',
  description:
    'Get a lightweight summary of a DMN diagram: decision names and logic types, element ' +
    'counts by type, named elements, and connectivity stats. Useful for orienting ' +
    'before making changes. Includes structural validation by default (set includeValidation=false to skip). ' +
    'Set includeVariables=true to also list all input/output variables.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      includeValidation: {
        type: 'boolean',
        description:
          'Include structural validation issues (disconnected elements, missing logic, empty tables). Default: true.',
      },
      includeVariables: {
        type: 'boolean',
        description:
          'Include input/output variable inventory from all decisions and input data elements. Default: false.',
      },
    },
    required: ['diagramId'],
  },
} as const;
