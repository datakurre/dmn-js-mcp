import { describe, test, expect, beforeEach } from 'vitest';
import {
  handleSetCamundaProperties,
  handleCreateDiagram,
  handleExportDmn,
} from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('set_dmn_camunda_properties', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('sets versionTag on a Decision', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { versionTag: '1.0.0' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.appliedProperties).toContain('camunda:versionTag');

    // Verify in exported XML
    const exported = parseResult(await handleExportDmn({ diagramId, format: 'xml' }));
    expect(exported.xml).toContain('camunda:versionTag="1.0.0"');
  });

  test('sets historyTimeToLive on a Decision', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { historyTimeToLive: 'P180D' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.appliedProperties).toContain('camunda:historyTimeToLive');
  });

  test('accepts camunda: prefixed property names', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { 'camunda:versionTag': '2.0' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.appliedProperties).toContain('camunda:versionTag');
  });

  test('sets multiple properties at once', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { versionTag: '3.0', historyTimeToLive: 'P30D' },
      })
    );
    expect(result.success).toBe(true);
    expect(result.appliedProperties).toHaveLength(2);
  });

  test('rejects unknown camunda property', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await expect(
      handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { bogus: 'value' },
      })
    ).rejects.toThrow(/invalid/i);
  });

  test('rejects property on wrong element type', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    // diagramRelationId is only for Definitions, not Decision
    await expect(
      handleSetCamundaProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { diagramRelationId: 'abc' },
      })
    ).rejects.toThrow();
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleSetCamundaProperties({
        diagramId: 'nonexistent',
        elementId: 'x',
        properties: {},
      })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for missing required args', async () => {
    await expect(
      handleSetCamundaProperties({ diagramId: 'x', elementId: 'y' } as any)
    ).rejects.toThrow();
  });
});
