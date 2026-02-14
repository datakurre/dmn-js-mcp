/**
 * Minimal type interfaces for dmn-js services and elements.
 *
 * dmn-js doesn't ship proper TypeScript declarations for its internal
 * services. These interfaces capture the subset of the API we actually
 * use so that handler code can avoid raw `any` and get basic IDE
 * auto-complete / type-checking.
 */

// ── DMN Business Object types ──────────────────────────────────────────────

/** Minimal representation of a DMN business object (semantic model). */
export interface BusinessObject {
  $type: string;
  $parent?: BusinessObject;
  $attrs?: Record<string, unknown>;
  id: string;
  name?: string;
  extensionElements?: ExtensionElements;
  /** For Decision elements: the expression logic (DecisionTable, LiteralExpression, etc.) */
  decisionLogic?: BusinessObject;
  /** For InformationRequirement: the required decision or input. */
  requiredDecision?: BusinessObject;
  requiredInput?: BusinessObject;
  /** For KnowledgeRequirement. */
  requiredKnowledge?: BusinessObject;
  /** For AuthorityRequirement. */
  requiredAuthority?: BusinessObject;
  /** For DecisionTable: input/output columns. */
  input?: BusinessObject[];
  output?: BusinessObject[];
  rule?: BusinessObject[];
  /** For InputClause / OutputClause: expression reference. */
  inputExpression?: BusinessObject;
  inputValues?: BusinessObject;
  outputValues?: BusinessObject;
  /** For LiteralExpression / UnaryTests. */
  text?: string;
  expressionLanguage?: string;
  typeRef?: string;
  /** Generic property access for moddle elements. */
  [key: string]: unknown;
}

/** extensionElements container. */
export interface ExtensionElements {
  $type: string;
  $parent?: BusinessObject;
  values: ExtensionElement[];
}

/** A single extension element (e.g. Camunda-specific extensions). */
export interface ExtensionElement {
  $type: string;
  $parent?: ExtensionElements;
  [key: string]: unknown;
}

// ── Diagram-JS shape / element (DRD view) ──────────────────────────────────

/** A shape or connection on the DRD canvas — wraps a BusinessObject. */
export interface DmnElement {
  id: string;
  type: string;
  businessObject: BusinessObject;
  x: number;
  y: number;
  width: number;
  height: number;
  incoming?: DmnElement[];
  outgoing?: DmnElement[];
  source?: DmnElement;
  target?: DmnElement;
  parent?: DmnElement;
  /** Child elements (shapes inside a container). */
  children?: DmnElement[];
  /** Waypoints for connections. */
  waypoints?: Array<{ x: number; y: number }>;
  /** Label shape for connections. */
  label?: { x: number; y: number; width: number; height: number };
  /** Whether the element is hidden. */
  hidden?: boolean;
  /** DI (diagram interchange) information. */
  di?: {
    bounds?: { x: number; y: number; width: number; height: number };
    label?: { bounds?: { x: number; y: number; width: number; height: number } };
  };
}

// ── dmn-js DRD service interfaces ──────────────────────────────────────────

/** The Modeling service — mutates the DRD model & diagram. */
export interface Modeling {
  createShape(
    shape: DmnElement | Record<string, unknown>,
    position: { x: number; y: number },
    target: DmnElement | Record<string, unknown>,
    hints?: Record<string, unknown>
  ): DmnElement;
  moveElements(elements: DmnElement[], delta: { x: number; y: number }): void;
  layoutConnection(connection: DmnElement, hints?: Record<string, unknown>): void;
  updateWaypoints(
    connection: DmnElement,
    newWaypoints: Array<{ x: number; y: number }>,
    hints?: Record<string, unknown>
  ): void;
  connect(source: DmnElement, target: DmnElement, attrs?: Record<string, unknown>): DmnElement;
  updateProperties(element: DmnElement, properties: Record<string, unknown>): void;
  removeElements(elements: DmnElement[]): void;
  resizeShape(
    shape: DmnElement,
    newBounds: { x: number; y: number; width: number; height: number }
  ): void;
}

/** The ElementFactory service — creates new shapes / connections. */
export interface ElementFactory {
  createShape(attrs: Record<string, unknown>): DmnElement;
  createConnection(attrs: Record<string, unknown>): DmnElement;
}

/** The ElementRegistry service — find / filter elements. */
export interface ElementRegistry {
  get(id: string): DmnElement | undefined;
  filter(fn: (element: DmnElement) => boolean): DmnElement[];
  getAll(): DmnElement[];
  forEach(fn: (element: DmnElement) => void): void;
}

/** The Canvas service — root element access. */
export interface Canvas {
  getRootElement(): DmnElement;
}

/** The Moddle service — create DMN model instances. */
export interface Moddle {
  create(type: string, attrs?: Record<string, unknown>): BusinessObject;
}

/** The DrdFactory service — create DMN business objects with auto-IDs. */
export interface DrdFactory {
  create(type: string, attrs?: Record<string, unknown>): BusinessObject;
}

/** The CommandStack service — undo/redo support. */
export interface CommandStack {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
  execute(command: string, context: Record<string, unknown>): void;
}

// ── Typed service access ───────────────────────────────────────────────────

/**
 * Map of known dmn-js DRD service names to their typed interfaces.
 *
 * Used by `getService()` to provide type-safe access to modeler services
 * instead of raw `any` from `viewer.get()`.
 */
export interface ServiceMap {
  modeling: Modeling;
  elementFactory: ElementFactory;
  elementRegistry: ElementRegistry;
  canvas: Canvas;
  moddle: Moddle;
  drdFactory: DrdFactory;
  commandStack: CommandStack;
}

/**
 * Type-safe accessor for dmn-js DRD viewer services.
 *
 * Usage:
 *   const modeling = getService(viewer, 'modeling');
 *   // modeling is typed as Modeling, not any
 */
export function getService<K extends keyof ServiceMap>(
  viewer: { get(name: string): unknown },
  name: K
): ServiceMap[K] {
  return viewer.get(name) as ServiceMap[K];
}
