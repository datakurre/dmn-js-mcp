import { describe, test, expect, beforeEach } from 'vitest';
import { handleListElements, handleAddElement, handleConnect } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('list_dmn_elements', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('lists elements in a new diagram', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(await handleListElements({ diagramId }));
    expect(res.elements).toBeDefined();
    expect(Array.isArray(res.elements)).toBe(true);
    // Initial diagram has Decision_1
    const ids = res.elements.map((e: any) => e.id);
    expect(ids).toContain('Decision_1');
  });

  test('throws for unknown diagram', async () => {
    await expect(handleListElements({ diagramId: 'bad' })).rejects.toThrow(/not found/i);
  });
});

describe('list_dmn_elements (single-element mode)', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('returns rich view for a single element', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(await handleListElements({ diagramId, elementId: 'Decision_1' }));
    expect(res.id).toBe('Decision_1');
    expect(res.type).toBe('dmn:Decision');
    expect(res.x).toBeDefined();
    expect(res.y).toBeDefined();
    // Decision_1 has a decision table by default
    expect(res.decisionLogic).toBeDefined();
    expect(res.decisionLogic.type).toBe('dmn:DecisionTable');
  });

  test('returns detailed connections', async () => {
    const { diagramId } = await createDiagram();
    const added = parseResult(
      await handleAddElement({ diagramId, elementType: 'dmn:InputData', name: 'Age' })
    );
    await handleConnect({
      diagramId,
      sourceElementId: added.elementId,
      targetElementId: 'Decision_1',
    });

    const res = parseResult(await handleListElements({ diagramId, elementId: 'Decision_1' }));
    expect(res.incoming).toBeDefined();
    expect(res.incoming).toHaveLength(1);
    expect(res.incoming[0]).toHaveProperty('type');
    expect(res.incoming[0]).toHaveProperty('sourceId');
  });

  test('throws for unknown elementId', async () => {
    const { diagramId } = await createDiagram();
    await expect(handleListElements({ diagramId, elementId: 'nonexistent' })).rejects.toThrow(
      /not found/i
    );
  });
});
