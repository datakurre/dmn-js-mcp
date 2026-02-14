/**
 * SVG / CSS polyfills for running dmn-js headlessly via jsdom.
 *
 * dmn-js DRD uses diagram-js (same as bpmn-js), so polyfill requirements
 * are largely identical: SVGMatrix, getBBox, getScreenCTM, transform, etc.
 */

import { polyfillGetBBox, polyfillGetComputedTextLength } from './headless-bbox';

// ── SVGTransform polyfill ──────────────────────────────────────────────────

function createSVGTransformObject(win: any) {
  return {
    type: 0,
    matrix: new win.SVGMatrix(),
    angle: 0,
    setTranslate(x: number, y: number) {
      this.matrix = new win.SVGMatrix();
      this.matrix.e = x;
      this.matrix.f = y;
      this.type = 2;
    },
    setScale(sx: number, sy: number) {
      this.matrix = new win.SVGMatrix();
      this.matrix.a = sx;
      this.matrix.d = sy;
      this.type = 3;
    },
    setRotate(angle: number, cx: number, cy: number) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad),
        sin = Math.sin(rad);
      this.angle = angle;
      this.matrix = new win.SVGMatrix();
      this.matrix.a = cos;
      this.matrix.b = sin;
      this.matrix.c = -sin;
      this.matrix.d = cos;
      this.matrix.e = (1 - cos) * cx + sin * cy;
      this.matrix.f = -sin * cx + (1 - cos) * cy;
      this.type = 4;
    },
    setMatrix(m: any) {
      this.matrix = new win.SVGMatrix();
      this.matrix.a = m.a ?? 1;
      this.matrix.b = m.b ?? 0;
      this.matrix.c = m.c ?? 0;
      this.matrix.d = m.d ?? 1;
      this.matrix.e = m.e ?? 0;
      this.matrix.f = m.f ?? 0;
      this.type = 1;
    },
  };
}

function syncTransformAttribute(list: any): void {
  const el = list._element;
  if (!el?.setAttribute) return;
  if (list._items.length === 0) {
    el.removeAttribute('transform');
    return;
  }
  const parts: string[] = [];
  for (const item of list._items) {
    const m = item.matrix;
    if (!m) continue;
    if (m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1) {
      parts.push(`translate(${m.e}, ${m.f})`);
    } else {
      parts.push(`matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`);
    }
  }
  el.setAttribute('transform', parts.join(' '));
}

function createTransformList(win: any, element: any) {
  return {
    numberOfItems: 0,
    _items: [] as any[],
    _element: element,
    consolidate() {
      if (this._items.length === 0) return null;
      let result = new win.SVGMatrix();
      for (const item of this._items) {
        if (item.matrix) {
          result = result.multiply(item.matrix);
        }
      }
      const consolidated = createSVGTransformObject(win);
      consolidated.setMatrix(result);
      this._items = [consolidated];
      this.numberOfItems = 1;
      syncTransformAttribute(this);
      return consolidated;
    },
    clear() {
      this._items = [];
      this.numberOfItems = 0;
      syncTransformAttribute(this);
    },
    getItem(index: number) {
      return this._items[index];
    },
    insertItemBefore(newItem: any, index: number) {
      this._items.splice(index, 0, newItem);
      this.numberOfItems = this._items.length;
      syncTransformAttribute(this);
      return newItem;
    },
    replaceItem(newItem: any, index: number) {
      this._items[index] = newItem;
      syncTransformAttribute(this);
      return newItem;
    },
    removeItem(index: number) {
      const item = this._items.splice(index, 1)[0];
      this.numberOfItems = this._items.length;
      syncTransformAttribute(this);
      return item;
    },
    appendItem(item: any) {
      this._items.push(item);
      this.numberOfItems = this._items.length;
      syncTransformAttribute(this);
      return item;
    },
    initialize(item: any) {
      this._items = [item];
      this.numberOfItems = 1;
      syncTransformAttribute(this);
      return item;
    },
    createSVGTransformFromMatrix(matrix: any) {
      const t = createSVGTransformObject(win);
      t.setMatrix(matrix);
      return t;
    },
  };
}

