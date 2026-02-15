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

// ── Batch operations pattern text builders ─────────────────────────────────

function batchDecisionTablePattern(): string {
  return (
    `## Pattern: Create a complete decision table in one batch call\n\n` +
    `Use \`batch_dmn_operations\` to add columns, set hit policy, and add rules\n` +
    `in a single round-trip after creating the diagram:\n\n` +
    '```json\n' +
    `{\n` +
    `  "operations": [\n` +
    `    { "tool": "add_dmn_column", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "columnType": "input", "label": "Customer Type",\n` +
    `        "expressionText": "customerType", "typeRef": "string",\n` +
    `        "allowedValues": "\\"gold\\",\\"silver\\",\\"bronze\\"" } },\n` +
    `    { "tool": "add_dmn_column", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "columnType": "input", "label": "Order Amount",\n` +
    `        "expressionText": "orderAmount", "typeRef": "integer" } },\n` +
    `    { "tool": "add_dmn_column", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "columnType": "output", "label": "Discount",\n` +
    `        "name": "discount", "typeRef": "integer" } },\n` +
    `    { "tool": "set_dmn_element_properties", "args": {\n` +
    `        "diagramId": "<id>", "elementId": "Decision_1",\n` +
    `        "properties": { "hitPolicy": "FIRST" } } },\n` +
    `    { "tool": "add_dmn_rule", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "inputEntries": ["\\"gold\\"", ">= 1000"],\n` +
    `        "outputEntries": ["15"] } },\n` +
    `    { "tool": "add_dmn_rule", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "inputEntries": ["\\"gold\\"", "< 1000"],\n` +
    `        "outputEntries": ["10"] } },\n` +
    `    { "tool": "add_dmn_rule", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "inputEntries": ["\\"silver\\"", ""],\n` +
    `        "outputEntries": ["5"] } },\n` +
    `    { "tool": "add_dmn_rule", "args": {\n` +
    `        "diagramId": "<id>", "decisionId": "Decision_1",\n` +
    `        "inputEntries": ["", ""],\n` +
    `        "outputEntries": ["0"],\n` +
    `        "description": "Default: no discount" } }\n` +
    `  ]\n` +
    `}\n` +
    '```\n\n' +
    `**Key points:**\n` +
    `- Add columns before rules (rules reference existing column count)\n` +
    `- All operations share the same diagramId\n` +
    `- On error the entire batch is rolled back (default \`stopOnError: true\`)`
  );
}

function batchDrdPattern(): string {
  return (
    `## Pattern: Build a DRD with multiple elements and connections\n\n` +
    `Create input data, decisions, and their connections in one batch:\n\n` +
    '```json\n' +
    `{\n` +
    `  "operations": [\n` +
    `    { "tool": "add_dmn_element", "args": {\n` +
    `        "diagramId": "<id>", "elementType": "dmn:InputData",\n` +
    `        "name": "Applicant Age" } },\n` +
    `    { "tool": "add_dmn_element", "args": {\n` +
    `        "diagramId": "<id>", "elementType": "dmn:InputData",\n` +
    `        "name": "Credit Score" } },\n` +
    `    { "tool": "add_dmn_element", "args": {\n` +
    `        "diagramId": "<id>", "elementType": "dmn:Decision",\n` +
    `        "name": "Risk Level" } },\n` +
    `    { "tool": "connect_dmn_elements", "args": {\n` +
    `        "diagramId": "<id>",\n` +
    `        "sourceElementId": "<applicantAge_id>",\n` +
    `        "targetElementId": "<riskLevel_id>" } },\n` +
    `    { "tool": "connect_dmn_elements", "args": {\n` +
    `        "diagramId": "<id>",\n` +
    `        "sourceElementId": "<creditScore_id>",\n` +
    `        "targetElementId": "<riskLevel_id>" } },\n` +
    `    { "tool": "layout_dmn_diagram", "args": {\n` +
    `        "diagramId": "<id>" } }\n` +
    `  ]\n` +
    `}\n` +
    '```\n\n' +
    `**Tips:**\n` +
    `- Element IDs are returned in each operation result — use them for connections\n` +
    `- Call \`layout_dmn_diagram\` at the end to auto-arrange all elements\n` +
    `- Use \`afterElementId\` in \`add_dmn_element\` to position relative to existing elements`
  );
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
              `2. **Set hit policy**: Use \`set_dmn_element_properties\` with \`{ hitPolicy: "..." }\` — choose the appropriate policy:\n` +
              `   - UNIQUE (default): exactly one rule matches\n` +
              `   - FIRST: first matching rule wins (order matters)\n` +
              `   - PRIORITY: highest priority output wins\n` +
              `   - ANY: all matching rules must agree\n` +
              `   - COLLECT: collect all matching outputs (with optional aggregation: SUM, MIN, MAX, COUNT)\n` +
              `   - RULE ORDER: return all matches in rule order\n` +
              `3. **Add input columns**: Use \`add_dmn_column\` with columnType="input" for each input variable.\n` +
              `   Set the expressionText (FEEL), label, and typeRef (string, integer, double, boolean, date).\n` +
              `4. **Add output columns**: Use \`add_dmn_column\` with columnType="output" for each output variable.\n` +
              `   Set the name, label, and typeRef.\n` +
              `5. **Add rules**: Use \`add_dmn_rule\` to add decision rules.\n` +
              `   Each rule has input entries (FEEL unary tests) and output entries.\n` +
              `   Common input patterns: \`"Premium"\`, \`>= 1000\`, \`[100..500]\`, \`not("Basic")\`\n` +
              `6. **Validate**: Use \`summarize_dmn_diagram\` to check structure and issues\n` +
              `7. **Export**: Use \`export_dmn\` with a \`filePath\` to write the final DMN XML to disk`,
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
              `   - Build a decision table (add_dmn_column, add_dmn_rule)\n` +
              `   - Set a literal expression (set_dmn_literal_expression)\n` +
              `6. **Review & validate**: Use \`summarize_dmn_diagram\` to verify structure and check for issues\n` +
              `7. **Export**: Use \`export_dmn\` with a \`filePath\` to write the final DMN XML to disk\n\n` +
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
    name: 'batch-operations-patterns',
    title: 'Batch DMN operations patterns',
    description:
      'Common multi-step DMN patterns using batch_dmn_operations. Shows how to create a ' +
      'complete decision table, build a DRD, or set up columns and rules in a single call.',
    arguments: [
      {
        name: 'pattern',
        description: 'Which pattern to show: "decision-table", "drd", or "all" (default: "all")',
        required: false,
      },
    ],
    getMessages: (args) => {
      const pattern = args.pattern || 'all';
      const sections: string[] = [];
      if (pattern === 'all' || pattern === 'decision-table') {
        sections.push(batchDecisionTablePattern());
      }
      if (pattern === 'all' || pattern === 'drd') {
        sections.push(batchDrdPattern());
      }

      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `# Batch DMN Operations Patterns\n\n` +
              `Use \`batch_dmn_operations\` to combine multiple DMN tool calls into a single ` +
              `request. This reduces round-trips and provides atomic rollback on failure.\n\n` +
              sections.join('\n\n'),
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
              `5. **Validate**: Use \`summarize_dmn_diagram\` to check for issues\n\n` +
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
