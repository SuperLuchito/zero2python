const PY_KEYWORDS =
  "False|None|True|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightParams(inner: string) {
  const re =
    /("[^"\n]*"|'[^'\n]*'|\d[\w.]*)|([A-Za-z_]\w*)|([+\-*/%=<>!&|^~@:]+)|(.)/g;
  let out = "";
  for (const m of inner.matchAll(re)) {
    const [full, lit, name, op] = m;
    if (lit) out += `<span class="tok-str">${esc(lit)}</span>`;
    else if (name) out += `<span class="tok-param">${esc(name)}</span>`;
    else if (op) out += `<span class="tok-op">${esc(op)}</span>`;
    else out += esc(full);
  }
  return out;
}

// ponytail: regex highlighter, not a parser; nested f-strings/triple-quotes edge cases may mistint
export function highlightPython(code: string) {
  const re = new RegExp(
    [
      "(#[^\\n]*)",
      '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')',
      `\\b(def)(\\s+)([A-Za-z_]\\w*)(\\s*)(\\()([^()\\n]*)(\\))`,
      `\\b(${PY_KEYWORDS})\\b`,
      "\\b(\\d[\\w.]*)\\b",
      "([A-Za-z_]\\w*)(?=\\s*\\()",
      "([+\\-*/%=<>!&|^~@]+)",
      "([()\\[\\]{},.:;])",
    ].join("|"),
    "g",
  );
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, com, str, d, ds, name, ps, lp, params, rp, kw, num, fn, op] =
      m;
    if (com) out += `<span class="tok-com">${esc(com)}</span>`;
    else if (str) out += `<span class="tok-str">${esc(str)}</span>`;
    else if (d)
      out += `<span class="tok-kw">def</span>${esc(ds)}<span class="tok-fn">${esc(name)}</span>${esc(ps)}<span class="tok-punct">(</span>${highlightParams(params)}<span class="tok-punct">)</span>`;
    else if (kw) out += `<span class="tok-kw">${esc(kw)}</span>`;
    else if (num) out += `<span class="tok-str">${esc(num)}</span>`;
    else if (fn) out += `<span class="tok-fn">${esc(fn)}</span>`;
    else if (op) out += `<span class="tok-op">${esc(op)}</span>`;
    else out += `<span class="tok-punct">${esc(full)}</span>`;
  }
  return out + esc(code.slice(last));
}

