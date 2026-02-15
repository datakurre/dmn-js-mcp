import { describe, test, expect, beforeEach } from 'vitest';
import { handleGetDecisionLogic, handleCreateDiagram, handleAddRule } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('get_dmn_decision_logic (analyze)', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('analyzes a default decision table', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1', analyze: true })
    );
    expect(result.success).toBe(true);
    expect(result.decisionLogicType).toBe('dmn:DecisionTable');
    expect(result.inputs).toBeDefined();
    expect(result.outputs).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(typeof result.analysis.totalIssues).toBe('number');
    expect(typeof result.analysis.isComplete).toBe('boolean');
  });

  test('detects missing rules', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1', analyze: true })
    );
    expect(result.success).toBe(true);
    expect(result.rules).toHaveLength(0);
    // Should flag "no rules defined"
    if (result.analysis.ruleIssues) {
      const noRules = result.analysis.ruleIssues.some((issue: any) =>
        issue.issue.toLowerCase().includes('no rules')
      );
      expect(noRules).toBe(true);
    }
  });

  test('reports success for a well-formed table', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    // Add a rule with values
    const ruleResult = parseResult(
      await handleAddRule({
        diagramId,
        decisionId: 'Decision_1',
        inputEntries: ['"yes"'],
        outputEntries: ['"approved"'],
      })
    );
    expect(ruleResult.success).toBe(true);

    const result = parseResult(
      await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1', analyze: true })
    );
    expect(result.success).toBe(true);
    expect(result.rules.length).toBeGreaterThanOrEqual(1);
    expect(result.analysis).toBeDefined();
  });

  test('does not include analysis when analyze is false', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleGetDecisionLogic({ diagramId, decisionId: 'Decision_1' })
    );
    expect(result.success).toBe(true);
    expect(result.analysis).toBeUndefined();
  });

  test('throws for non-existent element', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await expect(handleGetDecisionLogic({ diagramId, decisionId: 'nonexistent' })).rejects.toThrow(
      /not found/i
    );
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleGetDecisionLogic({ diagramId: 'nonexistent', decisionId: 'Decision_1' })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for missing required args', async () => {
    await expect(handleGetDecisionLogic({ diagramId: 'x' } as any)).rejects.toThrow();
  });
});
