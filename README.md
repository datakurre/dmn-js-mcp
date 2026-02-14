# dmn-js-mcp

MCP (Model Context Protocol) server for creating and manipulating DMN (Decision Model and Notation) diagrams using AI assistants.

Uses [dmn-js](https://github.com/bpmn-io/dmn-js) running headlessly via jsdom to produce valid DMN 1.3 XML and SVG output. Integrates [feelin](https://github.com/nikku/feelin) for FEEL expression parsing and [camunda-dmn-moddle](https://github.com/camunda/camunda-dmn-moddle) for Camunda extension support.

> **Status:** Early development — see [TODO.md](TODO.md) for the implementation roadmap.

## Features (Planned)

### DRD (Decision Requirements Diagram)

- Create/delete/clone DMN diagrams
- Add DRD elements: Decision, Input Data, Business Knowledge Model, Knowledge Source, Text Annotation
- Connect elements: Information Requirement, Knowledge Requirement, Authority Requirement, Association
- Auto-layout via ELK (Sugiyama layered algorithm)
- Export DMN XML and SVG

### Decision Tables

- Add/remove input and output columns
- Add/remove rules (rows)
- Set hit policy (UNIQUE, FIRST, PRIORITY, ANY, COLLECT, RULE ORDER, OUTPUT ORDER)
- Update individual cell entries (input entries as UnaryTests, output entries as LiteralExpression)

### FEEL Expressions

- Parse and validate FEEL expressions via feelin
- Set literal expressions on decisions
- Extract variable references from FEEL expressions

### Camunda 7 Support

- Camunda-specific DMN attributes via camunda-dmn-moddle
- Input/output variable name mapping

## Quick Start

```bash
npm install
npm run build
npm start
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
