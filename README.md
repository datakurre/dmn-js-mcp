# dmn-js-mcp

MCP (Model Context Protocol) server for creating and manipulating DMN (Decision Model and Notation) diagrams using AI assistants.

Uses [dmn-js](https://github.com/bpmn-io/dmn-js) running headlessly via jsdom to produce valid DMN 1.3 XML and SVG output. Integrates [feelin](https://github.com/nikku/feelin) for FEEL expression parsing and [camunda-dmn-moddle](https://github.com/camunda/camunda-dmn-moddle) for Camunda extension support.

## Features

### 18 MCP Tools

| Category           | Tools                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Core**           | `create_dmn_diagram`, `export_dmn`, `delete_dmn_diagram`, `summarize_dmn_diagram`, `dmn_history`, `batch_dmn_operations` |
| **Layout**         | `layout_dmn_diagram`                                                                                                     |
| **DRD Elements**   | `add_dmn_element`, `connect_dmn_elements`, `delete_dmn_element`, `list_dmn_elements`, `set_dmn_element_properties`       |
| **Decision Table** | `get_dmn_decision_logic`, `add_dmn_column`, `add_dmn_rule`, `edit_dmn_cell`                                              |
| **Literal Expr.**  | `set_dmn_literal_expression`                                                                                             |
| **FEEL**           | `validate_dmn_feel_expression`                                                                                           |

### DRD (Decision Requirements Diagram)

- Create, import, and delete DMN diagrams
- Add DRD elements: Decision, Input Data, Business Knowledge Model, Knowledge Source, Text Annotation
- Connect elements: Information Requirement, Knowledge Requirement, Authority Requirement, Association
- Auto-layout via ELK (Sugiyama layered algorithm)
- Export DMN XML and SVG
- Undo/redo via command stack history

### Decision Tables

- Add/remove input and output columns (unified `add_dmn_column`)
- Add/remove rules (rows)
- Set hit policy (UNIQUE, FIRST, PRIORITY, ANY, COLLECT, RULE ORDER, OUTPUT ORDER)
- Edit individual cell entries with FEEL expressions
- Analyze decision tables for completeness

### FEEL Expressions

- Parse and validate FEEL expressions via feelin
- Set literal expressions on decisions

### Batch Operations

- Combine multiple tool calls into a single atomic request
- Automatic rollback on failure

### MCP Resources

- `dmn://diagrams` — list all in-memory diagrams
- `dmn://diagram/{id}/summary` — lightweight diagram summary
- `dmn://diagram/{id}/validate` — structural validation
- `dmn://diagram/{id}/variables` — input/output variable inventory
- `dmn://diagram/{id}/xml` — current DMN XML

### MCP Prompts

- `create-decision-table` — step-by-step decision table workflow
- `create-decision-requirements-diagram` — DRD construction guide
- `batch-operations-patterns` — common batch operation recipes
- `add-camunda-properties` — Camunda 7 configuration guide

### Camunda 7 Support

- Camunda-specific DMN attributes via camunda-dmn-moddle (historyTimeToLive, versionTag)
- Extension properties on decisions and definitions
- Input/output variable name mapping

### Library Mode

Import `dmn-js-mcp` as a library to integrate with other MCP servers:

```typescript
import { dmnModule } from 'dmn-js-mcp';
const modules: ToolModule[] = [bpmnModule, dmnModule];
```

## Quick Start

```bash
npm install
npm run build
npm start
```

### Claude Desktop / Cursor / Windsurf

Add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dmn": {
      "command": "npx",
      "args": ["dmn-js-mcp"]
    }
  }
}
```

### VS Code MCP Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "dmn": {
      "command": "npx",
      "args": ["dmn-js-mcp"]
    }
  }
}
```

With persistence:

```json
{
  "servers": {
    "dmn": {
      "command": "npx",
      "args": ["dmn-js-mcp", "--persist-dir", "./diagrams"]
    }
  }
}
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Bundle with esbuild
npm run typecheck    # Type-check with tsc
npm run lint         # Lint with ESLint
npm test             # Run tests
npm run watch        # Rebuild on changes
npm run dev          # Watch + auto-restart via nodemon
```

Or use `make`:

```bash
make help            # List all targets
make install build   # Install and build
make check           # Typecheck + lint
make test            # Run tests
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full module dependency diagram.

**Key libraries:**

- **dmn-js** — DMN modeler (DRD, decision table, literal expression editors)
- **dmn-moddle** — DMN 1.3 XML read/write
- **camunda-dmn-moddle** — Camunda namespace extensions
- **feelin** — FEEL expression parser and interpreter
- **elkjs** — Automatic DRD layout (Sugiyama layered algorithm)
- **jsdom** — Headless browser environment

## License

[MIT](LICENSE)
