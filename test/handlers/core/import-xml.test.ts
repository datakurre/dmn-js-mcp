import { describe, test, expect, beforeEach } from 'vitest';
import { handleImportXml, handleExportDmn } from '../../../src/handlers';
import { parseResult, clearDiagrams } from '../../helpers';
import { INITIAL_XML } from '../../../src/diagram-manager';

describe('import_dmn_xml', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('imports valid DMN XML', async () => {
    const res = parseResult(await handleImportXml({ xml: INITIAL_XML }));
    expect(res.success).toBe(true);
    expect(res.diagramId).toMatch(/^diagram_/);
  });

  test('imported diagram can be exported', async () => {
    const res = parseResult(await handleImportXml({ xml: INITIAL_XML }));
    const xml = (await handleExportDmn({ diagramId: res.diagramId, format: 'xml' })).content[0]
      .text;
    expect(xml).toContain('Decision_1');
  });

  test('returns error message for missing xml arg', async () => {
    const result = await handleImportXml({} as any);
    expect(result.content[0].text).toContain('Either xml or filePath');
  });
});
