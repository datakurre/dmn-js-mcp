/**
 * Manages the in-memory store of DMN diagrams and exposes helpers
 * for creating / retrieving / importing diagrams.
 */

import { randomBytes } from 'node:crypto';
import { type DiagramState } from './types';
import { createHeadlessCanvas, getDmnModeler } from './headless-canvas';
import camundaModdle from 'camunda-dmn-moddle/resources/camunda.json';

/** Default DMN XML used when creating a brand-new diagram. */
export const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
             xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
             xmlns:camunda="http://camunda.org/schema/1.0/dmn"
             id="Definitions_1"
             name="DRD"
             namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1">
      <dmndi:DMNShape id="DMNShape_Decision_1" dmnElementRef="Decision_1">
        <dc:Bounds x="160" y="80" width="180" height="80" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

// ── Diagram store ──────────────────────────────────────────────────────────

const diagrams = new Map<string, DiagramState>();

/** Reverse index: modeler instance → diagram ID. Avoids O(n) lookups. */
const modelerToDiagramId = new WeakMap<object, string>();

export function getDiagram(id: string): DiagramState | undefined {
  return diagrams.get(id);
}

export function storeDiagram(id: string, state: DiagramState): void {
  diagrams.set(id, state);
  if (state.modeler) {
    modelerToDiagramId.set(state.modeler, id);
  }
}

export function deleteDiagram(id: string): boolean {
  const state = diagrams.get(id);
  if (state?.modeler) {
    modelerToDiagramId.delete(state.modeler);
  }
  return diagrams.delete(id);
}

export function getAllDiagrams(): Map<string, DiagramState> {
  return diagrams;
}

/**
 * O(1) reverse lookup: find the diagram ID for a DiagramState.
 * Falls back to O(n) scan if the WeakMap entry is missing.
 */
export function getDiagramId(diagram: DiagramState): string | undefined {
  if (diagram.modeler) {
    const id = modelerToDiagramId.get(diagram.modeler);
    if (id !== undefined) return id;
  }
  for (const [id, state] of diagrams) {
    if (state === diagram) return id;
  }
  return undefined;
}

export function generateDiagramId(): string {
  return `diagram_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

/** Visible for testing – wipe all diagrams. */
export function clearDiagrams(): void {
  diagrams.clear();
}

// ── Modeler helpers ────────────────────────────────────────────────────────

/** Shared moddle-extensions option used by every modeler instance. */
const moddleExtensions = { camunda: camundaModdle };

/** Create a fresh DmnModeler initialised with the default blank diagram. */
export async function createModeler(): Promise<any> {
  const container = createHeadlessCanvas();
  const DmnModeler = getDmnModeler();
  const modeler = new DmnModeler({ container, moddleExtensions });
  await modeler.importXML(INITIAL_XML);
  return modeler;
}

/** Create a DmnModeler and import the supplied XML into it. */
export async function createModelerFromXml(xml: string): Promise<any> {
  const container = createHeadlessCanvas();
  const DmnModeler = getDmnModeler();
  const modeler = new DmnModeler({ container, moddleExtensions });
  await modeler.importXML(xml);
  return modeler;
}
