import { describe, test, expect, beforeEach } from 'vitest';
import { handleAddElement, handleConnect } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('connect_dmn_elements', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('connects InputData to Decision with InformationRequirement', async () => {
    const { diagramId } = await createDiagram();
    const input = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'Age',
        x: 100,
        y: 300,
      })
    );
    // Decision_1 exists in initial diagram
    const res = parseResult(
      await handleConnect({
        diagramId,
        sourceElementId: input.elementId,
        targetElementId: 'Decision_1',
      })
    );
    expect(res.success).toBe(true);
    expect(res.connectionId).toBeDefined();
    expect(res.connectionType).toBe('dmn:InformationRequirement');
  });

  test('connects Decision to Decision', async () => {
    const { diagramId } = await createDiagram();
    const decision2 = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:Decision',
        name: 'Sub Decision',
        x: 100,
        y: 300,
      })
    );
    const res = parseResult(
      await handleConnect({
        diagramId,
        sourceElementId: decision2.elementId,
        targetElementId: 'Decision_1',
      })
    );
    expect(res.success).toBe(true);
    expect(res.connectionType).toBe('dmn:InformationRequirement');
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleConnect({
        diagramId: 'bad',
        sourceElementId: 'a',
        targetElementId: 'b',
      })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for unknown source element', async () => {
    const { diagramId } = await createDiagram();
    await expect(
      handleConnect({
        diagramId,
        sourceElementId: 'nonexistent',
        targetElementId: 'Decision_1',
      })
    ).rejects.toThrow(/not found/i);
  });
});
