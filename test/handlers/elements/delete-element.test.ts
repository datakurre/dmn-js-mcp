import { describe, test, expect, beforeEach } from 'vitest';
import { handleAddElement, handleDeleteElement, handleListElements } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('delete_dmn_element', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('deletes an element', async () => {
    const { diagramId } = await createDiagram();
    const added = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'To Delete',
        x: 300,
        y: 300,
      })
    );
    const res = parseResult(await handleDeleteElement({ diagramId, elementId: added.elementId }));
    expect(res.success).toBe(true);
  });

  test('deleted element no longer in list', async () => {
    const { diagramId } = await createDiagram();
    const added = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'Temp',
        x: 300,
        y: 300,
      })
    );
    await handleDeleteElement({ diagramId, elementId: added.elementId });
    const list = parseResult(await handleListElements({ diagramId }));
    const ids = list.elements.map((e: any) => e.id);
    expect(ids).not.toContain(added.elementId);
  });

  test('throws for unknown element', async () => {
    const { diagramId } = await createDiagram();
    await expect(handleDeleteElement({ diagramId, elementId: 'nonexistent' })).rejects.toThrow(
      /not found/i
    );
  });
});
