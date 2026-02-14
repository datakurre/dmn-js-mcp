# AGENTS.md

## Project Overview

MCP (Model Context Protocol) server that lets AI assistants create and manipulate DMN (Decision Model and Notation) diagrams. Uses `dmn-js` running headlessly via `jsdom` to produce valid DMN XML and SVG output. Supports DRD (Decision Requirements Diagram) editing, decision table manipulation, literal expressions, and FEEL expression parsing via `feelin`.

## DMN File Editing Policy

**When working with `.dmn` files, always use the DMN MCP tools instead of editing DMN XML directly.** The MCP tools ensure valid DMN 1.3 structure, proper diagram layout coordinates, and semantic correctness that hand-editing XML cannot guarantee.

- **To modify an existing `.dmn` file:** use `import_dmn_xml` to load it, make changes with MCP tools, then `export_dmn` and write the result back.
- **To create a new diagram:** use `create_dmn_diagram`, build it with DRD and decision table tools, then `export_dmn`.
- **Never** use `replace_string_in_file` or other text-editing tools on `.dmn` XML.

## Tech Stack

- **Language:** TypeScript (ES2022, CommonJS)
- **Runtime:** Node.js ≥ 16
- **Key deps:** `@modelcontextprotocol/sdk`, `dmn-js`, `dmn-moddle`, `camunda-dmn-moddle`, `feelin`, `jsdom`, `elkjs`
- **Test:** Vitest
- **Lint:** ESLint 9 + typescript-eslint 8
- **Dev env:** Nix (devenv) with devcontainer support

## DMN-JS examples

- https://github.com/bpmn-io/dmn-js
- https://github.com/bpmn-io/dmn-js-examples
- https://github.com/nikku/feelin
- https://forum.bpmn.io/search?q=dmn

## Architecture

Modular `src/` layout, communicates over **stdio** using the MCP SDK. See [`docs/architecture.md`](docs/architecture.md) for a full dependency diagram and module boundary rules.

