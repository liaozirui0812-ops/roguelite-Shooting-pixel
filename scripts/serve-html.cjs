// Optional local preview of the exported HTML. No Next, pnpm, installation or port killing.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const file = path.resolve(__dirname,'../index.html');
if (!fs.existsSync(file)) throw new Error('index.html is missing. Run node scripts/export-html.cjs first.');
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  if (pathname !== '/' && pathname !== '/index.html') {res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  fs.createReadStream(file).pipe(res);
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(3100,'127.0.0.1',()=>console.log('HTML game: http://127.0.0.1:3100 (Ctrl+C to stop)'));
