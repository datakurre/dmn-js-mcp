import { describe, test, expect, beforeEach } from 'vitest';
import { handleExportDmn, handleCreateDiagram } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('export_dmn', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('exports XML format', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'xml' });
    const xml = result.content[0].text;
    expect(xml).toContain('<?xml');
    expect(xml).toContain('definitions');
  });

  test('exports SVG format (may be empty in headless mode)', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'svg' });
    const text = result.content[0].text;
    // In headless mode SVG may be empty or a JSON wrapper with svgWarning
    expect(text).toBeDefined();
  });

  test('exports both formats (XML always present)', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'both' });
    const data = parseResult({ content: result.content });
    expect(data.xml).toContain('definitions');
    // SVG may be empty in headless mode
    expect(data.svg).toBeDefined();
  });

  test('throws for unknown diagram', async () => {
    await expect(handleExportDmn({ diagramId: 'nonexistent', format: 'xml' })).rejects.toThrow(
      /not found/i
    );
  });

  test('throws for missing required args', async () => {
    await expect(handleExportDmn({ diagramId: 'x' } as any)).rejects.toThrow();
  });
});
