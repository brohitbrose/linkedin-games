const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// === CONFIG ===
const sharedOutputFiles = [
  // Meta
  'icon.png',
  // Content scripts
  'queens.js',
  'zip.js',
  'tango.js',
  // Static scripts
  'popup.js',
  // Background scripts
  'navigationListener.js',
  // Static
  'popup.html',
];
const distDir = 'dist';
const chromeDist = 'chrome-dist';
const firefoxDist = 'firefox-dist';

// === BUILD ENTRIES ===
const contentScripts = [
  { entry: 'src/main/js/queens/queens.js', out: `${distDir}/queens.js` },
  { entry: 'src/main/js/zip/zip.js', out: `${distDir}/zip.js` },
  { entry: 'src/main/js/tango/tango.js', out: `${distDir}/tango.js` },
];

const builds = [
  ...contentScripts,
  {
    entry: 'src/main/js/navigationListener.js',
    out: `${distDir}/navigationListener.js`,
  },
  {
    entry: 'src/main/js/popup.js',
    out: `${distDir}/popup.js`,
  },
];

const popupHtml = {
  entry: 'src/assets/html/popup.html',
  out: `${distDir}/popup.html`,
};

const icon = {
  entry: 'src/assets/meta/icon.png',
  out: `${distDir}/icon.png`,
};

// === BUILD STEP ===
async function runBuilds() {
  try {
    await Promise.all(
      builds.map(({ entry, out }) =>
        esbuild.build({
          entryPoints: [entry],
          bundle: true,
          format: 'iife',
          outfile: out,
        })
      )
    );

    await esbuild.build({
      entryPoints: [popupHtml.entry],
      bundle: true,
      loader: { '.html': 'copy' },
      outfile: popupHtml.out,
    });

    await esbuild.build({
      entryPoints: [icon.entry],
      bundle: true,
      loader: { '.png': 'copy' },
      outfile: icon.out,
    });

    copyBuildArtifacts();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// === COPY STEP ===
function copyBuildArtifacts() {

  // Copy correct manifest.json
  const manifestSrcDir = 'src/assets/meta';
  fs.copyFileSync(path.join(manifestSrcDir, 'manifest-chrome.json'),
      path.join(chromeDist, 'manifest.json'));
  fs.copyFileSync(path.join(manifestSrcDir, 'manifest-firefox.json'),
      path.join(firefoxDist, 'manifest.json'));

  // Copy all shared built files
  for (const file of sharedOutputFiles) {
    const sourcePath = path.join(distDir, file);
    fs.copyFileSync(sourcePath, path.join(chromeDist, file));
    fs.copyFileSync(sourcePath, path.join(firefoxDist, file));
  }

  console.log('Build complete. Outputs: chrome-dist/ and firefox-dist/');
}

// === RUN ===
runBuilds();
