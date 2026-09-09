const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Worker:NodeWorker}=require('node:worker_threads');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const runtime=process.env.PYODIDE_PACKAGE;
if(!runtime)throw new Error('Set PYODIDE_PACKAGE to installed pyodide 0.26.4');
class WorkerAdapter {
  constructor(){
    this.inner=new NodeWorker(`
      const {parentPort}=require('node:worker_threads');
      const vm=require('node:vm');
      const fs=require('node:fs');
      const {loadPyodide:load}=require(${JSON.stringify(runtime)});
      global.loadPyodide=()=>load();
      global.importScripts=()=>{};
      global.self={postMessage:data=>parentPort.postMessage(data)};
      vm.runInThisContext(fs.readFileSync(${JSON.stringify(path.join(root,'public/python-worker.js'))},'utf8'));
      parentPort.on('message',data=>self.onmessage({data}));
    `,{eval:true});
    this.inner.on('message',data=>this.onmessage?.({data}));
    this.inner.on('error',error=>this.onerror?.(error));
  }
  postMessage(data){this.inner.postMessage(data);}
  terminate(){this.inner.terminate();}
}
const exportsObject={};
const source=ts.transpileModule(fs.readFileSync(path.join(root,'lib/pyodide.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(source,{exports:exportsObject,Worker:WorkerAdapter,setTimeout,clearTimeout,console});
(async()=>{
  await exportsObject.bootPython([],()=>{});
  let result=await exportsObject.runOpen('print(6 * 7)');
  assert.equal(result.stdout.trim(),'42');assert.equal(result.ok,true);
  result=await exportsObject.runOpen('x = 1\nif True print(x)');
  assert.equal(result.ok,false);assert.equal(result.diagnostic.name,'SyntaxError');assert.equal(result.diagnostic.line,2);
  result=await exportsObject.runOpen('x = 1\nprint(x / 0)');
  assert.equal(result.diagnostic.name,'ZeroDivisionError');assert.equal(result.diagnostic.line,2);
  result=await exportsObject.runTests('def double(x):\n    return x', 'assert double(2) == 4');
  assert.equal(result.diagnostic.name,'AssertionError');assert.equal(result.diagnostic.line,null,'Checks must not highlight a student line');
  result=await exportsObject.runOpen('a = [1, 2, 3]\nfor a[-1] in a:\n    pass\nprint(a)');
  assert.equal(result.stdout.trim(),'[1, 2, 2]');
  assert(result.trace.some(s=>s.variables.a==='[1, 2, 1]'));
  assert(result.trace.some(s=>s.variables.a==='[1, 2, 2]'));
  assert(result.trace.every(s=>s.phase==='run'));
  result=await exportsObject.runTests('def double(x):\n    result = x * 2\n    return result', 'assert double(3) == 6');
  assert(result.trace.some(s=>s.phase==='checks'&&s.variables.result==='6'));
  result=await exportsObject.runOpen('for i in range(300):\n    value = i');
  assert.equal(result.trace.length,200);assert.equal(result.traceTruncated,true);assert.equal(result.ok,true);
  result=await exportsObject.runOpen('funcs = []\nfor i in range(3):\n    funcs.append(lambda: i)\nprint([f() for f in funcs])');
  assert.equal(result.stdout.trim(),'[2, 2, 2]');
  assert(result.trace.some(s=>s.variables['↳ return']==='2'));
  const start=Date.now();let ticks=0;const interval=setInterval(()=>ticks++,100);
  await assert.rejects(exportsObject.runOpen('while True: pass'),/15 секунд/);
  clearInterval(interval);
  assert(Date.now()-start>=14000);assert(ticks>100,'Parent event loop must stay responsive');
  result=await exportsObject.runOpen('print("recovered")');
  assert.equal(result.stdout.trim(),'recovered');
  console.log('Real Worker: normal execution, syntax/runtime/check diagnostics, 15s timeout, responsive parent and recovery passed');
  process.exit(0);
})().catch(error=>{console.error(error);process.exit(1);});
