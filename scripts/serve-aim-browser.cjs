// Local-only manual/browser verification. Does not start Next or kill occupied ports.
const path = require('node:path');
const http = require('node:http');
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('drizzle-kit')] }));
const root = path.join(__dirname, '..');
const bundle = esbuild.buildSync({entryPoints:[path.join(root,'tests/aim-browser.tsx')],bundle:true,
  write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}}).outputFiles[0].contents;
const html = '<!doctype html><meta charset="utf-8"><title>移动散布验收</title><style>body{margin:16px;background:#171b21;color:#fff;font:16px system-ui}button{margin:0 8px 12px 0;padding:8px}output{display:block;margin-bottom:12px}canvas{display:block;border:1px solid #68727c}</style><div id="root"></div><script src="/fixture.js"></script>';
const server = http.createServer((req,res)=>{
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle);}
  else if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
  else{res.statusCode=404;res.end();}
});
server.listen(3101,'127.0.0.1',()=>console.log('Aim fixture: http://127.0.0.1:3101'));
