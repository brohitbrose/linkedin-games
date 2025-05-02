const esbuild = require('esbuild');

const contentScripts = [
  { entry: 'src/main/js/queens/queens.js', out: 'dist/queens.js' },
  { entry: 'src/main/js/zip/zip.js', out: 'dist/zip.js' },
  { entry: 'src/main/js/tango/tango.js', out: 'dist/tango.js' }
];

const buildBackgroundJsArgs = {
  bundle: true,
  entryPoints: ['src/main/js/navigationListener.js'],
  format: 'iife',
  outfile: 'dist/navigationListener.js'
};

const buildPopupJsArgs = {
    bundle: true,
    entryPoints: ['src/main/js/popup.js'],
    format: 'iife',
    outfile: 'dist/popup.js'
};

const buildPopupHtmlArgs = {
    bundle: true,
    entryPoints: ['src/assets/html/popup.html'],
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

esbuild.build(buildBackgroundJsArgs).catch(() => process.exit(1));
esbuild.build(buildPopupJsArgs).catch(() => process.exit(1));
esbuild.build(buildPopupHtmlArgs).catch(() => process.exit(1));
