# ADR-004: Element ID naming convention

## Status

Accepted

## Decision

dmn-js generates IDs like `Decision_0m4w27p` with random hex suffixes but no semantic meaning. Our approach prefers short, readable 2-part IDs: `Decision_CustomerEligibility` when a name is given. On collision (same name used twice), it falls back to 3-part IDs with a random middle section: `Decision_a1b2c3d_CustomerEligibility`. Unnamed elements always use a random part: `InputData_x9y8z7w`. The random 7-character alphanumeric part ensures reasonable uniqueness.

Ported from bpmn-js-mcp ADR-013.
