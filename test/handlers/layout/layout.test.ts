import { describe, test, expect, beforeEach } from 'vitest';
import {
  handleLayoutDiagram,
  handleCreateDiagram,
  handleAddElement,
  handleConnect,
} from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('layout_dmn_diagram', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('layouts a diagram with default direction', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    // Add some elements
    const input1 = parseResult(
      await handleAddElement({ diagramId, elementType: 'dmn:InputData', name: 'Age' })
    );
    const input2 = parseResult(
      await handleAddElement({ diagramId, elementType: 'dmn:InputData', name: 'Income' })
    );

    // Connect inputs to existing decision
    await handleConnect({
      diagramId,
      sourceElementId: input1.elementId,
      targetElementId: 'Decision_1',
    });
    await handleConnect({
      diagramId,
      sourceElementId: input2.elementId,
      targetElementId: 'Decision_1',
    });

    const result = parseResult(await handleLayoutDiagram({ diagramId }));
    expect(result.success).toBe(true);
    expect(result.direction).toBe('UP');
    expect(result.totalElements).toBeGreaterThanOrEqual(3);
    expect(typeof result.elementsMoved).toBe('number');
  });

  test('layouts with custom direction', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(await handleLayoutDiagram({ diagramId, direction: 'RIGHT' }));
    expect(result.success).toBe(true);
    expect(result.direction).toBe('RIGHT');
  });

  test('handles empty diagram gracefully', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    // Even a fresh diagram has Decision_1, so the layout should work
    const result = parseResult(await handleLayoutDiagram({ diagramId }));
    expect(result.success).toBe(true);
  });

  test('respects custom spacing', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleAddElement({ diagramId, elementType: 'dmn:InputData', name: 'Input' });
    const result = parseResult(
      await handleLayoutDiagram({ diagramId, nodeSpacing: 100, layerSpacing: 120 })
    );
    expect(result.success).toBe(true);
  });

  test('throws for unknown diagram', async () => {
    await expect(handleLayoutDiagram({ diagramId: 'nonexistent' })).rejects.toThrow(/not found/i);
  });

  test('throws for missing required args', async () => {
    await expect(handleLayoutDiagram({} as any)).rejects.toThrow();
  });
});
