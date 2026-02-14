import { describe, test, expect, beforeEach } from 'vitest';
import {
  generateDiagramId,
  getDiagram,
  storeDiagram,
  deleteDiagram,
  getAllDiagrams,
  clearDiagrams,
  createModeler,
  INITIAL_XML,
} from '../src/diagram-manager';

describe('diagram-manager', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  describe('generateDiagramId', () => {
    test('produces unique IDs', () => {
      const a = generateDiagramId();
      const b = generateDiagramId();
      expect(a).not.toBe(b);
    });

    test("starts with 'diagram_'", () => {
      expect(generateDiagramId()).toMatch(/^diagram_/);
    });
  });

  describe('store / get / delete / clear', () => {
    test('returns undefined for unknown IDs', () => {
      expect(getDiagram('nonexistent')).toBeUndefined();
    });

    test('round-trips a stored diagram', () => {
      const state = { modeler: {} as any, xml: '<xml/>' };
      storeDiagram('test_1', state);
      expect(getDiagram('test_1')).toBe(state);
    });

    test('deleteDiagram removes a specific entry', () => {
      storeDiagram('test_1', { modeler: {} as any, xml: '<xml/>' });
      storeDiagram('test_2', { modeler: {} as any, xml: '<xml/>' });
      expect(deleteDiagram('test_1')).toBe(true);
      expect(getDiagram('test_1')).toBeUndefined();
      expect(getDiagram('test_2')).toBeDefined();
    });

    test('deleteDiagram returns false for unknown ID', () => {
      expect(deleteDiagram('nonexistent')).toBe(false);
    });

    test('clearDiagrams removes all entries', () => {
      storeDiagram('a', { modeler: {} as any, xml: '' });
      storeDiagram('b', { modeler: {} as any, xml: '' });
      clearDiagrams();
      expect(getAllDiagrams().size).toBe(0);
    });
  });

  describe('getAllDiagrams', () => {
    test('returns the internal map', () => {
      const map = getAllDiagrams();
      expect(map).toBeInstanceOf(Map);
    });
  });

  describe('INITIAL_XML', () => {
    test('contains the DMN namespace', () => {
      expect(INITIAL_XML).toContain('https://www.omg.org/spec/DMN/20191111/MODEL/');
    });

    test('contains the camunda namespace', () => {
      expect(INITIAL_XML).toContain('http://camunda.org/schema/1.0/dmn');
    });

    test('contains a Decision element', () => {
      expect(INITIAL_XML).toContain('<decision');
    });

    test('contains a DecisionTable', () => {
      expect(INITIAL_XML).toContain('<decisionTable');
    });

    test('contains DMNDI layout information', () => {
      expect(INITIAL_XML).toContain('dmndi:DMNDiagram');
    });
  });

  describe('createModeler', () => {
    test('returns a modeler with getActiveViewer', async () => {
      const modeler = await createModeler();
      expect(modeler).toBeDefined();
      expect(typeof modeler.getActiveViewer).toBe('function');
    });

    test('initialised diagram contains a Decision element', async () => {
      const modeler = await createModeler();
      const viewer = modeler.getActiveViewer();
      const registry = viewer.get('elementRegistry');
      const decision = registry.get('Decision_1');
      expect(decision).toBeDefined();
    });

    test('can export XML from a fresh modeler', async () => {
      const modeler = await createModeler();
      const { xml } = await modeler.saveXML({ format: true });
      expect(xml).toContain('definitions');
      expect(xml).toContain('Decision_1');
    });
  });
});
