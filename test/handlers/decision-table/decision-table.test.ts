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
  });
});
