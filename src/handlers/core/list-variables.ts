/**
 * Handler for list_dmn_variables tool.
 *
 * Scans all decisions and extracts input/output variable references from
 * decision tables, literal expressions, and information requirements.
 * Provides a unified view of all variables in the DMN model.
 */

import { type ToolResult } from '../../types';
import { requireDiagram, jsonResult, getVisibleElements, validateArgs } from '../helpers';

export interface ListVariablesArgs {
  diagramId: string;
}

interface VariableReference {
  name: string;
  type: 'input' | 'output';
  typeRef?: string;
  sourceElementId: string;
  sourceElementName: string;
  sourceType: string;
}

/** Extract variables from a decision table. */
function extractDecisionTableVars(
  decisionId: string,
  decisionName: string,
  table: any
): VariableReference[] {
  const vars: VariableReference[] = [];

  // Input columns
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

  // Output columns
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

/** Extract variables from a literal expression. */
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

export async function handleListVariables(args: ListVariablesArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId']);
  const { diagramId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const allElements = getVisibleElements(elementRegistry);

  const allVars: VariableReference[] = [];

  // Scan decisions for variables
  const decisions = allElements.filter((el: any) => el.type === 'dmn:Decision');
  for (const decision of decisions) {
    const bo = decision.businessObject;
    const name = bo.name || bo.id;
    const logic = bo.decisionLogic;

    if (!logic) continue;

    if (logic.$type === 'dmn:DecisionTable') {
      allVars.push(...extractDecisionTableVars(decision.id, name, logic));
    } else if (logic.$type === 'dmn:LiteralExpression') {
      allVars.push(...extractLiteralExpressionVars(decision.id, name, logic, bo));
    }
  }

  // Scan InputData elements for input variables
  const inputData = allElements.filter((el: any) => el.type === 'dmn:InputData');
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

  // Deduplicate by name+type, aggregating sources
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

  return jsonResult({
    success: true,
    variables,
    totalVariables: variables.length,
    inputVariables: inputCount,
    outputVariables: outputCount,
    message: `Found ${variables.length} variable(s): ${inputCount} input(s), ${outputCount} output(s)`,
  });
}

export const TOOL_DEFINITION = {
  name: 'list_dmn_variables',
  description:
    'List all input and output variables across all decisions in a DMN diagram. ' +
    'Scans decision tables, literal expressions, and input data elements to build ' +
    'a unified variable inventory with type information and source references.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
    },
    required: ['diagramId'],
  },
} as const;
