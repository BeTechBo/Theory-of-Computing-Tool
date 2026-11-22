// Shared helpers for finite automata in the Technique Tutor.
//
// Machine shape used everywhere in the tutor:
//   { states: ['m0','m1'], alphabet: ['a','b'], start: 'm0', final: ['m1'],
//     delta: { m0: { a: ['m0','m1'], b: ['m0'] }, ... } }
// For a DFA every delta[q][a] is a one-element array.

export const EPS = 'ε';
export const EMPTY = '∅';

// ---------- parsing the course-style transition table ----------
//
//   state | a        | b
//   → m0  | {m0, m1} | {m0}
//     m1  | {m1}     | {m1, m2}
//   * m2  | {m2}     | {m2}
//
// "→" or "->" marks the start state, "*" marks accepting states.
// A cell is "{...}", a bare state name, "∅", "{}" or "-" (no move).
// Columns may be separated by "|" or tabs.
export function parseTransitionTable(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) throw new Error('Need a header row and at least one state row.');

  const split = l => l.split(/\s*[|\t]\s*/).map(c => c.trim()).filter((c, i, arr) => !(c === '' && (i === 0 || i === arr.length - 1)));

  const header = split(lines[0]);
  if (header.length < 2) throw new Error('Header must look like: state | a | b');
  const alphabet = header.slice(1).map(s => (s === 'eps' || s === 'e' || s === 'λ' ? EPS : s));

  const states = [];
  const final = [];
  let start = null;
  const delta = {};

  lines.slice(1).forEach((line, idx) => {
    const cells = split(line);
    if (cells.length !== header.length) {
      throw new Error(`Row ${idx + 1} ("${line}") has ${cells.length} columns, expected ${header.length}.`);
    }
    let name = cells[0];
    let isStart = false;
    let isFinal = false;
    // Strip markers in any order: "→*q0", "* → q0", "->q0"
    for (;;) {
      const m = name.match(/^(→|->|\*)\s*/);
      if (!m) break;
      if (m[1] === '*') isFinal = true;
      else isStart = true;
      name = name.slice(m[0].length);
    }
    if (!name) throw new Error(`Row ${idx + 1} has no state name.`);
    if (states.includes(name)) throw new Error(`State ${name} appears twice.`);
    states.push(name);
    if (isFinal) final.push(name);
    if (isStart) {
      if (start) throw new Error(`Two start states: ${start} and ${name}.`);
      start = name;
    }
    delta[name] = {};
    alphabet.forEach((sym, i) => {
      delta[name][sym] = parseCell(cells[i + 1]);
    });
  });

  if (!start) throw new Error('No start state. Mark it with → (or ->).');
  // Every target must be a declared state
  states.forEach(q =>
    alphabet.forEach(a =>
      delta[q][a].forEach(t => {
        if (!states.includes(t)) throw new Error(`δ(${q}, ${a}) mentions ${t}, which has no row.`);
      })
    )
  );
  return { states, alphabet, start, final, delta };
}

