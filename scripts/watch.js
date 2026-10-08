const esbuild = require('esbuild');

async function watchBundle(entryPoint, outFile, label) {
  const context = await esbuild.context({
    entryPoints: [entryPoint],
    outfile: outFile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2017'],
    sourcemap: true,
    plugins: [{
      name: 'watch-reporter',
      setup(build) {
        build.onEnd(result => {
          console.log(`[${label}] rebuild ${result.errors.length ? 'failed' : 'succeeded'}`);
        });
      }
    }]
  });
  await context.watch();
  return context;
}

Promise.all([
  watchBundle('src/pear-pi.ts', 'bundle-pi.js', 'property-inspector'),
  watchBundle('src/pear-plugin.ts', 'bundle.js', 'plugin')
])
  .then(() => {
    console.log('Watching for changes...');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
