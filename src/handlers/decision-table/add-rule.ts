/**
 * Handler for add_dmn_rule tool.
 *
 * Adds a new rule (row) to a decision table, optionally pre-filling
 * input and output entries. When `columns` is provided and the table
 * has no columns yet, columns are auto-created before the rule is added.
 */

import { type ToolResult } from '../../types';
import { requireDiagram, requireElement, jsonResult, syncXml, validateArgs } from '../helpers';
import { requireDecisionTable } from './helpers';

/** Inline column definition for auto-creation. */
interface ColumnDef {
  columnType: 'input' | 'output';
  label?: string;
  expressionText?: string;
  typeRef?: string;
  allowedValues?: string;
  name?: string;
}

/** Column creation result. */
interface CreatedColumn {
  columnType: string;
  columnId: string;
  label?: string;
}

export interface AddRuleArgs {
  diagramId: string;
  decisionId: string;
  inputEntries?: string[];
  outputEntries?: string[];
  description?: string;
  columns?: ColumnDef[];
}

// ── Column auto-creation helpers ───────────────────────────────────────────

function createInputColumn(moddle: any, logic: any, col: ColumnDef): CreatedColumn {
  const inputExpression = moddle.create('dmn:LiteralExpression', {
    typeRef: col.typeRef || 'string',
    text: col.expressionText || '',
  });
  const inputClause = moddle.create('dmn:InputClause', {
    label: col.label || undefined,
    inputExpression,
  });
  inputExpression.$parent = inputClause;
  if (col.allowedValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: col.allowedValues });
    unaryTests.$parent = inputClause;
    inputClause.inputValues = unaryTests;
  }
  if (!logic.input) logic.input = [];
  inputClause.$parent = logic;
  logic.input.push(inputClause);
  return { columnType: 'input', columnId: inputClause.id, label: col.label };
}

function createOutputColumn(moddle: any, logic: any, col: ColumnDef): CreatedColumn {
  const outputClause = moddle.create('dmn:OutputClause', {
    label: col.label || undefined,
    name: col.name || undefined,
    typeRef: col.typeRef || 'string',
  });
  if (col.allowedValues) {
    const unaryTests = moddle.create('dmn:UnaryTests', { text: col.allowedValues });
    unaryTests.$parent = outputClause;
    outputClause.outputValues = unaryTests;
  }
  if (!logic.output) logic.output = [];
  outputClause.$parent = logic;
  logic.output.push(outputClause);
  return { columnType: 'output', columnId: outputClause.id, label: col.label };
}

function autoCreateColumns(moddle: any, logic: any, columns: ColumnDef[]): CreatedColumn[] {
  const created: CreatedColumn[] = [];
  for (const col of columns) {
    if (col.columnType === 'input') {
      created.push(createInputColumn(moddle, logic, col));
    } else if (col.columnType === 'output') {
      created.push(createOutputColumn(moddle, logic, col));
    }
  }
  return created;
}

function createRuleEntries(
  moddle: any,
  rule: any,
  inputCount: number,
  outputCount: number,
  inputEntries?: string[],
  outputEntries?: string[]
): void {
  rule.inputEntry = [];
  for (let i = 0; i < inputCount; i++) {
    const text = inputEntries?.[i] ?? '';
    const entry = moddle.create('dmn:UnaryTests', { text });
    entry.$parent = rule;
    rule.inputEntry.push(entry);
  }
  rule.outputEntry = [];
  for (let i = 0; i < outputCount; i++) {
    const text = outputEntries?.[i] ?? '';
    const entry = moddle.create('dmn:LiteralExpression', { text });
    entry.$parent = rule;
    rule.outputEntry.push(entry);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function handleAddRule(args: AddRuleArgs): Promise<ToolResult> {
  validateArgs(args, ['diagramId', 'decisionId']);
  const { diagramId, decisionId, inputEntries, outputEntries, description, columns } = args;
  const diagram = requireDiagram(diagramId);

  const viewer = diagram.modeler.getActiveViewer();
  const elementRegistry = viewer.get('elementRegistry');
  const moddle = viewer.get('moddle');
  const element = requireElement(elementRegistry, decisionId);

  const bo = element.businessObject;
  const logic = requireDecisionTable(bo, decisionId);

  // Auto-create columns when provided
  const createdColumns = columns?.length ? autoCreateColumns(moddle, logic, columns) : [];

  // Create rule with entries
  const rule = moddle.create('dmn:DecisionRule', { description: description || undefined });
  rule.$parent = logic;
  createRuleEntries(
    moddle,
    rule,
    logic.input?.length || 0,
    logic.output?.length || 0,
    inputEntries,
    outputEntries
  );

  if (!logic.rule) logic.rule = [];
  logic.rule.push(rule);

  await syncXml(diagram);

  return jsonResult({
    success: true,
    decisionId,
    ruleId: rule.id,
    ruleIndex: logic.rule.length - 1,
    inputEntries: rule.inputEntry.map((e: any) => e.text || ''),
    outputEntries: rule.outputEntry.map((e: any) => e.text || ''),
    ruleCount: logic.rule.length,
    ...(createdColumns.length > 0 ? { createdColumns } : {}),
    message: `Added rule #${logic.rule.length} to decision table of ${decisionId}${createdColumns.length > 0 ? ` (created ${createdColumns.length} column${createdColumns.length === 1 ? '' : 's'})` : ''}`,
  });
}

export const TOOL_DEFINITION = {
  name: 'add_dmn_rule',
  description:
    'Add a new rule (row) to a decision table. Provide inputEntries and outputEntries ' +
    'arrays to pre-fill cell values, or leave empty for blank entries. ' +
    'Use columns to auto-create input/output columns inline (useful for the first rule).',
  inputSchema: {
    type: 'object',
    properties: {
      diagramId: { type: 'string', description: 'The diagram ID' },
      decisionId: { type: 'string', description: 'The Decision element ID' },
      inputEntries: {
        type: 'array',
        items: { type: 'string' },
        description:
          "Input cell values in column order. Use FEEL unary tests (e.g. '> 100', '\"gold\"', '[1..10]')",
      },
      outputEntries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Output cell values in column order. Use FEEL expressions.',
      },
      description: {
        type: 'string',
        description: 'Optional description/annotation for the rule',
      },
      columns: {
        type: 'array',
        description:
          'Optional column definitions to auto-create before adding the rule. ' +
          'Useful when adding the first rule to an empty table — avoids separate add_dmn_column calls.',
        items: {
          type: 'object',
          properties: {
            columnType: {
              type: 'string',
              enum: ['input', 'output'],
              description: 'Whether this is an input or output column',
            },
            label: { type: 'string', description: 'Column label' },
            expressionText: {
              type: 'string',
              description: 'FEEL expression (input columns only, e.g. variable name)',
            },
            typeRef: {
              type: 'string',
              description: "Type reference (e.g. 'string', 'integer'). Default: 'string'",
            },
            allowedValues: {
              type: 'string',
              description: 'Allowed values as comma-separated list',
            },
            name: {
              type: 'string',
              description: 'Output variable name (output columns only)',
            },
          },
          required: ['columnType'],
        },
      },
    },
    required: ['diagramId', 'decisionId'],
  },
} as const;
