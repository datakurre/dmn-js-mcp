import { describe, test, expect, beforeEach } from 'vitest';
import {
  handleCreateDiagram,
  handleDeleteDiagram,
  handleListDiagrams,
} from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('delete_dmn_diagram', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('deletes an existing diagram', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleDeleteDiagram({ diagramId }));
    expect(res.success).toBe(true);
  });

  test('deleted diagram no longer appears in list', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleDeleteDiagram({ diagramId });
    const list = parseResult(await handleListDiagrams({}));
    const ids = list.diagrams.map((d: any) => d.diagramId);
    expect(ids).not.toContain(diagramId);
  });

  test('throws for unknown diagram', async () => {
    await expect(handleDeleteDiagram({ diagramId: 'nonexistent' })).rejects.toThrow(/not found/i);
  });
});

describe('list_dmn_diagrams', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('returns empty list when no diagrams exist', async () => {
    const res = parseResult(await handleListDiagrams({}));
    expect(res.diagrams).toEqual([]);
    expect(res.count).toBe(0);
  });

  test('lists created diagrams', async () => {
    await handleCreateDiagram({});
    await handleCreateDiagram({});
    const res = parseResult(await handleListDiagrams({}));
    expect(res.count).toBe(2);
    expect(res.diagrams).toHaveLength(2);
  });
});
