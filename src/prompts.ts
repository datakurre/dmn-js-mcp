/**
 * MCP Prompts — reusable modeling workflows and recipes for DMN.
 *
 * Provides step-by-step instructions for common DMN modeling patterns.
 * These prompts guide AI callers through multi-tool workflows, reducing
 * improvisation and ensuring correct DMN semantics.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/** Reusable interface for prompt definitions. */
export interface PromptDefinition {
  name: string;
  title: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  getMessages: (
    args: Record<string, string>
  ) => Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>;
}

const PROMPTS: PromptDefinition[] = [
  {
    name: 'create-decision-table',
    title: 'Create a DMN decision table',
    description:
      'Step-by-step guide to create a complete DMN decision table with inputs, outputs, ' +
      'hit policy, and rules. Includes guidance on FEEL expressions and type references.',
    arguments: [
      {
        name: 'decisionName',
        description: 'Name for the decision (e.g. "Determine Discount")',
        required: true,
      },
      {
        name: 'description',
        description:
          'Brief description of what the decision should do ' +
          '(e.g. "Calculate discount percentage based on customer type and order amount")',
        required: false,
      },
    ],
    getMessages: (args) => {
      const name = args.decisionName || 'My Decision';
      const desc = args.description ? `\n\nDecision description: ${args.description}` : '';
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Create a DMN decision table called "${name}".${desc}\n\n` +
              `Follow these steps:\n\n` +
              `1. **Create diagram**: Use \`create_dmn_diagram\` with name "${name}"\n` +
              `2. **Set hit policy**: Use \`set_dmn_hit_policy\` — choose the appropriate policy:\n` +
              `   - UNIQUE (default): exactly one rule matches\n` +
              `   - FIRST: first matching rule wins (order matters)\n` +
              `   - PRIORITY: highest priority output wins\n` +
              `   - ANY: all matching rules must agree\n` +
              `   - COLLECT: collect all matching outputs (with optional aggregation: SUM, MIN, MAX, COUNT)\n` +
              `   - RULE ORDER: return all matches in rule order\n` +
              `3. **Add input columns**: Use \`add_dmn_input\` for each input variable.\n` +
              `   Set the expression (FEEL), label, and typeRef (string, integer, double, boolean, date).\n` +
              `4. **Add output columns**: Use \`add_dmn_output\` for each output variable.\n` +
              `   Set the name, label, and typeRef.\n` +
              `5. **Add rules**: Use \`add_dmn_rule\` to add decision rules.\n` +
              `   Each rule has input entries (FEEL unary tests) and output entries.\n` +
              `   Common input patterns: \`"Premium"\`, \`>= 1000\`, \`[100..500]\`, \`not("Basic")\`\n` +
              `6. **Validate**: Use \`validate_dmn_diagram\` to check for issues\n` +
              `7. **Export**: Use \`export_dmn\` to get the final DMN XML`,
          },
        },
      ];
    },
  },
  {
    name: 'create-decision-requirements-diagram',
    title: 'Create a Decision Requirements Diagram',
    description:
      'Step-by-step guide to create a DRD with multiple connected decisions, inputs, ' +
      'and knowledge sources. Covers the full decision model lifecycle.',
    arguments: [
      {
        name: 'diagramName',
        description: 'Name for the DRD (e.g. "Loan Application")',
        required: true,
      },
      {
        name: 'decisions',
        description:
          'Comma-separated list of decisions (e.g. "Assess Risk, Determine Rate, Final Decision")',
        required: true,
      },
    ],
    getMessages: (args) => {
      const name = args.diagramName || 'My DRD';
      const decisions = args.decisions
        ? args.decisions.split(',').map((d) => d.trim())
        : ['Decision A', 'Decision B'];
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Create a Decision Requirements Diagram called "${name}" with these decisions: ${decisions.join(', ')}.\n\n` +
              `Follow these steps:\n\n` +
              `1. **Create diagram**: Use \`create_dmn_diagram\` with name "${name}"\n` +
              `2. **Add decisions**: Use \`add_dmn_element\` with type "dmn:Decision" for each:\n` +
              decisions.map((d) => `   - "${d}"`).join('\n') +
              `\n` +
              `3. **Add input data**: Use \`add_dmn_element\` with type "dmn:InputData" for each\n` +
              `   piece of input data that feeds into the decisions.\n` +
              `4. **Connect elements**: Use \`connect_dmn_elements\` to create requirements:\n` +
              `   - Information Requirements: InputData → Decision, or Decision → Decision\n` +
              `   - Knowledge Requirements: BKM → Decision\n` +
              `   - Authority Requirements: KnowledgeSource → Decision\n` +
              `5. **Add decision logic**: For each decision, either:\n` +
              `   - Build a decision table (add_dmn_input, add_dmn_output, add_dmn_rule)\n` +
              `   - Set a literal expression (set_dmn_literal_expression)\n` +
              `6. **Validate**: Use \`validate_dmn_diagram\` to check for issues\n` +
              `7. **Review**: Use \`summarize_dmn_diagram\` to verify the structure\n` +
              `8. **Export**: Use \`export_dmn\` to get the final DMN XML\n\n` +
              `**Best practices:**\n` +
              `- Every Decision should have at least one incoming requirement\n` +
              `- InputData elements are leaf nodes (no incoming, only outgoing)\n` +
              `- Name elements clearly with business terminology\n` +
              `- Use BKMs for reusable decision logic`,
          },
        },
      ];
    },
  },
  {
    name: 'add-camunda-properties',
    title: 'Add Camunda 7 execution properties',
    description:
      'Configure DMN decisions for Camunda 7 / Operaton execution. Covers history TTL, ' +
      'version tags, and decision result mapping for call activities.',
    arguments: [
      {
        name: 'diagramId',
        description: 'The diagram ID',
        required: true,
      },
    ],
    getMessages: (args) => {
      const diagramId = args.diagramId || '<diagramId>';
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Configure diagram "${diagramId}" for Camunda 7 / Operaton execution.\n\n` +
              `Follow these steps:\n\n` +
              `1. **Review diagram**: Use \`summarize_dmn_diagram\` to see all decisions\n` +
              `2. **Set history TTL**: Use \`set_dmn_element_properties\` on each Decision to set:\n` +
              `   - \`camunda:historyTimeToLive\`: "P30D" (or appropriate retention period)\n` +
              `3. **Set version tag** (optional): Use \`set_dmn_element_properties\` to set:\n` +
              `   - \`camunda:versionTag\`: version identifier for deployment management\n` +
              `4. **Configure inputs**: Ensure all input expressions match the variable names\n` +
              `   that will be provided by the calling BPMN process or API.\n` +
              `5. **Validate**: Use \`validate_dmn_diagram\` to check for issues\n\n` +
              `**Camunda 7 integration notes:**\n` +
              `- Business Rule Tasks in BPMN reference decisions by \`decisionRef\` (the decision ID)\n` +
              `- \`mapDecisionResult\` controls how results map to process variables:\n` +
              `  - singleEntry: single value from first rule/first output\n` +
              `  - singleResult: map of output names → values from first rule\n` +
              `  - collectEntries: list of single output values from all rules\n` +
              `  - resultList: list of maps from all matching rules\n` +
              `- Input variables come from process variables with matching names`,
          },
        },
      ];
    },
  },
];

/** List all available prompts. */
export function listPrompts(): Array<{
  name: string;
  title: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
}> {
  return PROMPTS.map((p) => ({
    name: p.name,
    title: p.title,
    description: p.description,
    arguments: p.arguments,
  }));
}

/** Get a specific prompt by name, with argument substitution. */
export function getPrompt(
  name: string,
  args: Record<string, string> = {}
): {
  description: string;
  messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>;
} {
  const prompt = PROMPTS.find((p) => p.name === name);
  if (!prompt) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  }
  return {
    description: prompt.description,
    messages: prompt.getMessages(args),
  };
}
