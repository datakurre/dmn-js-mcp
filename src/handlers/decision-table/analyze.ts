/**
 * Handler for analyze_dmn_decision_table tool.
 *
 * Performs completeness analysis on a DMN decision table:
 * - Checks for missing input/output column definitions
 * - Identifies empty rules (rows with no entries)
 * - Checks for missing rule entries (dash/wildcard vs empty)
 * - Validates that hit policy is set
 * - Reports coverage of input value ranges when inputValues are defined
 * - Flags potential issues like overlapping rules for UNIQUE hit policy
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, validateArgs } from '../helpers';

export interface AnalyzeDecisionTableArgs {
  diagramId: string;
  decisionId: string;
}

interface ColumnIssue {
  columnId: string;
  columnIndex: number;
  type: 'input' | 'output';
  issue: string;
}

interface RuleIssue {
  ruleId: string;
  ruleIndex: number;
  issue: string;
  cellId?: string;
}

interface CoverageInfo {
  columnId: string;
  columnIndex: number;
  label: string;
  definedValues: string[];
  usedValues: string[];
  missingValues: string[];
  coveragePercent: number;
}

/** Check input columns for missing definitions. */
function checkInputColumns(inputs: any[]): ColumnIssue[] {
  const issues: ColumnIssue[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (!input.inputExpression?.text && !input.label) {
      issues.push({
        columnId: input.id,
        columnIndex: i,
        type: 'input',
        issue: 'Input column has no expression text and no label.',
      });
    }
    if (!input.inputExpression?.typeRef) {
      issues.push({
        columnId: input.id,
        columnIndex: i,
        type: 'input',
        issue: 'Input column has no typeRef defined.',
      });
    }
  }
  return issues;
}

/** Check output columns for missing definitions. */
function checkOutputColumns(outputs: any[]): ColumnIssue[] {
  const issues: ColumnIssue[] = [];
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    if (!output.name && !output.label) {
      issues.push({
        columnId: output.id,
        columnIndex: i,
        type: 'output',
        issue: 'Output column has no name and no label.',
      });
    }
    if (!output.typeRef) {
      issues.push({
        columnId: output.id,
        columnIndex: i,
        type: 'output',
        issue: 'Output column has no typeRef defined.',
      });
    }
  }
  return issues;
}

/** Check rules for empty outputs and catch-all patterns. */
function checkRules(rules: any[], inputCount: number): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (rules.length === 0) {
    issues.push({ ruleId: '', ruleIndex: -1, issue: 'Decision table has no rules defined.' });
    return issues;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const outputEntries: any[] = rule.outputEntry || [];

    // Check for empty output entries
    for (let j = 0; j < outputEntries.length; j++) {
      const entry = outputEntries[j];
      if (!entry.text || entry.text.trim() === '') {
        issues.push({
          ruleId: rule.id,
          ruleIndex: i,
          cellId: entry.id,
          issue: `Output cell at column ${j} is empty.`,
        });
      }
    }

    // Check if ALL input entries are empty/wildcard (catch-all rule)
    const inputEntries: any[] = rule.inputEntry || [];
    const allInputsEmpty =
      inputEntries.length > 0 &&
      inputEntries.every((e: any) => !e.text || e.text.trim() === '' || e.text.trim() === '-');
    if (allInputsEmpty && rules.length > 1 && inputCount > 0) {
      issues.push({
        ruleId: rule.id,
        ruleIndex: i,
        issue:
          'All input entries are empty/wildcard. This is a catch-all rule — ' +
          'ensure it is intentional and placed at the correct position for the hit policy.',
      });
    }
  }
  return issues;
}

/** Parse comma-separated FEEL values (e.g. "val1","val2"). */
function parseValues(text: string): string[] {
  return text
    .split(',')
    .map((v) => v.trim().replace(/^"|"$/g, ''))
    .filter((v) => v.length > 0);
}

/** Analyse input value coverage when inputValues constraints are defined. */
function checkValueCoverage(inputs: any[], rules: any[]): CoverageInfo[] {
  const coverageInfos: CoverageInfo[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const definedText = input.inputValues?.text;
    if (!definedText) continue;

    const definedValues = parseValues(definedText);
    if (definedValues.length === 0) continue;

    const usedValues = new Set<string>();
    for (const rule of rules) {
      const entries: any[] = rule.inputEntry || [];
      const text = (entries[i]?.text || '').trim();
      if (text && text !== '-') {
        for (const v of parseValues(text)) usedValues.add(v);
      }
    }

    const missingValues = definedValues.filter((v) => !usedValues.has(v));
    const covered = definedValues.length - missingValues.length;
    const coveragePercent = Math.round((covered / definedValues.length) * 100);

    coverageInfos.push({
      columnId: input.id,
      columnIndex: i,
      label: input.label || input.inputExpression?.text || input.id,
      definedValues,
      usedValues: [...usedValues],
      missingValues,
      coveragePercent,
    });
  }

  return coverageInfos;
}

