import { describe, test, expect, beforeEach } from 'vitest';
import { handleGetDecisionTable, handleSetHitPolicy, handleAddRule } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('decision table tools', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  describe('get_dmn_decision_table', () => {
    test('returns the decision table for Decision_1', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleGetDecisionTable({ diagramId, decisionId: 'Decision_1' })
      );
      expect(res.success).toBe(true);
      expect(res.decisionId).toBe('Decision_1');
      expect(res.inputs).toBeDefined();
      expect(res.outputs).toBeDefined();
      expect(res.rules).toBeDefined();
    });

    test('throws for unknown decision', async () => {
      const { diagramId } = await createDiagram();
      await expect(
        handleGetDecisionTable({ diagramId, decisionId: 'nonexistent' })
      ).rejects.toThrow();
    });
  });

  describe('set_dmn_hit_policy', () => {
    test('sets hit policy to COLLECT', async () => {
      const { diagramId } = await createDiagram();
      const res = parseResult(
        await handleSetHitPolicy({
          diagramId,
          decisionId: 'Decision_1',
          hitPolicy: 'COLLECT',
        })
      );
      expect(res.success).toBe(true);
      expect(res.hitPolicy).toBe('COLLECT');
    });

    test('throws for invalid hit policy', async () => {
      const { diagramId } = await createDiagram();
      await expect(
        handleSetHitPolicy({
          diagramId,
          decisionId: 'Decision_1',
          hitPolicy: 'BOGUS' as any,
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