function parseCell(cell) {
  const c = cell.trim();
  if (['', '-', EMPTY, 'ø', '{}', '{ }', 'phi', 'empty', 'none'].includes(c.toLowerCase())) return [];
  const inner = c.startsWith('{') && c.endsWith('}') ? c.slice(1, -1) : c;
  return inner
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// ---------- sets of states ----------

export function sortStates(set, order) {
  return [...set].sort((x, y) => order.indexOf(x) - order.indexOf(y));
}

export function setName(arr) {
  return arr.length === 0 ? EMPTY : `{${arr.join(',')}}`;
}

export function isNfa(m) {
  return m.alphabet.includes(EPS) || m.states.some(q => m.alphabet.some(a => (m.delta[q][a] || []).length !== 1));
}

// ---------- running machines ----------

export function epsClosure(m, set) {
  const out = new Set(set);
  if (!m.alphabet.includes(EPS)) return out;
  const stack = [...set];
  while (stack.length) {
    const q = stack.pop();
    (m.delta[q]?.[EPS] || []).forEach(t => {
      if (!out.has(t)) {
        out.add(t);
        stack.push(t);
      }
    });
  }
  return out;
}

// Runs any NFA/ε-NFA/DFA. Returns the list of active-state sets, one per prefix.
export function runSets(m, w) {
  let cur = epsClosure(m, [m.start]);
  const trail = [sortStates(cur, m.states)];
  for (const ch of w) {
    const next = new Set();
    cur.forEach(q => (m.delta[q]?.[ch] || []).forEach(t => next.add(t)));
    cur = epsClosure(m, next);
    trail.push(sortStates(cur, m.states));
  }
  return trail;
}

export function accepts(m, w) {
  const trail = runSets(m, w);
  return trail[trail.length - 1].some(q => m.final.includes(q));
}

// All strings over the (non-ε) alphabet up to length n, shortest first.
export function stringsUpTo(alphabet, n) {
  const syms = alphabet.filter(a => a !== EPS);
  const out = [''];
  let layer = [''];
  for (let len = 1; len <= n; len++) {
    const nextLayer = [];
    layer.forEach(p => syms.forEach(a => nextLayer.push(p + a)));
    out.push(...nextLayer);
    layer = nextLayer;
  }
  return out;
}

// ---------- DOT output (the contract's "graph" field) ----------

const q = s => `"${String(s).replace(/"/g, '\\"')}"`;

// opts.fill: { state: '#hex' } colours states (e.g. by block when minimising)
// opts.label: { state: 'text' } shows a different label (e.g. "q0 / 1" for Moore)
export function machineToDot(m, opts = {}) {
  const lines = ['digraph {', '  rankdir=LR;', '  __start [shape=point, style=invis];'];
  m.states.forEach(s => {
    const fill = opts.fill?.[s] ? `, style=filled, fillcolor="${opts.fill[s]}"` : '';
    const label = opts.label?.[s] ? `, label=${q(opts.label[s])}` : '';
    lines.push(`  ${q(s)} [shape=${m.final.includes(s) ? 'doublecircle' : 'circle'}${fill}${label}];`);
  });
  lines.push(`  __start -> ${q(m.start)};`);
  // Merge parallel edges into one arrow with a combined label
  const edges = {};
  m.states.forEach(from =>
    m.alphabet.forEach(a =>
      (m.delta[from][a] || []).forEach(to => {
        const k = `${from}\u0000${to}`;
        (edges[k] = edges[k] || []).push(a);
      })
    )
  );
  Object.entries(edges).forEach(([k, syms]) => {
    const [from, to] = k.split('\u0000');
    const dashed = syms.every(s => s === EPS) ? ', style=dashed' : '';
    const lab = opts.edgeLabel ? opts.edgeLabel(from, to, syms) : syms.join(', ');
    lines.push(`  ${q(from)} -> ${q(to)} [label=${q(lab)}${dashed}];`);
  });
  lines.push('}');
  return lines.join('\n');
}

// Course-style text table (the same format the parser reads).
export function machineToTable(m) {
  const dfa = isDfa(m) && m.states.every(q => m.alphabet.every(a => (m.delta[q]?.[a] || []).length === 1));
  const head = ['state', ...m.alphabet];
  const rows = m.states.map(q => [
    `${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`,
    ...m.alphabet.map(a => {
      const t = m.delta[q]?.[a] || [];
      return t.length === 0 ? EMPTY : dfa ? t[0] : `{${t.join(', ')}}`;
    })
  ]);
  return [head, ...rows].map(r => r.join(' | ')).join('\n');
}

// Check and tidy a machine that came from outside (e.g. the AI analyzer).
export function normalizeMachine(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('No machine found.');
  const states = (obj.states || []).map(String);
  // Every way people (and the AI) write ε. The delta keys may use any of them too.
  const EPS_NAMES = ['', 'ε', 'eps', 'e', 'epsilon', 'λ', 'lambda', 'Λ'];
  const isEps = a => EPS_NAMES.includes(String(a).trim().toLowerCase()) || String(a) === 'Λ';
  const rawAlphabet = (obj.alphabet || []).map(String);
  const alphabet = [...new Set(rawAlphabet.map(a => (isEps(a) ? EPS : a)))];
  // ε-moves may appear in delta even if ε is missing from the alphabet
  if (!alphabet.includes(EPS) && Object.values(obj.delta || {}).some(row => Object.keys(row || {}).some(isEps))) alphabet.push(EPS);
  const start = String(obj.start ?? '');
  const final = (obj.final || []).map(String);
  if (!states.length) throw new Error('The machine has no states.');
  if (!alphabet.length) throw new Error('The machine has no alphabet.');
  if (!states.includes(start)) throw new Error(`The start state ${start || '(none)'} is not one of the states.`);
  final.forEach(f => {
    if (!states.includes(f)) throw new Error(`Accepting state ${f} is not one of the states.`);
  });
  const delta = {};
  states.forEach(q => {
    delta[q] = {};
    alphabet.forEach(a => {
      const row = obj.delta?.[q] || {};
      const keys = a === EPS ? Object.keys(row).filter(isEps) : [a];
      const arr = keys
        .flatMap(k => (Array.isArray(row[k]) ? row[k] : row[k] == null ? [] : [row[k]]))
        .map(String)
        .map(t => t.trim())
        .filter(t => t && t !== EMPTY && !/^(phi|empty|none|-)$/i.test(t));
      arr.forEach(t => {
        if (!states.includes(t)) throw new Error(`δ(${q}, ${a}) goes to ${t}, which is not a state.`);
      });
      delta[q][a] = [...new Set(arr)];
    });
  });
  return { states, alphabet, start, final, delta };
}

// Every cell holds at most one state and there are no ε-moves.
export function isDfa(m) {
  return !m.alphabet.includes(EPS) && m.states.every(q => m.alphabet.every(a => (m.delta[q][a] || []).length <= 1));
}

// States reachable from the start (following every symbol, ε included).
export function reachableStates(m) {
  const seen = new Set([m.start]);
  const stack = [m.start];
  while (stack.length) {
    const p = stack.pop();
    m.alphabet.forEach(a =>
      (m.delta[p][a] || []).forEach(t => {
        if (!seen.has(t)) {
          seen.add(t);
          stack.push(t);
        }
      })
    );
  }
  return m.states.filter(x => seen.has(x));
}

// Test strings for an acceptor: ε, the two shortest accepted, the two shortest
// rejected and one longer accepted string. Always includes a rejected one if any exists.
export function pickTests(m) {
  const pool = stringsUpTo(m.alphabet, 6);
  const acc = pool.filter(w => w && accepts(m, w));
  const rej = pool.filter(w => w && !accepts(m, w));
  const picked = ['', ...acc.slice(0, 2), ...rej.slice(0, 2)];
  const longer = acc.find(w => w.length >= 4 && !picked.includes(w));
  if (longer) picked.push(longer);
  return picked;
}

// A trace path like "q0 -a→ q1 -b→ q2" for a DFA (or "{…}" sets for an NFA).
export function tracePath(m, w) {
  const trail = runSets(m, w).map(set => (isDfa(m) && set.length === 1 ? set[0] : setName(set)));
  return trail.map((st, i) => (i === 0 ? st : `-${w[i - 1]}→ ${st}`)).join(' ');
}

export const BLOCK_COLOURS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fed7aa', '#a5f3fc', '#d9f99d', '#fecaca', '#e9d5ff'];
export const letter = i => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
