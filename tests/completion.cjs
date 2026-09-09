const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/python-completion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
function get(s){return Array.from(exportsObject.variableSuggestions(s,s.length));}
assert.deepEqual(get('queued = 12\nqueue'),['queued']);
assert.deepEqual(get('def process(value):\n    val'),['value']);
assert.deepEqual(get('for frame in frames:\n    fra'),['frame']);
assert.deepEqual(get('print(1)\npri'),[]);
assert.deepEqual(get('queued = 2\n# que'),[]);
assert.deepEqual(get('queued = 2\n"que'),[]);
assert.deepEqual(get('fake = "hidden = 2"\nhid'),[]);
assert.deepEqual(get('queued = 2\nobj.que'),[]);
console.log('Variable completion: assignments, parameters, loops; no keywords, builtins, strings, comments or attributes');