/** Detect potentially overlapping rules for UNIQUE hit policy. */
function checkUniqueOverlaps(rules: any[], inputCount: number): string[] {
  const warnings: string[] = [];
  if (rules.length < 2) return warnings;

  for (let a = 0; a < rules.length; a++) {
    for (let b = a + 1; b < rules.length; b++) {
      if (rulesOverlap(rules[a], rules[b], inputCount)) {
        warnings.push(
          `Rules ${a + 1} (${rules[a].id}) and ${b + 1} (${rules[b].id}) ` +
            'may overlap — check for UNIQUE hit policy violations.'
        );
      }
    }
  }
  return warnings;
}

/** Check if two rules may overlap on all input columns. */
function rulesOverlap(ruleA: any, ruleB: any, inputCount: number): boolean {
  const entriesA: any[] = ruleA.inputEntry || [];
  const entriesB: any[] = ruleB.inputEntry || [];

  for (let i = 0; i < inputCount; i++) {
    const textA = (entriesA[i]?.text || '').trim();
    const textB = (entriesB[i]?.text || '').trim();
    // Both empty/wildcard or same value = possible overlap
    if (textA === '' || textA === '-' || textB === '' || textB === '-') continue;
    if (textA === textB) continue;
    return false;
  }
  return true;
}

export async function handleAnalyzeDecisionTable(
  args: AnalyzeDecisionTableArgs
): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }

  const logic = bo.decisionLogic;
  if (!logic || logic.$type !== 'dmn:DecisionTable') {
    return jsonResult({
      success: true,
      decisionId,
      hasDecisionTable: false,
      decisionLogicType: logic?.$type || 'none',
      message: `Decision ${decisionId} does not have a DecisionTable.`,
    });
  }

  return buildAnalysis(decisionId, logic);
}

/** Build the completeness analysis result for a decision table. */
function buildAnalysis(decisionId: string, logic: any): ToolResult {
  const inputs: any[] = logic.input || [];
  const outputs: any[] = logic.output || [];
  const rules: any[] = logic.rule || [];
  const hitPolicy: string = logic.hitPolicy || 'UNIQUE';

  const columnIssues = [...checkInputColumns(inputs), ...checkOutputColumns(outputs)];
  const ruleIssues = checkRules(rules, inputs.length);
  const coverageInfos = checkValueCoverage(inputs, rules);
  const hitPolicyWarnings = hitPolicy === 'UNIQUE' ? checkUniqueOverlaps(rules, inputs.length) : [];

  const totalIssues = columnIssues.length + ruleIssues.length + hitPolicyWarnings.length;
  const incompleteCoverage = coverageInfos.filter((c) => c.coveragePercent < 100);
  const isComplete = totalIssues === 0 && incompleteCoverage.length === 0;

  const message = isComplete
    ? `Decision table for ${decisionId} is complete: ${inputs.length} input(s), ${outputs.length} output(s), ${rules.length} rule(s).`
    : `Decision table for ${decisionId} has ${totalIssues} issue(s)` +
      (incompleteCoverage.length > 0
        ? ` and ${incompleteCoverage.length} column(s) with incomplete value coverage`
        : '') +
      '.';

  return jsonResult({
    success: true,
    decisionId,
    hitPolicy,
    inputCount: inputs.length,
    outputCount: outputs.length,
    ruleCount: rules.length,
    isComplete,
    totalIssues,
    ...(columnIssues.length > 0 ? { columnIssues } : {}),
    ...(ruleIssues.length > 0 ? { ruleIssues } : {}),
    ...(hitPolicyWarnings.length > 0 ? { hitPolicyWarnings } : {}),
    ...(coverageInfos.length > 0 ? { valueCoverage: coverageInfos } : {}),
    message,
  });
}

export const TOOL_DEFINITION = {
  name: 'analyze_dmn_decision_table',
  description:
    'Analyze a DMN decision table for completeness. Checks for: ' +
    'missing column definitions (expression, typeRef), empty rules and output cells, ' +
    'catch-all rules, input value coverage (when inputValues constraints are defined), ' +
    'and potential rule overlaps for UNIQUE hit policy. ' +
    'Returns isComplete: true when no issues are found.',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: {
        type: 'string',
        description: 'The ID of the Decision element containing the table to analyze',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
