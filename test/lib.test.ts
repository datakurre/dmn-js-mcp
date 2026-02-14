/**
 * Tests for the library entry point (src/lib.ts).
 *
 * Verifies that the public API surface is properly exported and
 * the dmnModule integrates correctly with the ToolModule interface.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  dmnModule,
  TOOL_DEFINITIONS,
  dispatchToolCall,
  enablePersistence,
  disablePersistence,
  isPersistenceEnabled,
  clearDiagrams,
  getDiagram,
  getAllDiagrams,
  listResources,
  listPrompts,
  RESOURCE_TEMPLATES,
  type ToolModule,
  type HintLevel,
  type DmnViewType,
} from '../src/lib';

afterEach(() => {
  clearDiagrams();
  disablePersistence();
});

describe('lib entry point', () => {
  test('exports dmnModule conforming to ToolModule interface', () => {
    const mod: ToolModule = dmnModule;
    expect(mod.name).toBe('dmn');
    expect(Array.isArray(mod.toolDefinitions)).toBe(true);
    expect(mod.toolDefinitions.length).toBeGreaterThan(0);
    expect(typeof mod.dispatch).toBe('function');
  });

  test('dmnModule.toolDefinitions matches TOOL_DEFINITIONS', () => {
    expect(dmnModule.toolDefinitions).toBe(TOOL_DEFINITIONS);
  });

  test('dmnModule.dispatch returns undefined for unknown tools', () => {
    expect(dmnModule.dispatch('unknown_tool', {})).toBeUndefined();
  });

  test('dmnModule.dispatch handles known tools', async () => {
    // create_dmn_diagram is a known tool
    const result = await dmnModule.dispatch('create_dmn_diagram', { name: 'Test' });
    expect(result).toBeDefined();
    const parsed = JSON.parse(result!.content[0].text);
    expect(parsed.diagramId).toBeDefined();
    expect(parsed.name).toBe('Test');
  });

  test('dispatchToolCall works for tool calls', async () => {
    const result = await dispatchToolCall('create_dmn_diagram', { name: 'Dispatch Test' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.diagramId).toBeDefined();
  });

  test('diagram manager exports work', async () => {
    const result = await dmnModule.dispatch('create_dmn_diagram', { name: 'DM Test' });
    const parsed = JSON.parse(result!.content[0].text);
    const diagrams = getAllDiagrams();
    expect(diagrams.size).toBeGreaterThan(0);

    const diagram = getDiagram(parsed.diagramId);
    expect(diagram).toBeDefined();
    expect(diagram!.name).toBe('DM Test');
  });

  test('persistence exports work', () => {
    expect(isPersistenceEnabled()).toBe(false);
    // Just verify the functions are callable
    expect(typeof enablePersistence).toBe('function');
    expect(typeof disablePersistence).toBe('function');
  });

  test('resource exports work', () => {
    expect(Array.isArray(RESOURCE_TEMPLATES)).toBe(true);
    expect(RESOURCE_TEMPLATES.length).toBeGreaterThan(0);

    const resources = listResources();
    expect(Array.isArray(resources)).toBe(true);
  });

  test('prompt exports work', () => {
    const prompts = listPrompts();
    expect(Array.isArray(prompts)).toBe(true);
    expect(prompts.length).toBeGreaterThan(0);
  });

  test('type exports compile correctly', () => {
    // These are compile-time checks — if this file compiles, types are exported
    const _hintLevel: HintLevel = 'full';
    const _viewType: DmnViewType = 'drd';
    expect(_hintLevel).toBe('full');
    expect(_viewType).toBe('drd');
  });

  test('module can be used in a multi-module server array', () => {
    // Simulates how bpmn-js-mcp would integrate the DMN module
    const modules: ToolModule[] = [dmnModule];
    const allTools = modules.flatMap((m) => m.toolDefinitions);
    expect(allTools.length).toBe(TOOL_DEFINITIONS.length);

    // Dispatch routing: first module that handles wins
    const toolName = 'create_dmn_diagram';
    let handled = false;
    for (const mod of modules) {
      const result = mod.dispatch(toolName, { name: 'Multi-module' });
      if (result) {
        handled = true;
        break;
      }
    }
    expect(handled).toBe(true);

    // Unknown tool falls through all modules
    let unhandled = true;
    for (const mod of modules) {
      const result = mod.dispatch('unknown_bpmn_tool', {});
      if (result) {
        unhandled = false;
        break;
      }
    }
    expect(unhandled).toBe(true);
  });
});
