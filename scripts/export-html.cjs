const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('drizzle-kit')] }));
const tailwindPath = require.resolve('@tailwindcss/postcss');
const postcss = require(require.resolve('postcss', { paths: [tailwindPath] }));
const tailwind = require(tailwindPath);

const root = path.resolve(__dirname, '..');
const marker = '<meta name="roguelite-html-export" content="1">';
const mime = { '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.ttf':'font/ttf', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
const isAsset = url => url.startsWith('/assets/') || url === '/chest.png';

function rewriteAssets(source, filename, references) {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      let text;
      if (isAsset(node.text)) {
        references.add(node.text);
        text = `__htmlAsset(${JSON.stringify(node.text)})`;
      } else {
        // Inline React style strings, e.g. backgroundImage: 'url(/assets/bg.png)'.
        const pieces = []; let cursor = 0;
        for (const match of node.text.matchAll(/url\(\s*['"]?(\/assets\/[^)'"\s]+)['"]?\s*\)/g)) {
          const start = match.index + match[0].indexOf(match[1]);
          pieces.push(JSON.stringify(node.text.slice(cursor,start)),`__htmlAsset(${JSON.stringify(match[1])})`);
          references.add(match[1]); cursor = start + match[1].length;
        }
        if (pieces.length) text = '('+pieces.concat(JSON.stringify(node.text.slice(cursor))).join(' + ')+')';
      }
      if (text) {
        if (ts.isJsxAttribute(node.parent)) text = `{${text}}`;
        edits.push({start:node.getStart(tree),end:node.end,text});
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  for (const edit of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  return edits.length ? `import { htmlAsset as __htmlAsset } from 'html-export-assets';\n${source}` : source;
}

function readAsset(url) {
  const filename = path.resolve(root, 'public', `.${url}`);
  const publicRoot = path.join(root, 'public') + path.sep;
  if (!filename.startsWith(publicRoot)) throw new Error(`Asset outside public: ${url}`);
  if (!fs.existsSync(filename) || !fs.readdirSync(path.dirname(filename)).includes(path.basename(filename))) {
    throw new Error(`Missing or case-mismatched asset: ${url}`);
  }
  const type = mime[path.extname(filename).toLowerCase()];
  if (!type) throw new Error(`Unsupported embedded asset: ${url}`);
  return `data:${type};base64,${fs.readFileSync(filename).toString('base64')}`;
}

async function exportHtml(output = path.join(root, 'index.html')) {
  if (fs.existsSync(output) && !fs.readFileSync(output,'utf8').includes(marker)) {
    throw new Error(`Refusing to overwrite a non-exported HTML file: ${output}`);
  }
  const references = new Set();
  const result = await esbuild.build({
    absWorkingDir:root, entryPoints:['src/standalone.tsx'], bundle:true,write:false,
    format:'iife',platform:'browser',target:'es2020',jsx:'automatic',minify:true,
    define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',
    plugins:[{name:'embedded-html-assets',setup(build){
      build.onResolve({filter:/^html-export-assets$/},()=>({path:'registry',namespace:'html-assets'}));
      build.onLoad({filter:/.*/,namespace:'html-assets'},()=>({contents:
        'export function htmlAsset(url) { if (!(url in __HTML_ASSETS__)) throw new Error("Unbundled asset: " + url); return __HTML_ASSETS__[url]; }',loader:'js'}));
      build.onLoad({filter:/\.[jt]sx?$/},args=>{
        if (!args.path.startsWith(path.join(root,'src')+path.sep)) return;
        const contents=rewriteAssets(fs.readFileSync(args.path,'utf8'),args.path,references);
        return {contents,loader:args.path.endsWith('tsx')?'tsx':args.path.endsWith('ts')?'ts':'js',resolveDir:path.dirname(args.path)};
      });
    }}],
  });
  const cssResult = await postcss([tailwind({base:root,optimize:true})]).process(
    fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),
    {from:path.join(root,'src/app/globals.css'),map:false}
  );
  const registry = Object.fromEntries([...references].sort().map(url=>[url,readAsset(url)]));
  const css = cssResult.css.replace(/url\(\s*(['"]?)(\/assets\/[^)'"\s]+)\1\s*\)/g,
    (_,quote,url)=>`url("${readAsset(url)}")`);
  const script = `const __HTML_ASSETS__=${JSON.stringify(registry)};\n${result.outputFiles[0].text}`;
  const html = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">${marker}
<meta name="viewport" content="width=device-width, initial-scale=1"><title>末日幸存者 · 离线版</title>
<style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body class="antialiased">
<div id="game-root"></div><noscript>请在启用 JavaScript 的浏览器中打开游戏。</noscript>
<script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>\n`;
  fs.writeFileSync(output,html);
  console.log(`HTML exported: ${path.relative(root,output)} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MiB, ${references.size} embedded assets)`);
  return {output,assetCount:references.size};
}

module.exports = {exportHtml,rewriteAssets,readAsset};
if (require.main === module) exportHtml().catch(error=>{console.error(error.message);process.exitCode=1;});
