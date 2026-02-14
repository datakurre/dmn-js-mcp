import { describe, test, expect, beforeEach } from 'vitest';
import { handleDmnHistory } from '../../../src/handlers/core/history';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { handleAddElement } from '../../../src/handlers/elements/add-element';
import { parseResult, clearDiagrams } from '../../helpers';

describe('dmn_history', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('undoes a change', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    // Make a change
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Test Input',
      x: 300,
      y: 250,
    });

    // Undo it
    const res = parseResult(await handleDmnHistory({ diagramId, action: 'undo' }));
    expect(res.success).toBe(true);
    expect(res.stepsPerformed).toBe(1);
    expect(res.message).toMatch(/Undid 1 change/);
  });

  test('redoes an undone change', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Test Input',
      x: 300,
      y: 250,
    });

    await handleDmnHistory({ diagramId, action: 'undo' });

    const res = parseResult(await handleDmnHistory({ diagramId, action: 'redo' }));
    expect(res.success).toBe(true);
    expect(res.stepsPerformed).toBe(1);
    expect(res.message).toMatch(/Redid 1 change/);
  });

  test('reports nothing to undo on empty stack', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleDmnHistory({ diagramId, action: 'undo' }));
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Nothing to undo/);
  });

  test('reports nothing to redo when no undone changes', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleDmnHistory({ diagramId, action: 'redo' }));
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Nothing to redo/);
  });

  test('supports multiple undo steps', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Input 1',
      x: 300,
      y: 250,
    });
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Input 2',
      x: 500,
      y: 250,
    });

    const res = parseResult(await handleDmnHistory({ diagramId, action: 'undo', steps: 2 }));
    expect(res.success).toBe(true);
    expect(res.stepsPerformed).toBe(2);
  });

  test('throws for unknown diagram', async () => {
    await expect(handleDmnHistory({ diagramId: 'nonexistent', action: 'undo' })).rejects.toThrow(
      /not found/i
    );
  });
});
