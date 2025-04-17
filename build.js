const esbuild = require('esbuild');

const entries = [
  { entry: 'src/js/queens/queens.js', out: 'dist/queens.js' },
  { entry: 'src/js/zip/zip.js', out: 'dist/zip.js' },
];

entries.forEach(({ entry, out }) => {
  esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    outfile: out,
  }).catch(() => process.exit(1));
});
