import { describe, test, expect, beforeEach } from 'vitest';
import { handleListVariables } from '../../../src/handlers/core/list-variables';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { handleAddElement } from '../../../src/handlers/elements/add-element';
import { handleAddInput } from '../../../src/handlers/decision-table/add-input';
import { handleAddOutput } from '../../../src/handlers/decision-table/add-output';
import { parseResult, clearDiagrams } from '../../helpers';

describe('list_dmn_variables', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('lists variables from a new diagram', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({ name: 'Test' }));
    const res = parseResult(await handleListVariables({ diagramId }));

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

    const res = parseResult(await handleListVariables({ diagramId }));

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
    await handleAddInput({
      diagramId,
      decisionId: 'Decision_1',
      label: 'Age',
      expressionText: 'age',
      typeRef: 'integer',
    });

    // Add a named output column
    await handleAddOutput({
      diagramId,
      decisionId: 'Decision_1',
      name: 'discount',
      label: 'Discount',
      typeRef: 'double',
    });

    const res = parseResult(await handleListVariables({ diagramId }));

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
    await expect(handleListVariables({ diagramId: 'nonexistent' })).rejects.toThrow(/not found/i);
  });
});
