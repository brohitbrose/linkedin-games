const esbuild = require('esbuild');

const contentScripts = [
  { entry: 'src/js/queens/queens.js', out: 'dist/queens.js' },
  { entry: 'src/js/zip/zip.js', out: 'dist/zip.js' },
];

const buildPopupJsArgs = {
    bundle: true,
    entryPoints: ['src/js/popup.js'],
    format: 'iife',
    outfile: 'dist/popup.js'
};

const buildPopupHtmlArgs = {
    bundle: true,
    entryPoints: ['src/html/popup.html'],
    loader: { '.html': 'copy' },
    outfile: 'dist/popup.html'
};

contentScripts.forEach(({ entry, out }) => {
  esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    outfile: out,
  }).catch(() => process.exit(1));
});

esbuild.build(buildPopupJsArgs).catch(() => process.exit(1));
esbuild.build(buildPopupHtmlArgs).catch(() => process.exit(1));
