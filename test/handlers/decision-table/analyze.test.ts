import { describe, test, expect, beforeEach } from 'vitest';
import {
  handleAnalyzeDecisionTable,
  handleCreateDiagram,
  handleAddRule,
} from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';

describe('analyze_dmn_decision_table', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('analyzes a default decision table', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleAnalyzeDecisionTable({ diagramId, decisionId: 'Decision_1' })
    );
    expect(result.success).toBe(true);
    expect(result.hasDecisionTable).not.toBe(false);
    expect(result.inputCount).toBeGreaterThanOrEqual(1);
    expect(result.outputCount).toBeGreaterThanOrEqual(1);
    expect(typeof result.totalIssues).toBe('number');
    expect(typeof result.isComplete).toBe('boolean');
  });

  test('detects missing rules', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    const result = parseResult(
      await handleAnalyzeDecisionTable({ diagramId, decisionId: 'Decision_1' })
    );
    expect(result.success).toBe(true);
    expect(result.ruleCount).toBe(0);
    // Should flag "no rules defined"
    if (result.ruleIssues) {
      const noRules = result.ruleIssues.some((issue: any) =>
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
      await handleAnalyzeDecisionTable({ diagramId, decisionId: 'Decision_1' })
    );
    expect(result.success).toBe(true);
    expect(result.ruleCount).toBeGreaterThanOrEqual(1);
  });

  test('throws for non-existent element', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));
    await expect(
      handleAnalyzeDecisionTable({ diagramId, decisionId: 'nonexistent' })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for unknown diagram', async () => {
    await expect(
      handleAnalyzeDecisionTable({ diagramId: 'nonexistent', decisionId: 'Decision_1' })
    ).rejects.toThrow(/not found/i);
  });

  test('throws for missing required args', async () => {
    await expect(handleAnalyzeDecisionTable({ diagramId: 'x' } as any)).rejects.toThrow();
  });
});
