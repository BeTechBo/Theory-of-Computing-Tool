// Shared helpers for pushdown automata in the Technique Tutor (S20–S21, Noor).
//
// PDA shape used everywhere:
//   { states: ['q0','q1','q2'], input: ['a','b'], stack: ['X','Z'], start: 'q0', bottom: 'Z',
//     final: ['q2'], accept: 'final' | 'empty',
//     transitions: [{ from: 'q0', read: 'a', pop: 'Z', to: 'q0', push: ['X','Z'] }] }
// read '' is an ε-move. push is written TOP FIRST (the course's convention); [] means pop.
// A configuration (ID) is { state, pos, stack } with the stack top first.

export const EPS = 'ε';
const EPS_WORDS = ['ε', 'eps', 'epsilon', 'λ', 'lambda', 'Λ', '^', '""', "''", 'empty'];
const isEpsWord = s => EPS_WORDS.includes(s) || EPS_WORDS.includes(s.toLowerCase());

// "aab, ba, ε" → ['aab', 'ba', '']
export function wordList(s) {
  return [...new Set(s.split(/[,\s]+/).map(x => x.trim().replace(/^["'“](.*)["'”]$/, '$1')).filter(x => x !== '').map(x => (isEpsWord(x) ? '' : x)))];
}

// ---------- text → PDA ----------
//
//   δ(q0, a, Z) = (q0, XZ)            also "delta(…)", "d(…)", several targets in { … },
//   δ(q0, b, X) = (q1, ε)             or the short form  q0, a, Z -> q0, XZ
//   δ(q1, ε, Z) = (q2, Z)
//   start: q0      bottom: Z      final: q2      accept: final state | empty stack
//   strings: aabb, abab
// The 7-tuple  M = ({q0,q1,q2}, {a,b}, {X,Z}, δ, q0, Z, {q2})  is read too.
const DELTA = /(?:^|[^A-Za-z])(?:δ|∂|delta|d)\s*\(\s*([^,()]+?)\s*,\s*([^,()]*?)\s*,\s*([^,()]+?)\s*\)\s*(?:=|∋|→|->|:)\s*(.+)$/i;
const SHORT = /^\(?\s*([^,()\s]+)\s*,\s*([^,()\s]*)\s*,\s*([^,()\s]+)\s*\)?\s*(?:→|->|⊢|=>)\s*\(?\s*([^,()\s]+)\s*,\s*([^,()]*?)\s*\)?$/;
const TUPLE = /\(\s*\{([^}]*)\}\s*,\s*\{([^}]*)\}\s*,\s*\{([^}]*)\}\s*,\s*[^,{}]+,\s*([^,\s{}]+)\s*,\s*([^,\s{}]+)\s*,\s*(\{[^}]*\}|∅|ø)\s*\)/;

export const looksLikePda = text => text.split('\n').some(l => DELTA.test(l) || SHORT.test(l.trim()));

export function parsePda(text) {
  const list = s => s.replace(/[{}]/g, '').split(',').map(x => x.trim()).filter(Boolean);
  const d = { states: [], input: [], stack: [], start: null, bottom: null, final: null, accept: null };
  const raw = []; // { from, read, pop, to, push (text) }
  const strings = [];

  const tup = text.match(TUPLE);
  if (tup) Object.assign(d, { states: list(tup[1]), input: list(tup[2]), stack: list(tup[3]), start: tup[4], bottom: tup[5], final: /^[∅ø]$/.test(tup[6]) ? [] : list(tup[6]) });

  text.split('\n').forEach(line0 => {
    const line = line0.trim().replace(/[;.]\s*$/, '');
    if (!line) return;
    let m;
    if ((m = line.match(DELTA))) {
      const targets = [...m[4].matchAll(/\(\s*([^,()]+?)\s*,\s*([^()]*?)\s*\)/g)];
      if (targets.length) targets.forEach(t => raw.push({ from: m[1], read: m[2], pop: m[3], to: t[1], push: t[2] }));
      else {
        const [to, push = ''] = m[4].replace(/[{}]/g, '').split(',').map(x => x.trim());
        if (to) raw.push({ from: m[1], read: m[2], pop: m[3], to, push });
      }
      return;
    }
    if ((m = line.match(SHORT))) return void raw.push({ from: m[1], read: m[2], pop: m[3], to: m[4], push: m[5] });
    if ((m = line.match(/^(?:strings?|inputs?|tests?|words?|trace|run)\s*[:=]\s*(.*)$/i))) return void strings.push(...wordList(m[1]));
    if (/^(?:accept|acceptance|mode)/i.test(line) && (m = line.match(/(empty\s*stack|final\s*state)/i))) return void (d.accept = /empty/i.test(m[1]) ? 'empty' : 'final');
    if ((m = line.match(/^(?:start|initial)(?:\s+state)?\s*[:=]\s*(\S+)$/i))) return void (d.start = m[1]);
    if ((m = line.match(/^(?:z0|z₀|bottom(?:\s+marker)?|stack\s+start|start\s+stack|initial\s+stack)(?:\s+symbol)?\s*[:=]\s*(\S+)$/i))) return void (d.bottom = m[1]);
    if ((m = line.match(/^(?:final|accepting|accept)(?:\s+states?)?\s*[:=]\s*(.*)$/i)) || (m = line.match(/^F\s*=\s*(.*)$/))) return void (d.final = /^(∅|ø|none|\{\s*\})$/i.test(m[1].trim()) ? [] : list(m[1]));
    if (/by\s+empty\s+stack/i.test(line)) d.accept = 'empty';
    else if (/by\s+final\s+state/i.test(line)) d.accept = 'final';
  });
  if (!raw.length) throw new Error('I could not find any transitions. Write them like  δ(q0, a, Z) = (q0, XZ)  one per line (the stack string is written top first).');

  const eIsSymbol = d.input.includes('e');
  const readOf = s => (s === '' || isEpsWord(s) || (s === 'e' && !eIsSymbol) ? '' : s);
  const known = [...new Set([...d.stack, ...raw.map(t => t.pop)])].sort((a, b) => b.length - a.length);
  const pushOf = s => {
    const str = s.replace(/\s+/g, '');
    if (str === '' || isEpsWord(str) || (str === 'e' && !known.includes('e'))) return [];
    const out = [];
    for (let i = 0; i < str.length; ) {
      const sym = known.find(k => str.startsWith(k, i)) || str.slice(i).match(/^[A-Za-z][0-9₀-₉]*['′]*|^./u)[0];
      out.push(sym);
      i += sym.length;
    }
    return out;
  };
  const transitions = [];
  raw.forEach(t => {
    const tr = { from: t.from, read: readOf(t.read), pop: t.pop, to: t.to, push: pushOf(t.push) };
    if (!transitions.some(o => sameTransition(o, tr))) transitions.push(tr);
  });

  const uniq = arr => [...new Set(arr)];
  const states = uniq([...d.states, ...transitions.flatMap(t => [t.from, t.to])]);
  const stack = uniq([...d.stack, ...transitions.flatMap(t => [t.pop, ...t.push])]);
  const start = d.start || states.find(q => /^q[_]?(0|s|₀|start)$/i.test(q)) || transitions[0].from;
  const popped = transitions.filter(t => t.from === start).map(t => t.pop);
  const bottom = d.bottom || ['Z0', 'Z₀', 'Z', '$', '⊥', '#'].find(z => popped.includes(z)) || popped[0] || stack[0];
  const final = (d.final || []).filter(Boolean);
  const pda = {
    states,
    input: uniq([...d.input, ...transitions.map(t => t.read).filter(Boolean)]),
    stack,
    start,
    bottom,
    final,
    accept: d.accept || (final.length ? 'final' : 'empty'),
    transitions
  };
  if (!pda.states.includes(pda.start)) throw new Error(`The start state ${pda.start} has no transitions.`);
  pda.final.forEach(f => {
    if (!pda.states.includes(f)) pda.states.push(f);
  });
  return { pda, strings };
}

// Check and tidy a PDA that came from outside (the AI analyzer): transitions are δ(...) strings.
export function normalizePda(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('No PDA found.');
  const lines = (obj.transitions || []).map(String);
  const head = [
    obj.start ? `start: ${obj.start}` : '',
    obj.bottom ? `bottom: ${obj.bottom}` : '',
    Array.isArray(obj.final) ? `final: ${obj.final.join(', ') || '∅'}` : '',
    obj.accept ? `accept: ${/empty/i.test(obj.accept) ? 'empty stack' : 'final state'}` : ''
  ].filter(Boolean);
  return parsePda([...lines, ...head].join('\n')).pda;
}

// ---------- PDA → text ----------
export const sameTransition = (a, b) => a.from === b.from && a.read === b.read && a.pop === b.pop && a.to === b.to && a.push.join(' ') === b.push.join(' ');
export const stackStr = arr => (arr.length === 0 ? EPS : arr.some(s => s.length > 1) ? arr.join(' ') : arr.join(''));
export const transStr = t => `δ(${t.from}, ${t.read || EPS}, ${t.pop}) = (${t.to}, ${stackStr(t.push)})`;
export const labelStr = t => `${t.read || EPS}, ${t.pop} → ${stackStr(t.push)}`;
export const idStr = (c, w) => `(${c.state}, ${w.slice(c.pos) || EPS}, ${stackStr(c.stack)})`;
export const setStr = arr => (arr.length ? `{${arr.join(', ')}}` : '∅');
export const tupleStr = (p, name = 'M') => `${name} = (${setStr(p.states)}, ${setStr(p.input)}, ${setStr(p.stack)}, δ, ${p.start}, ${p.bottom}, ${setStr(p.accept === 'empty' ? [] : p.final)})`;
export const pdaText = p =>
  [...p.transitions.map(transStr), `start: ${p.start}`, `bottom: ${p.bottom}`, `final: ${p.final.join(', ') || '∅'}`, `accept: ${p.accept === 'empty' ? 'empty stack' : 'final state'}`].join('\n');

// What one move does to the stack, in words.
export function effect(t) {
  if (t.push.length === 0) return `pop ${t.pop}`;
  if (t.push.length === 1 && t.push[0] === t.pop) return 'leave the stack alone';
  if (t.push[t.push.length - 1] === t.pop) return `push ${stackStr(t.push.slice(0, -1))} on top of ${t.pop}`;
  return `replace ${t.pop} by ${stackStr(t.push)}`;
}

const dq = s => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
export function pdaToDot(p) {
  const L = ['digraph {', '  rankdir=LR;', '  __start [shape=point, style=invis];'];
  p.states.forEach(s => L.push(`  ${dq(s)} [shape=${p.accept === 'final' && p.final.includes(s) ? 'doublecircle' : 'circle'}];`));
  L.push(`  __start -> ${dq(p.start)};`);
  const edges = {};
  p.transitions.forEach(t => (edges[`${t.from}\u0000${t.to}`] ||= []).push(labelStr(t)));
  Object.entries(edges).forEach(([k, labs]) => {
    const [f, t] = k.split('\u0000');
    L.push(`  ${dq(f)} -> ${dq(t)} [label="${labs.map(l => l.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).join('\\n')}"];`);
  });
  L.push('}');
  return L.join('\n');
}

// ---------- running ----------
export const startConfig = p => ({ state: p.start, pos: 0, stack: [p.bottom] });
export const movesFrom = (p, c, w) => (c.stack.length ? p.transitions.filter(t => t.from === c.state && t.pop === c.stack[0] && (t.read === '' || t.read === w[c.pos])) : []);
export const applyMove = (c, t) => ({ state: t.to, pos: c.pos + (t.read === '' ? 0 : 1), stack: [...t.push, ...c.stack.slice(1)] });
export const isAccepting = (p, c, w) => c.pos === w.length && (p.accept === 'empty' ? c.stack.length === 0 : p.final.includes(c.state));

// Why a configuration with no move (or with the input finished) is not an accepting one.
export function stuckReason(p, c, w) {
  const rest = w.slice(c.pos);
  const top = c.stack[0];
  if (!c.stack.length) return rest ? `the stack is empty but ${rest} is still unread, so no move is possible` : `the stack is empty, but ${c.state} ∉ F`;
  if (rest) return `there is no transition δ(${c.state}, ${rest[0]}, ${top}) and no ε-move on ${top}, but ${rest} is still unread`;
  return p.accept === 'empty' ? `the input is finished but the stack still holds ${stackStr(c.stack)}, and there is no ε-move on ${top}` : `the input is finished, but ${c.state} ∉ F and there is no ε-move on ${top}`;
}

// Breadth-first search over configurations: the shortest accepting run, or (when there is
// none) the dead end that got furthest. `truncated` means a limit was hit, so "rejected" is not certain.
export function search(p, w, { from = null, maxConfigs = 20000, maxStack = null } = {}) {
  const first = from || startConfig(p);
  const cap = maxStack ?? Math.max(24, 3 * w.length + 12);
  const keyOf = c => `${c.state}\u0001${c.pos}\u0001${c.stack.join('\u0002')}`;
  const nodes = [{ c: first, parent: -1, via: null }];
  const seen = new Set([keyOf(first)]);
  const dead = [];
  let truncated = false;
  const pathTo = i => {
    const out = [];
    for (let k = i; k >= 0; k = nodes[k].parent) out.unshift({ c: nodes[k].c, via: nodes[k].via });
    return out;
  };
  for (let i = 0; i < nodes.length; i++) {
    const { c } = nodes[i];
    if (isAccepting(p, c, w)) return { accepted: true, path: pathTo(i), truncated, explored: nodes.length };
    const ms = movesFrom(p, c, w);
    if (!ms.length) dead.push(i);
    for (const t of ms) {
      const next = applyMove(c, t);
      if (next.stack.length > cap || nodes.length >= maxConfigs) {
        truncated = true;
        continue;
      }
      const k = keyOf(next);
      if (seen.has(k)) continue;
      seen.add(k);
      nodes.push({ c: next, parent: i, via: t });
    }
  }
  const depth = i => pathTo(i).length;
  const best = dead.sort((a, b) => nodes[b].c.pos - nodes[a].c.pos || depth(a) - depth(b))[0];
  const stuck = best === undefined ? null : { path: pathTo(best), reason: stuckReason(p, nodes[best].c, w) };
  return { accepted: false, path: null, stuck, truncated, explored: nodes.length };
}

export const pdaAccepts = (p, w) => search(p, w).accepted;

// For a nondeterministic PDA: a branch that leaves the accepting run at a choice point and dies.
export function failingBranch(p, w, acceptPath) {
  for (let i = 0; i < acceptPath.length - 1; i++) {
    const c = acceptPath[i].c;
    const taken = acceptPath[i + 1].via;
    for (const alt of movesFrom(p, c, w)) {
      if (sameTransition(alt, taken)) continue;
      const res = search(p, w, { from: applyMove(c, alt), maxConfigs: 4000 });
      if (res.accepted || !res.stuck) continue;
      const tail = res.stuck.path.map((x, k) => (k === 0 ? { c: x.c, via: alt } : x));
      return { at: i, alt, taken, path: [...acceptPath.slice(0, i + 1), ...tail], reason: res.stuck.reason };
    }
  }
  return null;
}

// The two determinism rules of S20.
export function determinism(p) {
  const groups = {};
  p.transitions.forEach(t => (groups[`${t.from}\u0000${t.read}\u0000${t.pop}`] ||= []).push(t));
  const rule1 = Object.values(groups).filter(ts => ts.length > 1);
  const rule2 = p.transitions
    .filter(t => t.read === '')
    .map(e => ({ eps: e, clash: p.transitions.filter(t => t.read !== '' && t.from === e.from && t.pop === e.pop) }))
    .filter(x => x.clash.length);
  return { rule1, rule2, deterministic: !rule1.length && !rule2.length };
}

// One frame of the stack film strip (plan §4: steps[].extra.stack).
export function frameOf(c, w, via = null, note = '') {
  const added = via ? Math.max(0, via.push.length - (via.push[via.push.length - 1] === via.pop ? 1 : 0)) : 0;
  return {
    state: c.state,
    rest: w.slice(c.pos),
    pos: c.pos,
    stack: [...c.stack],
    via: via ? labelStr(via) : '',
    kind: !via ? 'start' : via.push.length === 0 ? 'pop' : via.push.length === 1 && via.push[0] === via.pop ? 'keep' : 'push',
    fresh: via && !(via.push.length === 1 && via.push[0] === via.pop) ? (via.push[via.push.length - 1] === via.pop ? added : via.push.length) : 0,
    popped: via && via.push[via.push.length - 1] !== via.pop ? via.pop : '',
    note
  };
}
