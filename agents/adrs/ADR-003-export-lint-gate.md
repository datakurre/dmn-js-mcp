# ADR-003: Implicit lint gate on export

## Status

Accepted

## Decision

During real usage, AI callers would export invalid DMN diagrams without checking first, producing XML that engines reject. The implicit lint gate in `export_dmn` catches error-level issues before export. A `skipLint` parameter allows callers to bypass this when they know what they're doing (e.g. exporting a work-in-progress).

Ported from bpmn-js-mcp ADR-010.
