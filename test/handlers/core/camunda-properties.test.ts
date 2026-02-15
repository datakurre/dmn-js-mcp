import { describe, test, expect, beforeEach } from 'vitest';
import { handleSetProperties, handleCreateDiagram, handleExportDmn } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('set_dmn_element_properties (camunda properties)', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('sets versionTag on a Decision', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:versionTag': '1.0.0' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.updatedProperties).toContain('camunda:versionTag');

    // Verify in exported XML
    const exported = parseResult(await handleExportDmn({ diagramId, format: 'xml' }));
    expect(exported.xml).toContain('camunda:versionTag="1.0.0"');
  });

  test('sets historyTimeToLive on a Decision', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:historyTimeToLive': 'P180D' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.updatedProperties).toContain('camunda:historyTimeToLive');
  });

  test('sets multiple camunda properties at once', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:versionTag': '3.0', 'camunda:historyTimeToLive': 'P30D' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.updatedProperties).toHaveLength(2);
  });

  test('rejects unknown camunda property', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await expect(
      handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:bogus': 'value' },
      })
    ).rejects.toThrow(/invalid/i);
  });

  test('rejects camunda property on wrong element type', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    // diagramRelationId is only for Definitions, not Decision
    await expect(
      handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:diagramRelationId': 'abc' },
      })
    ).rejects.toThrow();
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleSetProperties({
        diagramId: 'nonexistent',
        elementId: 'x',
        properties: {},
      })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for missing required args', async () => {
    await expect(handleSetProperties({ diagramId: 'x', elementId: 'y' } as any)).rejects.toThrow();
  });
});
