import { describe, test, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../src/handlers';

describe('tool-definitions', () => {
  const toolNames = TOOL_DEFINITIONS.map((t) => t.name);

  test('exports the expected number of tools', () => {
    expect(TOOL_DEFINITIONS.length).toBe(23);
  });

  test.each([
    'create_dmn_diagram',
    'import_dmn_xml',
    'export_dmn',
    'delete_dmn_diagram',
    'list_dmn_diagrams',
    'summarize_dmn_diagram',
    'dmn_history',
    'batch_dmn_operations',
    'layout_dmn_diagram',
    'add_dmn_element',
    'connect_dmn_elements',
    'delete_dmn_element',
    'move_dmn_element',
    'list_dmn_elements',
    'get_dmn_element_properties',
    'set_dmn_element_properties',
    'get_dmn_decision_logic',
    'add_dmn_column',
    'add_dmn_rule',
    'edit_dmn_cell',
    'remove_dmn_rule',
    'set_dmn_literal_expression',
    'validate_dmn_feel_expression',
  ])("includes tool '%s'", (name) => {
    expect(toolNames).toContain(name);
  });

  test("every tool has an inputSchema with type 'object'", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  test('every tool name includes "dmn"', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toContain('dmn');
    }
  });

  test('no duplicate tool names', () => {
    const unique = new Set(toolNames);
    expect(unique.size).toBe(toolNames.length);
  });

  test('add_dmn_element requires diagramId and elementType', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'add_dmn_element')!;
    expect(tool.inputSchema.required).toContain('diagramId');
    expect(tool.inputSchema.required).toContain('elementType');
  });

  test('export_dmn requires diagramId and format', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'export_dmn')!;
    expect(tool.inputSchema.required).toContain('diagramId');
    expect(tool.inputSchema.required).toContain('format');
  });

  test('connect_dmn_elements requires diagramId, sourceElementId, targetElementId', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'connect_dmn_elements')!;
    expect(tool.inputSchema.required).toContain('diagramId');
    expect(tool.inputSchema.required).toContain('sourceElementId');
    expect(tool.inputSchema.required).toContain('targetElementId');
  });
});
