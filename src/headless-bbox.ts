/**
 * Headless getBBox polyfill for SVG elements.
 *
 * Provides element-type-aware bounding box estimation for the subset of
 * SVG elements that dmn-js DRD uses: text/tspan, rect, circle, ellipse,
 * polygon/polyline, line, path, and container elements (g, svg).
 *
 * Also provides getComputedTextLength estimation based on character count.
 */

// ── Text metric constants ──────────────────────────────────────────────────

/** Approximate line height in px for the default font. */
const LINE_HEIGHT = 14;
/** Default line width for text wrapping estimation. */
const DEFAULT_WRAP_WIDTH = 90;

const DEFAULT_CHAR_RATIO = 0.55;

const ARIAL_CHAR_RATIOS: Record<string, number> = {
  ' ': 0.278,
  '!': 0.278,
  '"': 0.355,
  '#': 0.556,
  $: 0.556,
  '%': 0.889,
  '&': 0.667,
  "'": 0.191,
  '(': 0.333,
  ')': 0.333,
  '*': 0.389,
  '+': 0.584,
  ',': 0.278,
  '-': 0.333,
  '.': 0.278,
  '/': 0.278,
  '0': 0.556,
  '1': 0.556,
  '2': 0.556,
  '3': 0.556,
  '4': 0.556,
  '5': 0.556,
  '6': 0.556,
  '7': 0.556,
  '8': 0.556,
  '9': 0.556,
  ':': 0.278,
  ';': 0.278,
  '<': 0.584,
  '=': 0.584,
  '>': 0.584,
  '?': 0.556,
  '@': 1.015,
  A: 0.667,
  B: 0.667,
  C: 0.722,
  D: 0.722,
  E: 0.667,
  F: 0.611,
  G: 0.778,
  H: 0.722,
  I: 0.278,
  J: 0.5,
  K: 0.667,
  L: 0.556,
  M: 0.833,
  N: 0.722,
  O: 0.778,
  P: 0.667,
  Q: 0.778,
  R: 0.722,
  S: 0.667,
  T: 0.611,
  U: 0.722,
  V: 0.667,
  W: 0.944,
  X: 0.667,
  Y: 0.667,
  Z: 0.611,
  a: 0.556,
  b: 0.556,
  c: 0.5,
  d: 0.556,
  e: 0.556,
  f: 0.278,
  g: 0.556,
  h: 0.556,
  i: 0.222,
  j: 0.222,
  k: 0.5,
  l: 0.222,
  m: 0.833,
  n: 0.556,
  o: 0.556,
  p: 0.556,
  q: 0.556,
  r: 0.333,
  s: 0.5,
  t: 0.278,
  u: 0.556,
  v: 0.5,
  w: 0.722,
  x: 0.5,
  y: 0.5,
  z: 0.5,
};

function measureText(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    width += (ARIAL_CHAR_RATIOS[ch] ?? DEFAULT_CHAR_RATIO) * fontSize;
  }
  return width;
}

// ── Tag-specific bbox helpers ──────────────────────────────────────────────

type BBox = { x: number; y: number; width: number; height: number };
const EMPTY: BBox = { x: 0, y: 0, width: 0, height: 0 };

function parseFontSize(el: any): number {
  const style = el.getAttribute?.('style') || '';
  const m = style.match(/font-size:\s*([\d.]+)px/i);
  if (m) return parseFloat(m[1]);
  const fs = el.getAttribute?.('font-size');
  return fs ? parseFloat(fs) : 12;
}

function attr(el: any, name: string): number {
  return parseFloat(el.getAttribute(name) || '0');
}

function bboxText(el: any): BBox {
  const fontSize = parseFontSize(el);
  const x = attr(el, 'x');
  const y = attr(el, 'y');
  const tspans = el.querySelectorAll ? el.querySelectorAll('tspan') : [];
  if (tspans.length > 1) {
    return { x, y: y - fontSize, width: DEFAULT_WRAP_WIDTH, height: tspans.length * LINE_HEIGHT };
  }
  return {
    x,
    y: y - fontSize,
    width: measureText(el.textContent || '', fontSize),
    height: fontSize * 1.2,
  };
}

function bboxRect(el: any): BBox {
  return {
    x: attr(el, 'x'),
    y: attr(el, 'y'),
    width: attr(el, 'width'),
    height: attr(el, 'height'),
  };
}

function bboxCircle(el: any): BBox {
  const cx = attr(el, 'cx'),
    cy = attr(el, 'cy'),
    r = attr(el, 'r');
  return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
}

function bboxEllipse(el: any): BBox {
  const cx = attr(el, 'cx'),
    cy = attr(el, 'cy'),
    rx = attr(el, 'rx'),
    ry = attr(el, 'ry');
  return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
}

function bboxLine(el: any): BBox {
  const x1 = attr(el, 'x1'),
    y1 = attr(el, 'y1'),
    x2 = attr(el, 'x2'),
    y2 = attr(el, 'y2');
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function bboxPolygon(el: any): BBox {
  const coords = (el.getAttribute('points') || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < coords.length; i += 2) {
    if (coords[i] < minX) minX = coords[i];
    if (coords[i + 1] < minY) minY = coords[i + 1];
    if (coords[i] > maxX) maxX = coords[i];
    if (coords[i + 1] > maxY) maxY = coords[i + 1];
  }
  return isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : EMPTY;
}

function bboxPath(el: any): BBox {
  const nums = (el.getAttribute('d') || '').match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 2) return EMPTY;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = Number(nums[i]),
      y = Number(nums[i + 1]);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : EMPTY;
}

function bboxGroup(el: any): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const child of el.childNodes || []) {
    if (!child.tagName) continue;
    const b = polyfillGetBBox(child);
    if (b.width === 0 && b.height === 0) continue;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : EMPTY;
}

const BBOX_BY_TAG: Record<string, (el: any) => BBox> = {
  rect: bboxRect,
  circle: bboxCircle,
  ellipse: bboxEllipse,
  line: bboxLine,
  text: bboxText,
  tspan: bboxText,
  polygon: bboxPolygon,
  polyline: bboxPolygon,
  path: bboxPath,
  g: bboxGroup,
  svg: bboxGroup,
};

/** Polyfill getBBox for an SVG element via tag dispatch. */
export function polyfillGetBBox(el: any): BBox {
  return (BBOX_BY_TAG[(el.tagName || '').toLowerCase()] || (() => EMPTY))(el);
}

/** Polyfill getComputedTextLength for an SVG text/tspan element. */
export function polyfillGetComputedTextLength(el: any): number {
  return measureText(el.textContent || '', parseFontSize(el));
}
