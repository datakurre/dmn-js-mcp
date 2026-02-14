/**
 * Headless browser environment for dmn-js.
 *
 * Creates a jsdom instance with all SVG / CSS polyfills required to run the
 * dmn-js browser bundle outside of a real browser. The instance is lazily
 * initialised on first call and then reused.
 *
 * dmn-js DRD uses diagram-js (same as bpmn-js), so the polyfill
 * requirements are largely identical.
 *
 * Polyfill implementations live in `./headless-polyfills.ts`.
 */

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { applyPolyfills } from './headless-polyfills';

let jsdomInstance: any;
let DmnModelerCtor: any;

/** Ensure the jsdom instance + polyfills exist and return the canvas element. */
export function createHeadlessCanvas(): HTMLElement {
  if (!jsdomInstance) {
    // dmn-js ships a pre-built UMD bundle for browser use
    const dmnJsPath = require.resolve('dmn-js/dist/dmn-modeler.development.js');
    const dmnJsBundle = fs.readFileSync(dmnJsPath, 'utf-8');

    jsdomInstance = new JSDOM("<!DOCTYPE html><html><body><div id='canvas'></div></body></html>", {
      runScripts: 'outside-only',
    });

    applyPolyfills(jsdomInstance);

    // Execute the dmn-js bundle inside jsdom
    jsdomInstance.window.eval(dmnJsBundle);

    // Expose globals that dmn-js expects at runtime
    (global as any).document = jsdomInstance.window.document;
    (global as any).window = jsdomInstance.window;

    // dmn-js UMD exposes as DmnJS (check actual export name at runtime)
    DmnModelerCtor =
      (jsdomInstance.window as any).DmnJS || (jsdomInstance.window as any).DmnModeler;
  }

  return jsdomInstance.window.document.getElementById('canvas')!;
}

/** Return the lazily-loaded DmnModeler constructor. */
export function getDmnModeler(): any {
  if (!DmnModelerCtor) {
    createHeadlessCanvas(); // triggers lazy init
  }
  return DmnModelerCtor;
}
