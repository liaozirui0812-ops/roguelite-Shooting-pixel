const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Tool-only TS loader: application build remains owned by Next.js.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    })
    .outputText.replace(
      /require\("@\/([^\"]+)"\)/g,
      (_match, relative) => `require(${JSON.stringify(path.join(root, 'src', relative))})`
    );
  module._compile(compiled, filename);
};
