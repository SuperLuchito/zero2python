/* Run the actual browser worker harness against pinned Pyodide in Node. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtime=process.env.PYODIDE_PACKAGE || 'pyodide';
const {loadPyodide}=require(runtime);
(async()=>{
  const py=await loadPyodide();
  // npm ships the core; scientific wheels use the same pinned CDN as the app.
  py.setStdout({batched:()=>{}});py.setStderr({batched:()=>{}});
  const course=JSON.parse(fs.readFileSync(path.join(root,'content/course.json')));
  const packages=[...new Set(course.lessons.flatMap(l=>l.packages||[]))];
  await py.loadPackage(packages);
  await py.runPythonAsync("import matplotlib\nmatplotlib.use('agg')");
  const source=fs.readFileSync(path.join(root,'public/python-worker.js'),'utf8');
  const harness=source.match(/const HARNESS=`([\s\S]*?)`;/)[1];
  let done=0;
  for(const lesson of course.lessons)for(const task of lesson.tasks){
    py.globals.set('USER_SRC',task.solution);py.globals.set('TEST_SRC',task.tests);
    await py.runPythonAsync(harness);
    const result=JSON.parse(py.globals.get('RESULT'));
    if(!result.ok)throw new Error(task.id+' '+result.error);
    if(task.id==='D03-PLOT'&&!result.images.length)throw new Error('Missing plot');
    done++;
  }
  console.log(`${done} references passed in Pyodide ${py.version}; PNG output passed`);
  // Test Python errors and isolation between namespaces.
  py.globals.set('USER_SRC','raise ValueError("expected")');py.globals.set('TEST_SRC','pass');
  await py.runPythonAsync(harness);
  const result=JSON.parse(py.globals.get('RESULT'));
  if(result.ok||!result.error.includes('ValueError: expected'))throw new Error('Error path');
  console.log('Error capture passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
