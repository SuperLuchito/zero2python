const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(js,{exports,require:name=>name==='@/lib/highlight'?load('lib/highlight.ts'):require(name)});return exports;}
const {Markdown}=load('components/Markdown.tsx');
const html=renderToStaticMarkup(React.createElement(Markdown,{text:'# Заголовок\n\n**Контракт** и `value`\n\n| x | y |\n| --- | --- |\n| 1 | 2 |\n\n```python\ndef f(x):\n    return x + 1\n```\n\n<script>alert(1)</script>\n\n[опасно](javascript:alert)\n\n<details><summary>Проверка</summary>\nТекст ответа\n</details>'}));
assert(html.includes('<table>')&&html.includes('<strong>Контракт</strong>'));
assert(html.includes('tok-kw')&&html.includes('<details>'));
assert(!html.includes('<script>')&&!html.includes('href="javascript:'));
assert(html.includes('&lt;script&gt;'));
console.log('Markdown: headings, table, code, details and HTML/link safety passed');
