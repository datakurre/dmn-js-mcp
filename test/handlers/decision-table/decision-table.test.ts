import { describe, test, expect, beforeEach } from 'vitest';
import { handleGetDecisionLogic, handleSetProperties, handleAddRule } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('decision table tools', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  describe('get_dmn_decision_logic (decision table)', () => {
    test('returns the decision table for Decision_1', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1' })
      );
      expect(res.success).toBe(true);
      expect(res.decisionId).toBe('Decision_1');
      expect(res.decisionLogicType).toBe('dmn:DecisionTable');
      expect(res.inputs).toBeDefined();
      expect(res.outputs).toBeDefined();
      expect(res.rules).toBeDefined();
    });

    test('throws for unknown decision', async () => {
      const { diagramId } = await createDiagram();
      await expect(
        handleGetDecisionLogic({ diagramId, decisionId: 'nonexistent' })
      ).rejects.toThrow();
    });
  });

  describe('set_dmn_element_properties (hit policy)', () => {
    test('sets hit policy to COLLECT', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleSetProperties({
          diagramId,
          elementId: 'Decision_1',
          properties: { hitPolicy: 'COLLECT' },
        })
      );
      expect(res.success).toBe(true);

      // Verify by reading back
      const logic = parseResult(
        await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1' })
      );
      expect(logic.hitPolicy).toBe('COLLECT');
    });

    test('throws for invalid hit policy', async () => {
      const { diagramId } = await createDiagram();
      await expect(
        handleSetProperties({
          diagramId,
          elementId: 'Decision_1',
          properties: { hitPolicy: 'BOGUS' },
        })
      ).rejects.toThrow();
    });
  });

  describe('add_dmn_rule', () => {
    test('adds a rule to the decision table', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(await handleAddRule({ diagramId, decisionId: 'Decision_1' }));
      expect(res.success).toBe(true);
      expect(res.ruleIndex).toBeDefined();
    });

    test('adds a rule with inline columns', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleAddRule({
          diagramId,
          decisionId: 'Decision_1',
          columns: [
            {
              columnType: 'input',
              label: 'Customer Type',
              expressionText: 'customerType',
              typeRef: 'string',
            },
            {
              columnType: 'input',
              label: 'Order Amount',
              expressionText: 'orderAmount',
              typeRef: 'integer',
            },
            {
              columnType: 'output',
              label: 'Discount',
              name: 'discount',
              typeRef: 'integer',
            },
          ],
          inputEntries: ['', '"gold"', '>= 1000'],
          outputEntries: ['', '15'],
        })
      );
      expect(res.success).toBe(true);
      expect(res.createdColumns).toHaveLength(3);
      expect(res.createdColumns[0].columnType).toBe('input');
      expect(res.createdColumns[2].columnType).toBe('output');
      // Default table has 1 input + 1 output already; we added 2 inputs + 1 output
      expect(res.inputEntries).toHaveLength(3);
      expect(res.outputEntries).toHaveLength(2);

      // Verify via get_dmn_decision_logic
      const logic = parseResult(
        await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1' })
      );
      expect(logic.inputs).toHaveLength(3);
      expect(logic.outputs).toHaveLength(2);
      expect(logic.rules).toHaveLength(1);
    });

    test('inline columns with allowedValues', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleAddRule({
          diagramId,
          decisionId: 'Decision_1',
          columns: [
            {
              columnType: 'input',
              label: 'Status',
              expressionText: 'status',
              allowedValues: '"active","inactive"',
            },
            { columnType: 'output', label: 'Result', name: 'result' },
          ],
          inputEntries: ['"active"'],
          outputEntries: ['"approved"'],
        })
      );
      expect(res.success).toBe(true);
      expect(res.createdColumns).toHaveLength(2);
    });
  });
});
