/**
 * Library entry point for dmn-js-mcp.
 *
 * Provides the DMN ToolModule for integration with other MCP servers
 * (e.g. bpmn-js-mcp). Import the `dmnModule` and register it alongside
 * other modules in your server's module array:
 *
 *   import { dmnModule } from 'dmn-js-mcp';
 *   const modules: ToolModule[] = [bpmnModule, dmnModule];
 *
 * Also re-exports key types, persistence helpers, and the diagram manager
 * for advanced integration scenarios.
 */

// ── Core module ────────────────────────────────────────────────────────────

export { dmnModule } from './dmn-module';
export { type ToolModule } from './module';

// ── Types ──────────────────────────────────────────────────────────────────

export { type DiagramState, type DmnModeler, type ToolResult, type HintLevel } from './types';
export { type DmnViewType } from './types';

// ── Diagram management ────────────────────────────────────────────────────

export {
  getDiagram,
  getAllDiagrams,
  storeDiagram,
  deleteDiagram,
  clearDiagrams,
  generateDiagramId,
  createModeler,
  createModelerFromXml,
} from './diagram-manager';

// ── Persistence ────────────────────────────────────────────────────────────

export {
  enablePersistence,
  disablePersistence,
  isPersistenceEnabled,
  getPersistDir,
  persistDiagram,
} from './persistence';

// ── Resources & Prompts ────────────────────────────────────────────────────

export { RESOURCE_TEMPLATES, listResources, readResource } from './resources';
export { listPrompts, getPrompt } from './prompts';

// ── Handler access (advanced) ──────────────────────────────────────────────

export { TOOL_DEFINITIONS, dispatchToolCall } from './handlers';
