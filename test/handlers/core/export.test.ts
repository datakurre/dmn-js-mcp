import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { handleExportDmn, handleCreateDiagram } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('export_dmn', () => {
  let tmpDir: string;

  beforeEach(async () => {
    clearDiagrams();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmn-export-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── Without filePath (internal / test use) ──────────────────────────

  test('returns XML inline when no filePath provided', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'xml' });
    const xml = result.content[0].text;
    expect(xml).toContain('<?xml');
    expect(xml).toContain('definitions');
  });

  test('returns SVG inline when no filePath provided (may be empty in headless mode)', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'svg' });
    const text = result.content[0].text;
    expect(text).toBeDefined();
  });

  test('returns both formats inline when no filePath provided', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = await handleExportDmn({ diagramId, format: 'both' });
    const data = parseResult({ content: result.content });
    expect(data.xml).toContain('definitions');
    expect(data.svg).toBeDefined();
  });

  // ── With filePath (normal MCP usage) ────────────────────────────────

  test('writes XML to filePath', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const filePath = path.join(tmpDir, 'test.dmn');
    const data = parseResult(await handleExportDmn({ diagramId, format: 'xml', filePath }));
    expect(data.success).toBe(true);
    expect(data.filePath).toBe(filePath);
    expect(data.message).toContain(filePath);
    // Content should NOT be in the response by default
    expect(data.xml).toBeUndefined();
    // File should exist on disk
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toContain('<?xml');
    expect(written).toContain('definitions');
  });

  test('writes XML and SVG for format=both', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const filePath = path.join(tmpDir, 'test.dmn');
    const data = parseResult(await handleExportDmn({ diagramId, format: 'both', filePath }));
    expect(data.success).toBe(true);
    expect(data.filePath).toBe(filePath);
    // XML should NOT be in the response by default
    expect(data.xml).toBeUndefined();
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toContain('definitions');
  });

  test('includes content in response when returnContent is true', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const filePath = path.join(tmpDir, 'test.dmn');
    const data = parseResult(
      await handleExportDmn({ diagramId, format: 'xml', filePath, returnContent: true })
    );
    expect(data.success).toBe(true);
    expect(data.filePath).toBe(filePath);
    // Content IS returned because returnContent is true
    expect(data.xml).toContain('definitions');
    // And also written to disk
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toContain('definitions');
  });

  // ── filePath is required in tool schema ─────────────────────────────

  test('tool definition requires filePath', async () => {
    const { TOOL_DEFINITION } = await import('../../../src/handlers/core/export');
    expect(TOOL_DEFINITION.inputSchema.required).toContain('filePath');
  });

  // ── Error cases ─────────────────────────────────────────────────────

  test('throws for unknown diagram', async () => {
    await expect(handleExportDmn({ diagramId: 'nonexistent', format: 'xml' })).rejects.toThrow(
      /not found/i
    );
  });

  test('throws for missing required args', async () => {
    await expect(handleExportDmn({ diagramId: 'x' } as any)).rejects.toThrow();
  });
});
