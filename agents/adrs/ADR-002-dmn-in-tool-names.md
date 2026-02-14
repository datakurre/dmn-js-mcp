# ADR-002: All tool names include "dmn"

## Status

Accepted

## Decision

When multiple MCP servers are active, tool names must be globally unique. Generic names like `delete_diagram` or `add_element` could collide with tools from other MCPs (e.g. bpmn-js-mcp). Adding `dmn` to every tool name (e.g. `delete_dmn_diagram`, `add_dmn_drd_element`) eliminates this risk. No backward-compat aliases — MCP tool namespaces don't need them.

Ported from bpmn-js-mcp ADR-015.
