import { describe, test, expect, beforeEach } from 'vitest';
import { handleSetProperties, handleAddElement, handleGetProperties } from '../../../src/handlers';
import { parseResult, createDiagram, clearDiagrams } from '../../helpers';

describe('set_dmn_element_properties (position)', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('moves an element to absolute coordinates via x/y', async () => {
    const { diagramId } = await createDiagram();
    const added = parseResult(
      await handleAddElement({
        diagramId,
        elementType: 'dmn:InputData',
        name: 'Age',
        x: 100,
        y: 200,
      })
    );

    const res = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: added.elementId,
        properties: { x: 400, y: 300 },
      })
    );
    expect(res.success).toBe(true);
    expect(res.updatedProperties).toContain('x');
    expect(res.updatedProperties).toContain('y');
  });

  test('moves an element with only x', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { x: 500 },
      })
    );
    expect(res.success).toBe(true);
  });

  test('moves an element with only y', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { y: 350 },
      })
    );
    expect(res.success).toBe(true);
  });

  test('combines position with name update', async () => {
    const { diagramId } = await createDiagram();
    const res = parseResult(
      await handleSetProperties({
        diagramId,
        elementId: 'Decision_1',
        properties: { name: 'Renamed', x: 200, y: 100 },
      })
    );
    expect(res.success).toBe(true);
    expect(res.updatedProperties).toContain('name');
    expect(res.updatedProperties).toContain('x');
    expect(res.updatedProperties).toContain('y');

    // Verify the name was actually set
    const props = parseResult(await handleGetProperties({ diagramId, elementId: 'Decision_1' }));
    expect(props.name).toBe('Renamed');
  });
});
