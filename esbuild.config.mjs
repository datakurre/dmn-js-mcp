import { build, context } from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  external: ['jsdom', 'dmn-js', 'dmn-moddle', 'elkjs', 'feelin'],
};

/** CLI entry point — standalone MCP server on stdio. */
/** @type {import('esbuild').BuildOptions} */
const cliConfig = {
  ...shared,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  banner: {
    js: '#!/usr/bin/env node',
  },
};

/** Library entry point — importable module for integration with other MCP servers. */
/** @type {import('esbuild').BuildOptions} */
const libConfig = {
  ...shared,
  entryPoints: ['src/lib.ts'],
  outfile: 'dist/lib.js',
};

const isWatch = process.argv.includes('--watch');

if (isWatch) {
  const [cliCtx, libCtx] = await Promise.all([context(cliConfig), context(libConfig)]);
  await Promise.all([cliCtx.watch(), libCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([build(cliConfig), build(libConfig)]);
}
