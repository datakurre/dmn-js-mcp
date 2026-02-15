import { describe, test, expect, beforeEach } from 'vitest';
import { handleSummarizeDiagram } from '../../../src/handlers/core/summarize';
import { handleAddElement } from '../../../src/handlers/elements/add-element';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { handleAddColumn } from '../../../src/handlers/decision-table/add-column';
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

  test('includes validation by default', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleSummarizeDiagram({ diagramId }));

    expect(res.validation).toBeDefined();
    expect(typeof res.validation.isValid).toBe('boolean');
    expect(typeof res.validation.errorCount).toBe('number');
    expect(typeof res.validation.warningCount).toBe('number');
    expect(Array.isArray(res.validation.issues)).toBe(true);
  });

  test('can skip validation with includeValidation=false', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleSummarizeDiagram({ diagramId, includeValidation: false }));

    expect(res.success).toBe(true);
    expect(res.validation).toBeUndefined();
  });

  test('includes variables when requested', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleAddColumn({
      diagramId,
      decisionId: 'Decision_1',
      columnType: 'input',
      label: 'Age',
      expressionText: 'age',
      typeRef: 'integer',
    });

    const res = parseResult(await handleSummarizeDiagram({ diagramId, includeVariables: true }));

    expect(res.success).toBe(true);
    expect(res.variables).toBeDefined();
    expect(Array.isArray(res.variables)).toBe(true);
    expect(res.totalVariables).toBeGreaterThanOrEqual(1);
  });

  test('does not include variables by default', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const res = parseResult(await handleSummarizeDiagram({ diagramId }));

    expect(res.variables).toBeUndefined();
    expect(res.totalVariables).toBeUndefined();
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
