/**
 * Shared types and interfaces used across module boundaries.
 *
 * This barrel provides a single import point for cross-cutting types:
 *
 *   import { type DiagramState, type ToolResult } from '../shared';
 *   import { type DmnElement, getService } from '../shared';
 *
 * The canonical definitions remain in their original files for backwards
 * compatibility. New code should prefer importing from `../shared`.
 */

// Core diagram state and tool result types
export { type DmnModeler, type DiagramState, type ToolResult } from '../types';

// dmn-js service and element type declarations
export {
  type BusinessObject,
  type ExtensionElements,
  type ExtensionElement,
  type DmnElement,
  type Modeling,
  type ElementFactory,
  type ElementRegistry,
  type Canvas,
  type Moddle,
  type DrdFactory,
  type CommandStack,
  type ServiceMap,
  getService,
} from '../dmn-types';
