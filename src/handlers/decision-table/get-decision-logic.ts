/**
 * Handler for get_dmn_decision_logic tool.
 *
 * Returns the decision logic for a Decision element — whichever type is
 * present: DecisionTable structure, LiteralExpression text, or nothing.
 * Callers no longer need to guess the logic type before querying.
 *
 * Optionally runs completeness analysis when `analyze: true` is set.
 */

import { type ToolResult } from '../../types';
import { typeMismatchError } from '../../errors';
import { requireDiagram, requireElement, jsonResult, validateArgs } from '../helpers';

export interface GetDecisionLogicArgs {
  diagramId: string;
  decisionId: string;
  analyze?: boolean;
}

// ── Serialization helpers ──────────────────────────────────────────────────

/** Serialize an input column. */
function serializeInput(input: any, index: number): Record<string, any> {
  return {
    id: input.id,
    index,
    label: input.label || undefined,
    inputExpression: input.inputExpression
      ? {
          id: input.inputExpression.id,
          typeRef: input.inputExpression.typeRef || undefined,
          text: input.inputExpression.text || '',
        }
      : undefined,
    inputValues: input.inputValues?.text || undefined,
  };
}

/** Serialize an output column. */
function serializeOutput(output: any, index: number): Record<string, any> {
  return {
    id: output.id,
    index,
    label: output.label || undefined,
    name: output.name || undefined,
    typeRef: output.typeRef || undefined,
    outputValues: output.outputValues?.text || undefined,
  };
}

/** Serialize a rule (row). */
function serializeRule(rule: any, index: number): Record<string, any> {
  return {
    id: rule.id,
    index,
    description: rule.description || undefined,
    inputEntries: (rule.inputEntry || []).map((entry: any) => ({
      id: entry.id,
      text: entry.text || '',
    })),
    outputEntries: (rule.outputEntry || []).map((entry: any) => ({
      id: entry.id,
      text: entry.text || '',
    })),
  };
}

// ── Analysis helpers (from the former analyze handler) ─────────────────────

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

function checkRules(rules: any[], inputCount: number): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (rules.length === 0) {
    issues.push({ ruleId: '', ruleIndex: -1, issue: 'Decision table has no rules defined.' });
    return issues;
  }
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const outputEntries: any[] = rule.outputEntry || [];
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

function parseValues(text: string): string[] {
  return text
    .split(',')
    .map((v) => v.trim().replace(/^"|"$/g, ''))
    .filter((v) => v.length > 0);
}

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

function rulesOverlap(ruleA: any, ruleB: any, inputCount: number): boolean {
  const entriesA: any[] = ruleA.inputEntry || [];
  const entriesB: any[] = ruleB.inputEntry || [];
  for (let i = 0; i < inputCount; i++) {
    const textA = (entriesA[i]?.text || '').trim();
    const textB = (entriesB[i]?.text || '').trim();
    if (textA === '' || textA === '-' || textB === '' || textB === '-') continue;
    if (textA === textB) continue;
    return false;
  }
  return true;
}

/** Build the completeness analysis for a decision table. */
function buildAnalysis(logic: any): Record<string, any> {
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

  return {
    isComplete,
    totalIssues,
    ...(columnIssues.length > 0 ? { columnIssues } : {}),
    ...(ruleIssues.length > 0 ? { ruleIssues } : {}),
    ...(hitPolicyWarnings.length > 0 ? { hitPolicyWarnings } : {}),
    ...(coverageInfos.length > 0 ? { valueCoverage: coverageInfos } : {}),
  };
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function handleGetDecisionLogic(args: GetDecisionLogicArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, analyze } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }

  const logic = bo.decisionLogic;

  // No decision logic at all
  if (!logic) {
    return jsonResult({
      success: true,
      decisionId,
      hasDecisionLogic: false,
      decisionLogicType: 'none',
      message: `Decision ${decisionId} has no decision logic set.`,
    });
  }

  // DecisionTable
  if (logic.$type === 'dmn:DecisionTable') {
    const inputs = (logic.input || []).map(serializeInput);
    const outputs = (logic.output || []).map(serializeOutput);
    const rules = (logic.rule || []).map(serializeRule);

    const result: Record<string, any> = {
      success: true,
      decisionId,
      hasDecisionLogic: true,
      decisionLogicType: 'dmn:DecisionTable',
      hasDecisionTable: true,
      hitPolicy: logic.hitPolicy || 'UNIQUE',
      aggregation: logic.aggregation || undefined,
      inputs,
      outputs,
      rules,
      message: `Decision table for ${decisionId}: ${inputs.length} input(s), ${outputs.length} output(s), ${rules.length} rule(s)`,
    };

    // Optional analysis
    if (analyze) {
      result.analysis = buildAnalysis(logic);
    }

    return jsonResult(result);
  }

  // LiteralExpression
  if (logic.$type === 'dmn:LiteralExpression') {
    return jsonResult({
      success: true,
      decisionId,
      hasDecisionLogic: true,
      decisionLogicType: 'dmn:LiteralExpression',
      hasLiteralExpression: true,
      text: logic.text || '',
      expressionLanguage: logic.expressionLanguage || 'feel',
      typeRef: logic.typeRef || undefined,
      message: `Literal expression on ${decisionId}: "${logic.text || ''}"`,
    });
  }

  // Other / unknown logic type
  return jsonResult({
    success: true,
    decisionId,
    hasDecisionLogic: true,
    decisionLogicType: logic.$type,
    message: `Decision ${decisionId} uses ${logic.$type}.`,
  });
}

export const TOOL_DEFINITION = {
  name: 'get_dmn_decision_logic',
  description:
    'Get the decision logic of a Decision element. Returns the full structure ' +
    'for whichever logic type is present: DecisionTable (hit policy, inputs, outputs, rules), ' +
    'LiteralExpression (FEEL text, type), or indicates no logic is set. ' +
    'Use analyze=true to include completeness analysis for decision tables ' +
    '(missing definitions, empty cells, value coverage, rule overlaps).',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: {
        type: 'string',
        description: 'The ID of the Decision element',
      },
      analyze: {
        type: 'boolean',
        description:
          'When true, include completeness analysis for decision tables ' +
          '(column issues, rule issues, value coverage, overlap warnings). Default: false.',
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