| File / Directory            | Responsibility                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/index.ts`              | Entry point — wires MCP server, transport, and tool modules                                       |
| `src/module.ts`             | Generic `ToolModule` interface for pluggable editor back-ends (BPMN, DMN, Forms, …)               |
| `src/dmn-module.ts`         | DMN tool module — registers DMN tools and dispatch with the generic server                        |
| `src/types.ts`              | Shared interfaces (`DiagramState`, `ToolResult`, `DmnModeler`, `DmnViewType`)                     |
| `src/dmn-types.ts`          | TypeScript interfaces for dmn-js DRD services (`Modeling`, `ElementRegistry`, `DrdFactory`, etc.) |
| `src/constants.ts`          | Centralised magic numbers (`STANDARD_DMN_GAP`, `ELEMENT_SIZES` for DRD elements)                  |
| `src/headless-canvas.ts`    | jsdom setup, lazy `DmnModeler` init                                                               |
| `src/headless-polyfills.ts` | SVG/CSS polyfills for headless dmn-js (SVGMatrix, getBBox, transform with DOM sync, etc.)         |
| `src/headless-bbox.ts`      | Element-type-aware bounding box estimation                                                        |
| `src/diagram-manager.ts`    | In-memory `Map<string, DiagramState>` store, modeler creation helpers                             |
| `src/tool-definitions.ts`   | Thin barrel collecting co-located `TOOL_DEFINITION` exports from handlers                         |
| `src/handlers/index.ts`     | Handler barrel + `dispatchToolCall` router + unified TOOL_REGISTRY                                |
| `src/errors.ts`             | Machine-readable error codes and McpError factory functions                                       |
| `src/persistence.ts`        | Optional file-backed diagram persistence — auto-save to `.dmn` files, load on startup             |
| `src/shared/index.ts`       | Cross-cutting type re-export barrel                                                               |

**Core pattern:**

1. A shared `jsdom` instance polyfills browser APIs (SVG, CSS, structuredClone) so `dmn-js` can run headlessly.
2. Diagrams are stored in-memory in a `Map<string, DiagramState>` keyed by generated IDs.
3. MCP tools are exposed for DRD modelling, decision table editing, FEEL expression parsing, and diagram lifecycle management.
4. Each tool handler manipulates the `dmn-js` modeler API (DRD: `modeling`, `elementFactory`, `elementRegistry`; decision tables: moddle-first approach) and returns JSON or raw XML/SVG.
5. `camunda-dmn-moddle` is registered as a moddle extension, enabling Camunda-specific attributes.
6. Each handler file **co-locates** its MCP tool definition (`TOOL_DEFINITION`) alongside the handler function, preventing definition drift.

## DMN View Types

Unlike BPMN (single modeler view), DMN has multiple view types:

| View               | dmn-js package              | Purpose                             |
| ------------------ | --------------------------- | ----------------------------------- |
| DRD                | `dmn-js-drd`                | Decision Requirements Diagram graph |
| Decision Table     | `dmn-js-decision-table`     | Tabular decision logic              |
| Literal Expression | `dmn-js-literal-expression` | Single FEEL expression              |
| Boxed Expression   | `dmn-js-boxed-expression`   | Complex structured expressions      |

The DRD view uses `diagram-js` (same as bpmn-js), so headless polyfills are shared. Decision table and expression editors use `table-js` and may need different headless approaches.

## DRD Element Types

| DMN Element              | Type String                  | Default Size |
| ------------------------ | ---------------------------- | ------------ |
| Decision                 | `dmn:Decision`               | 180 × 80     |
| Input Data               | `dmn:InputData`              | 125 × 45     |
| Business Knowledge Model | `dmn:BusinessKnowledgeModel` | 135 × 46     |
| Knowledge Source         | `dmn:KnowledgeSource`        | 100 × 63     |
| Text Annotation          | `dmn:TextAnnotation`         | 100 × 30     |

## DRD Connection Types

| Connection              | Type String                  | From → To                         |
| ----------------------- | ---------------------------- | --------------------------------- |
| Information Requirement | `dmn:InformationRequirement` | Decision/InputData → Decision     |
| Knowledge Requirement   | `dmn:KnowledgeRequirement`   | BKM → Decision/BKM                |
| Authority Requirement   | `dmn:AuthorityRequirement`   | KnowledgeSource → Decision/BKM/KS |
| Association             | `dmn:Association`            | Any ↔ TextAnnotation              |

## Tool Naming Convention

**Every tool name includes `dmn`** to avoid collisions with other MCPs (e.g. bpmn-js-mcp).

Planned tool names (see TODO.md for full list):

- **DRD tools:** `create_dmn_diagram`, `add_dmn_drd_element`, `connect_dmn_elements`, `list_dmn_elements`, `delete_dmn_element`, `move_dmn_element`, `layout_dmn_diagram`
- **Decision Table tools:** `add_dmn_input_column`, `add_dmn_output_column`, `add_dmn_rule`, `update_dmn_rule_entry`, `set_dmn_hit_policy`
- **Expression tools:** `set_dmn_literal_expression`, `parse_dmn_feel_expression`
- **Lifecycle tools:** `export_dmn`, `import_dmn_xml`, `validate_dmn_diagram`, `list_dmn_diagrams`, `delete_dmn_diagram`

## Build & Run

```bash
npm install
npm run build      # esbuild → single dist/index.js bundle
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm start          # node dist/index.js (stdio)
npm run watch      # esbuild --watch
npm test           # vitest run
```

`make` targets mirror npm scripts — run `make help` to list them.

**Bundling:** esbuild bundles all source + `@modelcontextprotocol/sdk` + `camunda-dmn-moddle` into one CJS file. `jsdom`, `dmn-js`, `dmn-moddle`, `elkjs`, and `feelin` are externalised (remain in `node_modules`).

**Install from git:** `npm install github:<owner>/dmn-js-mcp` works — `prepare` triggers `npm run build`.

Output goes to `dist/`. Entry point is `dist/index.js` (also declared as the `dmn-js-mcp` bin).

## Testing

- **Framework:** Vitest (config in `vitest.config.ts`)
- **Location:** `test/handlers/<name>.test.ts` (per-handler), `test/tool-definitions.test.ts`, `test/diagram-manager.test.ts`
- **Shared helpers:** `test/helpers.ts` (`parseResult`, `createDiagram`, `importXml`, `clearDiagrams`)
- **Run:** `npm test` or `make test`

## Code Conventions

- Uses ES `import` throughout; esbuild converts to CJS for the bundle.
- `tsc` is used only for type-checking (`--noEmit`), esbuild for actual output.
- Tool responses use `{ content: [{ type: "text", text: ... }] }` MCP format.
- Tool definitions are co-located with their handler as `TOOL_DEFINITION` exports.
- `clearDiagrams()` exposed for test teardown.
- Runtime argument validation via `validateArgs()` in every handler that has required params.

## Architecture Decision Records

Individual ADRs are in [`agents/adrs/`](agents/adrs/):

- [ADR-001](agents/adrs/ADR-001-co-located-tool-definitions.md) — Co-located tool definitions
- [ADR-002](agents/adrs/ADR-002-dmn-in-tool-names.md) — All tool names include "dmn"
- [ADR-003](agents/adrs/ADR-003-export-lint-gate.md) — Implicit lint gate on export
- [ADR-004](agents/adrs/ADR-004-element-id-naming.md) — 2-part element ID naming

## Key Gotchas

- **Never write DMN XML or structured files via terminal commands.** Using `cat > file << EOF` or similar heredoc patterns can corrupt XML through terminal line wrapping. Always use `create_file` or `replace_string_in_file` tools which handle content atomically. For DMN files specifically, always use the DMN MCP tools (`export_dmn` → write) rather than hand-editing XML.
- The `dmn-js` browser bundle is loaded via `eval` inside jsdom; polyfills for `SVGMatrix`, `getBBox`, `getScreenCTM`, `transform`, `createSVGMatrix`, and `createSVGTransform` are manually defined in `headless-polyfills.ts`.
- Diagram state is in-memory by default. Optional file-backed persistence can be enabled via `enablePersistence(dir)` from `src/persistence.ts`.
- The `jsdom` instance and `DmnModeler` constructor are lazily initialized on first use and then reused.
- **dmn-js has multiple view types** — the modeler can switch between DRD, decision table, and expression views. Use `modeler.getActiveView()` and `modeler.open(view)` to navigate.
- **Decision table manipulation** may require a moddle-first approach (manipulating the business object model directly) rather than going through the table editor view, which needs a more complex headless setup.
- **FEEL parsing** uses `feelin` (https://github.com/nikku/feelin) — the package name is "feelin" not "feeln".
