"""Compile authored Markdown and Python fixtures into the browser curriculum.
Run: python3 scripts/build-curriculum.py. No network or third-party packages.
"""
import ast, contextlib, importlib.util, inspect, io, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/curriculum'
def load(name, path):
    spec=importlib.util.spec_from_file_location(name,path); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
refs=load('foundation_refs',DOC/'author-solutions.py')
lessons=[]
modules=[]
for line in (DOC/'README.md').read_text().splitlines():
    if re.match(r'\| (P\d\d|D\d\d|ML\d\d|CV01|X01) \|',line):
        cells=[x.strip() for x in line.strip('|').split('|')]
        modules.append(dict(id=cells[0],title=cells[1].split(':')[0],blurb=cells[2],lessonIds=[]))
assert len(modules)==24
texts=re.split(r'^## (L\d\d)\. (.+)\n', (DOC/'python-foundations.md').read_text(), flags=re.M)
practices={m.group(1):(m.group(2),m.group(3)) for m in re.finditer(r'^### (L\d\d-T\d\d)\. ([^\n]+)\n([\s\S]*?)(?=^### L|^## L|\Z)',(DOC/'practice-foundations.md').read_text(),re.M)}
check='''import math\ndef _check(actual, expected):\n    assert type(actual) is type(expected), f"Ожидался тип {type(expected).__name__}, получен {type(actual).__name__}"\n    assert math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12) if isinstance(expected,float) else actual == expected, f"Ожидалось {expected!r}, получено {actual!r}"\n'''
solutions={}
for i in range(1,len(texts),3):
    lid,title,body=texts[i:i+3]; tasks=[]
    for n in range(1,5):
        tid=f'{lid}-T{n:02}'; ttitle,raw=practices[tid]
        starter=re.search(r'```python\n([\s\S]*?)```',raw).group(1)
        details=re.findall(r'<details><summary>(.*?)</summary>\s*([\s\S]*?)</details>',raw)
        prompt=raw.split('<details>')[0].replace('```python\n'+starter+'```','').strip()
        hints=[v.strip() for k,v in details if 'Подсказка' in k]
        debrief=next(v.strip() for k,v in details if 'Разбор' in k)
        if tid in refs.SCRIPT_TASKS:
            solution,cases=refs.SCRIPT_TASKS[tid]
            solution='\n'.join(f'{k} = {v!r}' for k,v in cases[0][0].items())+'\n'+solution
            tests=check+'''import ast, copy, contextlib, io
_source_tree=ast.parse(__student_source__)
for _inputs, _expected in CASES:
    _tree=copy.deepcopy(_source_tree)
    _seen=set()
    for _node in _tree.body:
        if isinstance(_node,ast.Assign) and len(_node.targets)==1 and isinstance(_node.targets[0],ast.Name):
            _name=_node.targets[0].id
            if _name in _inputs and _name not in _seen:
                _node.value=ast.parse(repr(_inputs[_name]),mode='eval').body
                _seen.add(_name)
    assert _seen == set(_inputs), "Сохраните исходные присваивания входных переменных в начале программы."
    _case_ns={"__name__":"__main__"}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(ast.fix_missing_locations(_tree),'solution.py','exec'),_case_ns)
    for _name,_value in _expected.items():
        assert _name in _case_ns, f"Не найден результат {_name}"
        _check(_case_ns[_name],_value)
'''.replace('CASES',repr(cases))
            prompt+='\n\n**Как проверяем:** входные присваивания автоматически заменяются несколькими наборами данных. Сохраните их имена и вычисляйте результат, не подставляйте готовые ответы.'
        else:
            fn,cases=refs.FUNCTION_TASKS[tid]; solution=inspect.getsource(fn)
            tests=check+f'''import contextlib, io
for _args,_expected in {cases!r}:
    _capture=io.StringIO()
    with contextlib.redirect_stdout(_capture):
        _actual={fn.__name__}(*_args)
    assert _capture.getvalue() == "", "Функция должна возвращать результат, а не печатать его."
    _check(_actual,_expected)
'''
        solutions[tid]=solution
        tasks.append(dict(id=tid,title=ttitle,prompt=prompt,starter=starter,examples=[],tests=tests,hint=hints[0],hints=hints,debrief=debrief,solution=solution))
    module=['P01','P01','P02','P03','P04','P05'][int(lid[1:])-1]
    # Keep prediction questions with their original explanation as collapsible reading checks.
    body=re.sub(r'\*\*Практика:\*\*[^\n]+','',body).strip()
    lessons.append(dict(id=lid,title=title,module=module,minutes=[20,25,25,30,30,35][int(lid[1:])-1],needsPandas=False,body=[],markdown=body,tasks=tasks))
if (DOC/'extended-curriculum.py').exists():
    ext=load('extended_curriculum',DOC/'extended-curriculum.py'); lessons.extend(ext.LESSONS)
lessons.sort(key=lambda l: (0,int(l["id"][1:])) if l["id"] in [f"L{i:02}" for i in range(1,7)] else (1,next(i for i,m in enumerate(modules) if m["id"]==l["module"])))
for lesson in lessons:
    if lesson["id"] == "L29": lesson["packages"] = ["sqlite3"]
    if lesson["id"] in ("L07","L08"): lesson["markdown"] = "**Предпосылки:** сначала пройдите вводные уроки L01–L06: этот практикум уже использует функции и циклы.\n\n" + lesson["markdown"]
    if lesson["id"] in ("C03","C04"): lesson["notebook"] = "/curriculum/"+lesson["id"]+".ipynb"
    next(m for m in modules if m['id']==lesson['module'])['lessonIds'].append(lesson['id'])
ids=[l['id'] for l in lessons]; tids=[t['id'] for l in lessons for t in l['tasks']]
assert len(set(ids))==len(ids) and len(set(tids))==len(tids)
assert all(m["lessonIds"] for m in modules), "Empty module"
failures=[]
for lesson in lessons:
    for task in lesson['tasks']:
        source=task['solution']; ns={'__name__':'__main__','__student_source__':source}
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(source,'solution.py','exec'),ns); exec(task['tests'],ns)
        except Exception as e: failures.append(f"{task['id']}: {type(e).__name__}: {e}")
if failures: raise AssertionError('\n'.join(failures))
(ROOT/'content/course.json').write_text(json.dumps(dict(modules=modules,lessons=lessons),ensure_ascii=False,indent=2)+'\n')
print(f'{len(modules)} modules, {len(lessons)} lessons, {len(tids)} tasks; all reference solutions passed')
