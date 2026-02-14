import { describe, test, expect, beforeEach } from 'vitest';
import { handleBatchOperations } from '../../../src/handlers/core/batch';
import { handleCreateDiagram } from '../../../src/handlers/core/create-diagram';
import { parseResult, clearDiagrams } from '../../helpers';

describe('batch_dmn_operations', () => {
  beforeEach(() => {
    clearDiagrams();
  });

  test('executes multiple operations successfully', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    const res = parseResult(
      await handleBatchOperations({
        operations: [
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InputData',
              name: 'Age',
              x: 160,
              y: 250,
            },
          },
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InputData',
              name: 'Income',
              x: 350,
              y: 250,
            },
          },
        ],
      })
    );

    expect(res.success).toBe(true);
    expect(res.succeeded).toBe(2);
    expect(res.failed).toBe(0);
    expect(res.results).toHaveLength(2);
  });

  test('stops on error by default and rolls back', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    const res = parseResult(
      await handleBatchOperations({
        operations: [
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InputData',
              name: 'Valid Input',
              x: 160,
              y: 250,
            },
          },
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InvalidType',
              name: 'Bad',
              x: 300,
              y: 250,
            },
          },
        ],
      })
    );

    expect(res.success).toBe(false);
    expect(res.failed).toBeGreaterThan(0);
    expect(res.rolledBack).toBe(true);
  });

  test('continues on error when stopOnError is false', async () => {
    const { diagramId } = parseResult(await handleCreateDiagram({}));

    const res = parseResult(
      await handleBatchOperations({
        stopOnError: false,
        operations: [
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InvalidType',
              name: 'Bad',
              x: 160,
              y: 250,
            },
          },
          {
            tool: 'add_dmn_element',
            args: {
              diagramId,
              elementType: 'dmn:InputData',
              name: 'Good Input',
              x: 350,
              y: 250,
            },
          },
        ],
      })
    );

    expect(res.success).toBe(false);
    expect(res.executed).toBe(2);
    expect(res.succeeded).toBe(1);
    expect(res.failed).toBe(1);
  });

  test('rejects nested batch operations', async () => {
    await expect(
      handleBatchOperations({
        operations: [
          {
            tool: 'batch_dmn_operations',
            args: { operations: [] },
          },
        ],
      })
    ).rejects.toThrow(/Nested batch/);
  });

  test('rejects empty operations array', async () => {
    await expect(
      handleBatchOperations({
        operations: [],
      })
    ).rejects.toThrow();
  });
});
