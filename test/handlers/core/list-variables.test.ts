import { describe, test, expect, beforeEach } from 'vitest';
import { handleSummarizeDiagram } from '../../../src/handlers/core/summarize';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { handleAddElement } from '../../../src/handlers/elements/add-element';
import { handleAddColumn } from '../../../src/handlers/decision-table/add-column';
import { parseResult, clearDiagrams } from '../../helpers';

describe('summarize_dmn_diagram (variables)', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('lists variables from a new diagram', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({ name: 'Test' }));
    const res = parseResult(await handleSummarizeDiagram({ diagramId, includeVariables: true }));

    expect(res.success).toBe(true);
    expect(res.totalVariables).toBeGreaterThanOrEqual(0);
    expect(res.variables).toBeDefined();
    expect(Array.isArray(res.variables)).toBe(true);
  });

  test('finds input data elements as input variables', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await handleAddElement({
      diagramId,
      elementType: 'dmn:InputData',
      name: 'Customer Age',
      x: 160,
      y: 250,
    });

    const res = parseResult(await handleSummarizeDiagram({ diagramId, includeVariables: true }));

    expect(res.success).toBe(true);
    const inputVar = res.variables.find(
      (v: any) => v.name === 'Customer Age' && v.type === 'input'
    );
    expect(inputVar).toBeDefined();
    expect(inputVar.sources[0].sourceType).toBe('inputData');
  });

  test('finds decision table inputs and outputs', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    // Add a named input column
    await handleAddColumn({
      diagramId,
      decisionId: 'Decision_1',
      columnType: 'input',
      label: 'Age',
      expressionText: 'age',
      typeRef: 'integer',
    });

    // Add a named output column
    await handleAddColumn({
      diagramId,
      decisionId: 'Decision_1',
      columnType: 'output',
      name: 'discount',
      label: 'Discount',
      typeRef: 'double',
    });

    const res = parseResult(await handleSummarizeDiagram({ diagramId, includeVariables: true }));

    expect(res.success).toBe(true);
    // Should have at least the Age input and discount output from the table
    expect(res.variables.length).toBeGreaterThanOrEqual(2);

    // Should find the 'Age' variable (from decision table input)
    const ageVar = res.variables.find((v: any) => v.name === 'Age');
    expect(ageVar).toBeDefined();
    expect(ageVar.type).toBe('input');

    // Should find the 'discount' variable (from decision table output)
    const discountVar = res.variables.find((v: any) => v.name === 'discount');
    expect(discountVar).toBeDefined();
    expect(discountVar.type).toBe('output');
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleSummarizeDiagram({ diagramId: 'nonexistent', includeVariables: true })
    ).rejects.toThrow(/not found/i);
  });
});
