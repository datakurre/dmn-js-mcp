/**
 * Shared interfaces used across the dmn-js-mcp server.
 */

// ── Diagram state ──────────────────────────────────────────────────────────

/**
 * Controls how much implicit feedback is included in tool responses.
 *
 * - `'full'`    — lint errors, layout hints, connectivity warnings (default)
 * - `'minimal'` — lint errors only
 * - `'none'`   — no implicit feedback (equivalent to legacy draftMode)
 */
export type HintLevel = 'none' | 'minimal' | 'full';

/**
 * The active view type within a DMN diagram.
 *
 * DMN has multiple view types unlike BPMN:
 * - `'drd'`              — Decision Requirements Diagram (visual graph)
 * - `'decisionTable'`    — Decision Table editor
 * - `'literalExpression'` — Literal Expression editor
 * - `'boxedExpression'`   — Boxed Expression editor (dmn-js >= 16)
 */
export type DmnViewType = 'drd' | 'decisionTable' | 'literalExpression' | 'boxedExpression';

/** Minimal interface for the dmn-js Modeler services we use. */
export interface DmnModeler {
  get(service: string): any;
  getActiveViewer(): any;
  getActiveView(): { type: string; element?: any } | null;
  open(view: { type: string; element?: any }): void;
  saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
  saveSVG(): Promise<{ svg: string }>;
  importXML(xml: string): Promise<any>;
  getViews(): Array<{ type: string; element?: any }>;
}

/** State for a single in-memory DMN diagram. */
export interface DiagramState {
  modeler: DmnModeler;
  xml: string;
  name?: string;
  /** When true, suppress implicit lint feedback on mutating operations.
   *  @deprecated Use `hintLevel: 'none'` instead.
   */
  draftMode?: boolean;
  /**
   * Controls implicit feedback verbosity on mutating operations.
   * Overrides `draftMode` when set.
   * - `'full'`    — lint errors + layout hints + connectivity warnings (default)
   * - `'minimal'` — lint errors only
   * - `'none'`   — no implicit feedback
   */
  hintLevel?: HintLevel;
  /** Monotonically increasing version counter, bumped on each mutation. */
  version?: number;
  /** Count of structural mutations since the last layout call. */
  mutationsSinceLayout?: number;
}

/** Shape of the JSON returned by tool handlers that wrap results. */
export interface ToolResult {
  content: Array<{ type: string; text: string }>;
}
