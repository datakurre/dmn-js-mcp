import { describe, test, expect, beforeEach } from 'vitest';
import { handleListElements } from '../../../src/handlers';
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
