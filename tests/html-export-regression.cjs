const {test} = require('node:test');
const assert = require('node:assert/strict');
const {rewriteAssets,readAsset} = require('../scripts/export-html.cjs');
const {loadImageAsset} = require('../src/game/assets/loader.ts');

test('HTML export rewrites asset values and JSX but preserves source imports and non-asset text',()=>{
  const references=new Set();
  const source=`import X from './component'; const path='/assets/tile1.png'; const node=<img src="/assets/pistol.png"/>; const plain='/api/example';`;
  const result=rewriteAssets(source,'example.tsx',references);
  assert.match(result,/import X from '\.\/component'/);
  assert.match(result,/__htmlAsset\("\/assets\/tile1.png"\)/);
  assert.match(result,/src=\{__htmlAsset\("\/assets\/pistol.png"\)\}/);
  assert.ok(result.includes("'/api/example'"));
  assert.deepEqual([...references],['/assets/tile1.png','/assets/pistol.png']);
  const untouched='const n=1;';assert.equal(rewriteAssets(untouched,'plain.ts',new Set()),untouched);
  const cssReferences=new Set();
  const css=rewriteAssets(`const style={backgroundImage:'url(/assets/bg.png)'}`,'style.ts',cssReferences);
  assert.match(css,/__htmlAsset\("\/assets\/bg.png"\)/);
  assert.deepEqual([...cssReferences],['/assets/bg.png']);
});

test('HTML embedded assets retain original bytes and reject missing/case-mismatched paths',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const data=readAsset('/assets/tile1.png');assert.ok(data.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(data.split(',')[1],'base64'),fs.readFileSync(path.join(__dirname,'../public/assets/tile1.png')));
  assert.throws(()=>readAsset('/assets/TILE1.png'),/Missing or case-mismatched/);
  assert.throws(()=>readAsset('/assets/missing-file.png'),/Missing or case-mismatched/);
  assert.throws(()=>readAsset('/../../outside.png'),/outside public/);
});

test('image loader keeps embedded data/blob URLs intact and keeps HTTP cache versions',async()=>{
  for(const url of ['data:image/png;base64,AAAA','blob:https://example.test/image','/assets/tile1.png','/assets/tile1.png?old=1']){
    let assigned='';const image={width:1,height:1,onload:null,onerror:null,
      set src(value){assigned=value;queueMicrotask(()=>this.onload?.());}};
    const result=await loadImageAsset({key:'embedded-test',src:url},new AbortController().signal,3,()=>image);
    assert.equal(result.status,'loaded');
    assert.equal(assigned,/^(data:|blob:)/.test(url)?url:url+(url.includes('?')?'&':'?')+'v=3');
  }
});
