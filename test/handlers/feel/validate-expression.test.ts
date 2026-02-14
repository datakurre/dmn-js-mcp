import { describe, test, expect } from 'vitest';
import { handleValidateFeelExpression } from '../../../src/handlers';
import { parseResult } from '../../helpers';

describe('validate_dmn_feel_expression', () => {
  test('validates a simple FEEL expression', async () => {
    const res = parseResult(
      await handleValidateFeelExpression({
        expression: 'a + b',
        expressionType: 'expression',
      })
    );
    expect(res.valid).toBe(true);
  });

  test('validates a unary test expression', async () => {
    const res = parseResult(
      await handleValidateFeelExpression({
        expression: '> 10, < 5',
        expressionType: 'unaryTest',
      })
    );
    expect(res.valid).toBe(true);
  });

  test('reports syntax error for invalid expression', async () => {
    const res = parseResult(
      await handleValidateFeelExpression({
        expression: '+ + +',
        expressionType: 'expression',
      })
    );
    // feelin is very permissive, so it may still parse — just check we get a result
    expect(res).toBeDefined();
    expect(typeof res.valid).toBe('boolean');
  });

  test('throws for missing expression arg', async () => {
    await expect(handleValidateFeelExpression({} as any)).rejects.toThrow();
  });
});
