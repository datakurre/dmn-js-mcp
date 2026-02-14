/**
 * Handler for validate_dmn_feel_expression tool.
 *
 * Uses the `feelin` library to parse and validate FEEL expressions,
 * returning syntax errors if any.
 */

import { type ToolResult } from '../../types';
import { jsonResult, validateArgs } from '../helpers';

export interface ValidateFeelArgs {
  expression: string;
  context?: string;
}

export async function handleValidateFeelExpression(args: ValidateFeelArgs): Promise<ToolResult> {
  validateArgs(args, ['expression']);
  const { expression, context } = args;

  try {
    // Dynamic import of feelin — the FEEL parser
    const feelin = await import('feelin');
    const parseUnaryTests = feelin.parseUnaryTests;
    const parseExpression = feelin.parseExpression;

    let tree: any;
    if (context === 'unaryTests' && parseUnaryTests) {
      tree = parseUnaryTests(expression, {}, undefined);
    } else if (parseExpression) {
      tree = parseExpression(expression, {}, undefined);
    } else {
      return jsonResult({
        success: false,
        valid: false,
        expression,
        error: 'feelin parser not available',
        message: 'Could not load feelin FEEL parser.',
      });
    }

    // feelin throws SyntaxError on invalid input; if we reach here it parsed OK
    // But also check if the tree has an error property
    if (tree && tree.error) {
      return jsonResult({
        success: true,
        valid: false,
        expression,
        error: tree.error,
        message: `FEEL expression has syntax error: ${tree.error}`,
      });
    }

    return jsonResult({
      success: true,
      valid: true,
      expression,
      message: `FEEL expression is syntactically valid: "${expression}"`,
    });
  } catch (err: any) {
    return jsonResult({
      success: true,
      valid: false,
      expression,
      error: err.message || String(err),
      message: `FEEL expression failed to parse: ${err.message || err}`,
    });
  }
}

export const TOOL_DEFINITION = {
  name: 'validate_dmn_feel_expression',
  description:
    'Validate a FEEL (Friendly Enough Expression Language) expression for syntax errors. ' +
    'Uses the feelin parser to check if the expression is syntactically valid.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The FEEL expression to validate',
      },
      context: {
        type: 'string',
        enum: ['expression', 'unaryTests'],
        description:
          "Parse context. 'expression' for general FEEL expressions, " +
          "'unaryTests' for decision table input entry expressions. Default: 'expression'",
      },
    },
    required: ['expression'],
  },
} as const;
