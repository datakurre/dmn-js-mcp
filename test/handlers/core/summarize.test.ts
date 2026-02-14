import { describe, test, expect, beforeEach } from 'vitest';
import { handleSummarizeDiagram } from '../../../src/handlers/core/summarize';
import { handleAddElement } from '../../../src/handlers/elements/add-element';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { parseResult, clearDiagrams } from '../../helpers';

describe('summarize_dmn_diagram', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('summarizes a new diagram with default elements', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({ name: 'Test Decision' }));
    const res = parseResult(await handleSummarizeDiagram({ diagramId }));

    expect(res.success).toBe(true);
    expect(res.diagramName).toBe('Test Decision');
    expect(res.decisions).toHaveLength(1);
    expect(res.decisions[0].name).toBe('Test Decision');
    expect(res.decisions[0].decisionLogicType).toBe('dmn:DecisionTable');
    expect(res.elementCounts.decisions).toBe(1);
    expect(res.totalElements).toBeGreaterThanOrEqual(1);
  });

  test('counts multiple elements correctly', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Customer Age',
      x: 160,
      y: 250,
    });
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Order Amount',
      x: 350,
      y: 250,
    });

    const res = parseResult(await handleSummarizeDiagram({ diagramId }));

    expect(res.success).toBe(true);
    expect(res.elementCounts.decisions).toBe(1);
    expect(res.elementCounts.inputData).toBe(2);
    expect(res.namedElements.length).toBeGreaterThanOrEqual(3);
  });

  test('reports disconnected elements', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Disconnected Input',
      x: 400,
      y: 250,
    });

    const res = parseResult(await handleSummarizeDiagram({ diagramId }));

    expect(res.disconnectedCount).toBeGreaterThan(0);
    expect(res.disconnectedElements).toBeDefined();
  });

  test('throws for unknown diagram', async () => {
    await expect(handleSummarizeDiagram({ diagramId: 'nonexistent' })).rejects.toThrow(
      /not found/i
    );
  });
});
