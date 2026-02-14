import { describe, test, expect, beforeEach } from 'vitest';
import { handleCreateDiagram, handleExportDmn } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('create_dmn_diagram', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('returns success with a diagramId', async () => {
    const res = parseResult(await handleCreateDiagram({}));
    expect(res.success).toBe(true);
    expect(res.diagramId).toMatch(/^diagram_/);
  });

  test('returns diagramId and success', async () => {
    const res = parseResult(await handleCreateDiagram({}));
    expect(res.success).toBe(true);
    expect(res.diagramId).toBeDefined();
  });

  test('exported XML contains DMN definitions', async () => {
    const res = parseResult(await handleCreateDiagram({}));
    const xml = (await handleExportDmn({ diagramId: res.diagramId, format: 'xml' })).content[0]
      .text;
    expect(xml).toContain('definitions');
    expect(xml).toContain('https://www.omg.org/spec/DMN/20191111/MODEL/');
  });

  test('sets diagram name when provided', async () => {
    const res = parseResult(await handleCreateDiagram({ name: 'My Decision' }));
    expect(res.success).toBe(true);
    const xml = (await handleExportDmn({ diagramId: res.diagramId, format: 'xml' })).content[0]
      .text;
    expect(xml).toContain('My Decision');
  });
});
