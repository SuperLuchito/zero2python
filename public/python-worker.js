/* Python runs outside the UI thread; the client can terminate infinite loops. */
const INDEX='https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
let python;
const HARNESS=`
import sys, io, traceback, json, base64, itertools, ast
_buffer = io.StringIO()
_error = ''
_diagnostic = None
_ok = False
_images = []
_trace = []
_trace_truncated = False
_pending_lines = {}
_phase = 'run'
def _display(value, depth=0):
    kind = type(value)
    if value is None or kind in (bool, int, float):
        return repr(value)[:160]
    if kind is str:
        return repr(value[:160])
    if depth < 2 and kind in (list, tuple):
        left, right = ('[', ']') if kind is list else ('(', ')')
        return left + ', '.join(_display(v, depth+1) for v in value[:12]) + (', …' if len(value)>12 else '') + right
    if depth < 2 and kind is dict:
        return '{' + ', '.join(_display(k,depth+1)+': '+_display(v,depth+1) for k,v in itertools.islice(value.items(), 12)) + (', …' if len(value)>12 else '') + '}'
    return '<' + kind.__name__ + '>'
def _record(frame, line, event, returned=None):
    global _trace_truncated
    if len(_trace) >= 200:
        _trace_truncated = True
        return
    values = {}
    for name, value in frame.f_locals.items():
        if name.startswith('__') or type(value).__name__ in ('function', 'module', 'type', 'builtin_function_or_method'):
            continue
        values[name] = _display(value)
        if len(values) >= 12:
            break
    if event == 'return' and frame.f_code.co_name != '<module>':
        values['↳ return'] = _display(returned)
    _trace.append(dict(line=line, event=event, phase=_phase, scope=frame.f_code.co_name, variables=values, stdout=_buffer.getvalue()[:4000]))
def _tracer(frame, event, arg):
    if frame.f_code.co_filename != 'solution.py':
        return None
    ident = id(frame)
    if event == 'line':
        previous = _pending_lines.get(ident)
        # CPython 3.12 inlines comprehensions; reading their parent locals here
        # can write an unbound temporary back into the frame (PEP 709).
        if previous is not None and frame.f_lineno not in _comprehension_lines:
            _record(frame, previous, 'line')
        _pending_lines[ident] = frame.f_lineno
    elif event in ('return', 'exception'):
        previous = _pending_lines.pop(ident, None)
        if previous is not None:
            _record(frame, previous, event, arg)
    return _tracer
_oldout, _olderr = sys.stdout, sys.stderr
sys.stdout = sys.stderr = _buffer
try:
    _ns = {'__name__': '__main__', '__student_source__': USER_SRC}
    _comprehension_lines = {line for node in ast.walk(ast.parse(USER_SRC, filename='solution.py')) if isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp)) for line in range(node.lineno, node.end_lineno + 1)}
    sys.settrace(_tracer)
    exec(compile(USER_SRC, 'solution.py', 'exec'), _ns)
    _phase = 'checks'
    exec(compile(TEST_SRC, 'checks.py', 'exec'), _ns)
    _ok = True
except BaseException as _exc:
    _error = traceback.format_exc()
    _frames = traceback.extract_tb(_exc.__traceback__)
    _student_frames = [_f for _f in _frames if _f.filename == 'solution.py']
    _line = _student_frames[-1].lineno if _student_frames else None
    if isinstance(_exc, SyntaxError) and _exc.filename == 'solution.py':
        _line = _exc.lineno
    _diagnostic = dict(name=type(_exc).__name__, message=str(_exc), line=_line)
finally:
    sys.settrace(None)
    sys.stdout, sys.stderr = _oldout, _olderr
    if 'matplotlib.pyplot' in sys.modules:
        import matplotlib.pyplot as _plt
        for _number in _plt.get_fignums()[:6]:
            _image = io.BytesIO()
            _plt.figure(_number).savefig(_image, format='png', bbox_inches='tight')
            _images.append('data:image/png;base64,' + base64.b64encode(_image.getvalue()).decode())
        _plt.close('all')
RESULT = json.dumps(dict(ok=_ok, stdout=_buffer.getvalue()[:60000], error=_error, diagnostic=_diagnostic, images=_images, trace=_trace, traceTruncated=_trace_truncated))
`;
self.onmessage=async ({data})=>{
  const {id,kind,packages=[],user='',tests='pass'}=data;
  try {
    if(!python){importScripts(INDEX+'pyodide.js');python=await loadPyodide({indexURL:INDEX});}
    if(kind==='boot') {
      if(packages.length)await python.loadPackage(packages);
      if(packages.includes('matplotlib'))await python.runPythonAsync("import matplotlib\nmatplotlib.use('agg')");
      self.postMessage({id,result:true});return;
    }
    python.globals.set('USER_SRC',user);python.globals.set('TEST_SRC',tests);
    await python.runPythonAsync(HARNESS);
    self.postMessage({id,result:JSON.parse(python.globals.get('RESULT'))});
  }catch(error){self.postMessage({id,error:String(error)});}
};