// ── Polyfill sub-steps ─────────────────────────────────────────────────────

function applyCssPolyfills(win: any): void {
  if (!win.CSS) win.CSS = {};
  if (!win.CSS.escape) {
    win.CSS.escape = (v: string) => v.replace(/([^\w-])/g, '\\$1').replace(/^(\d)/, '\\3$1 ');
  }
}

function applyStructuredClone(win: any): void {
  const clone = (obj: any) => JSON.parse(JSON.stringify(obj));
  if (!win.structuredClone) win.structuredClone = clone;
  if (!(global as any).structuredClone) (global as any).structuredClone = clone;
}

function applySvgMatrix(win: any): void {
  if (win.SVGMatrix) return;
  win.SVGMatrix = class SVGMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    inverse() {
      const det = this.a * this.d - this.b * this.c;
      if (Math.abs(det) < 1e-10) return new SVGMatrix();
      const m = new SVGMatrix();
      m.a = this.d / det;
      m.b = -this.b / det;
      m.c = -this.c / det;
      m.d = this.a / det;
      m.e = (this.c * this.f - this.d * this.e) / det;
      m.f = (this.b * this.e - this.a * this.f) / det;
      return m;
    }
    multiply(o: any) {
      const m = new SVGMatrix();
      m.a = this.a * o.a + this.c * o.b;
      m.b = this.b * o.a + this.d * o.b;
      m.c = this.a * o.c + this.c * o.d;
      m.d = this.b * o.c + this.d * o.d;
      m.e = this.a * o.e + this.c * o.f + this.e;
      m.f = this.b * o.e + this.d * o.f + this.f;
      return m;
    }
    translate(x: number, y: number) {
      const m = new SVGMatrix();
      m.e = x;
      m.f = y;
      return this.multiply(m);
    }
    scale(s: number) {
      const m = new SVGMatrix();
      m.a = s;
      m.d = s;
      return this.multiply(m);
    }
  };
}

function applySvgElementPolyfills(win: any): void {
  const svgProto =
    win.SVGElement?.prototype ||
    Object.getPrototypeOf(win.document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  if (!svgProto) return;
  if (!svgProto.getBBox) {
    svgProto.getBBox = function () {
      return polyfillGetBBox(this);
    };
  }
  if (!svgProto.getScreenCTM) {
    svgProto.getScreenCTM = function () {
      return new win.SVGMatrix();
    };
  }
  if (!svgProto.getComputedTextLength) {
    svgProto.getComputedTextLength = function () {
      return polyfillGetComputedTextLength(this);
    };
  }
  if (!Object.getOwnPropertyDescriptor(svgProto, 'transform')?.get) {
    Object.defineProperty(svgProto, 'transform', {
      get() {
        if (!this._transformList) this._transformList = createTransformList(win, this);
        return { baseVal: this._transformList, animVal: this._transformList };
      },
      configurable: true,
    });
  }
}

function applySvgSvgPolyfills(win: any): void {
  const proto =
    win.SVGSVGElement?.prototype ||
    Object.getPrototypeOf(win.document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  if (!proto) return;
  if (!proto.createSVGMatrix) {
    proto.createSVGMatrix = function () {
      return new win.SVGMatrix();
    };
  }
  if (!proto.createSVGTransform) {
    proto.createSVGTransform = function () {
      return createSVGTransformObject(win);
    };
  }
  if (!proto.createSVGTransformFromMatrix) {
    proto.createSVGTransformFromMatrix = function (m: any) {
      const t = createSVGTransformObject(win);
      t.setMatrix(m);
      return t;
    };
  }
}

// ── Main entry ─────────────────────────────────────────────────────────────

/** Apply all required polyfills to a JSDOM instance. */
export function applyPolyfills(jsdom: any): void {
  const win = jsdom.window;
  applyCssPolyfills(win);
  applyStructuredClone(win);
  applySvgMatrix(win);
  applySvgElementPolyfills(win);
  applySvgSvgPolyfills(win);
}
