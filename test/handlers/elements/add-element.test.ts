import { describe, test, expect, beforeEach } from 'vitest';
import { handleAddElement, handleListElements } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('add_dmn_element', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('adds a Decision element and returns its id', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:Decision',
        name: 'Approval',
        x: 300,
        y: 200,
      })
    );
    expect(res.success).toBe(true);
    expect(res.elementId).toBeDefined();
    expect(res.elementType).toBe('dmn:Decision');
    expect(res.name).toBe('Approval');
  });

  test('adds an InputData element', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'Customer Age',
      })
    );
    expect(res.success).toBe(true);
    expect(res.elementType).toBe('dmn:InputData');
  });

  test('adds a BusinessKnowledgeModel element', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:BusinessKnowledgeModel',
        name: 'Risk Rules',
      })
    );
    expect(res.success).toBe(true);
    expect(res.elementType).toBe('dmn:BusinessKnowledgeModel');
  });

  test('adds a KnowledgeSource element', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:KnowledgeSource',
        name: 'Regulation',
      })
    );
    expect(res.success).toBe(true);
    expect(res.elementType).toBe('dmn:KnowledgeSource');
  });

  test('adds a TextAnnotation element', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:TextAnnotation',
        name: 'Note',
      })
    );
    expect(res.success).toBe(true);
    expect(res.elementType).toBe('dmn:TextAnnotation');
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleAddElement({ diagramId: 'bad', elementType: 'dmn:Decision' })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for invalid element type', async () => {
    const { diagramId } = await createDiagram();
    await expect(handleAddElement({ diagramId, elementType: 'dmn:Bogus' })).rejects.toThrow();
  });

  test('auto-positions when no coordinates given', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:Decision',
        name: 'Auto',
      })
    );
    expect(res.position).toBeDefined();
    expect(typeof res.position.x).toBe('number');
    expect(typeof res.position.y).toBe('number');
  });

  test('element appears in list after add', async () => {
    const { diagramId } = await createDiagram();
    const added = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'Amount',
      })
    );
    const list = parseResult(await handleListElements({ diagramId }));
    const ids = list.elements.map((e: any) => e.id);
    expect(ids).toContain(added.elementId);
  });
});
