/**
 * Barrel re-export of all handler functions + unified tool registry.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  ADDING A NEW TOOL? Only TWO steps needed:                      │
 * │  1. Create src/handlers/<category>/<name>.ts                    │
 * │     (export handler + TOOL_DEFINITION)                          │
 * │  2. Add ONE entry to TOOL_REGISTRY below                        │
 * │                                                                  │
 * │  Categories: core/, elements/, decision-table/,                 │
 * │              literal-expression/, feel/                          │
 * │  The dispatch map and TOOL_DEFINITIONS array are auto-derived.  │
 * └──────────────────────────────────────────────────────────────────┘
 */

import { type ToolResult } from '../types';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ERR_INTERNAL } from '../errors';

// ── Core: diagram lifecycle, import/export, validation ─────────────────────

import { handleCreateDiagram, TOOL_DEFINITION as CREATE_DIAGRAM_DEF } from './core/create-diagram';
import { handleDeleteDiagram, TOOL_DEFINITION as DELETE_DIAGRAM_DEF } from './core/delete-diagram';
import { handleListDiagrams, TOOL_DEFINITION as LIST_DIAGRAMS_DEF } from './core/list-diagrams';
import { handleImportXml, TOOL_DEFINITION as IMPORT_XML_DEF } from './core/import-xml';
import { handleExportDmn, TOOL_DEFINITION as EXPORT_DMN_DEF } from './core/export';
import { handleSummarizeDiagram, TOOL_DEFINITION as SUMMARIZE_DEF } from './core/summarize';
import { handleDmnHistory, TOOL_DEFINITION as HISTORY_DEF } from './core/history';
import { handleBatchOperations, TOOL_DEFINITION as BATCH_DEF } from './core/batch';

// ── Layout ─────────────────────────────────────────────────────────────────

import { handleLayoutDiagram, TOOL_DEFINITION as LAYOUT_DEF } from './layout/layout';

// ── Elements: DRD element CRUD ─────────────────────────────────────────────

import { handleAddElement, TOOL_DEFINITION as ADD_ELEMENT_DEF } from './elements/add-element';
import { handleConnect, TOOL_DEFINITION as CONNECT_DEF } from './elements/connect-elements';
import {
  handleDeleteElement,
  TOOL_DEFINITION as DELETE_ELEMENT_DEF,
} from './elements/delete-element';
import { handleListElements, TOOL_DEFINITION as LIST_ELEMENTS_DEF } from './elements/list-elements';
import {
  handleGetProperties,
  TOOL_DEFINITION as GET_PROPERTIES_DEF,
} from './elements/get-properties';
import {
  handleSetProperties,
  TOOL_DEFINITION as SET_PROPERTIES_DEF,
} from './elements/set-properties';

// ── Decision Table ─────────────────────────────────────────────────────────

import {
  handleGetDecisionLogic,
  TOOL_DEFINITION as GET_DECISION_LOGIC_DEF,
} from './decision-table/get-decision-logic';
import { handleAddColumn, TOOL_DEFINITION as ADD_COLUMN_DEF } from './decision-table/add-column';
import { handleAddRule, TOOL_DEFINITION as ADD_RULE_DEF } from './decision-table/add-rule';
import { handleEditCell, TOOL_DEFINITION as EDIT_CELL_DEF } from './decision-table/edit-cell';
import { handleRemoveRule, TOOL_DEFINITION as REMOVE_RULE_DEF } from './decision-table/remove-rule';

// ── Literal Expression ─────────────────────────────────────────────────────

import {
  handleSetLiteralExpression,
  TOOL_DEFINITION as SET_LITERAL_EXPRESSION_DEF,
} from './literal-expression/set-literal-expression';

// ── FEEL ───────────────────────────────────────────────────────────────────

import {
  handleValidateFeelExpression,
  TOOL_DEFINITION as VALIDATE_FEEL_DEF,
} from './feel/validate-expression';

// ── Unified tool registry ──────────────────────────────────────────────────

interface ToolRegistration {
  readonly definition: { readonly name: string; readonly [key: string]: unknown };
  readonly handler: (args: any) => Promise<ToolResult>;
}

const TOOL_REGISTRY: ToolRegistration[] = [
  // Core
  { definition: CREATE_DIAGRAM_DEF, handler: handleCreateDiagram },
  { definition: IMPORT_XML_DEF, handler: handleImportXml },
  { definition: EXPORT_DMN_DEF, handler: handleExportDmn },
  { definition: DELETE_DIAGRAM_DEF, handler: handleDeleteDiagram },
  { definition: LIST_DIAGRAMS_DEF, handler: handleListDiagrams },
  { definition: SUMMARIZE_DEF, handler: handleSummarizeDiagram },
  { definition: HISTORY_DEF, handler: handleDmnHistory },
  { definition: BATCH_DEF, handler: handleBatchOperations },
  // Layout
  { definition: LAYOUT_DEF, handler: handleLayoutDiagram },
  // DRD Elements
  { definition: ADD_ELEMENT_DEF, handler: handleAddElement },
  { definition: CONNECT_DEF, handler: handleConnect },
  { definition: DELETE_ELEMENT_DEF, handler: handleDeleteElement },
  { definition: LIST_ELEMENTS_DEF, handler: handleListElements },
  { definition: GET_PROPERTIES_DEF, handler: handleGetProperties },
  { definition: SET_PROPERTIES_DEF, handler: handleSetProperties },
  // Decision Table
  { definition: GET_DECISION_LOGIC_DEF, handler: handleGetDecisionLogic },
  { definition: ADD_COLUMN_DEF, handler: handleAddColumn },
  { definition: ADD_RULE_DEF, handler: handleAddRule },
  { definition: EDIT_CELL_DEF, handler: handleEditCell },
  { definition: REMOVE_RULE_DEF, handler: handleRemoveRule },
  // Literal Expression
  { definition: SET_LITERAL_EXPRESSION_DEF, handler: handleSetLiteralExpression },
  // FEEL
  { definition: VALIDATE_FEEL_DEF, handler: handleValidateFeelExpression },
];

// ── Auto-derived exports ───────────────────────────────────────────────────

/** MCP tool definitions (passed to ListTools). */
export const TOOL_DEFINITIONS = TOOL_REGISTRY.map((r) => r.definition);

/** Dispatch map: tool-name → handler. Auto-derived from TOOL_REGISTRY. */
const dispatchMap: Record<string, (args: any) => Promise<ToolResult>> = {};
for (const { definition, handler } of TOOL_REGISTRY) {
  dispatchMap[definition.name] = handler;
}

/** Route a CallTool request to the correct handler. */
export async function dispatchToolCall(name: string, args: any): Promise<ToolResult> {
  const handler = dispatchMap[name];
  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    return await handler(args);
  } catch (error: any) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${error.message}`, {
      code: ERR_INTERNAL,
    });
  }
}

// ── Re-export every handler so existing imports keep working ───────────────

export {
  handleCreateDiagram,
  handleLayoutDiagram,
  handleDeleteDiagram,
  handleListDiagrams,
  handleImportXml,
  handleExportDmn,
  handleSummarizeDiagram,
  handleDmnHistory,
  handleBatchOperations,
  handleAddElement,
  handleConnect,
  handleDeleteElement,
  handleListElements,
  handleGetProperties,
  handleSetProperties,
  handleGetDecisionLogic,
  handleAddColumn,
  handleAddRule,
  handleEditCell,
  handleRemoveRule,
  handleSetLiteralExpression,
  handleValidateFeelExpression,
};
