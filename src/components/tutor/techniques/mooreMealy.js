// S07 · Moore and Mealy machines: run them, and convert in both directions.
//
// Moore table: an output column      Mealy table: "next/output" in every cell
//   state | a  | b  | out              state | 0    | 1
//   → q0  | qa | q0 | N                → S0  | S0/0 | S1/0
//   qa    | qa | qab| N                S1    | S0/1 | S1/1
//   qab   | qa | q0 | Y
// Optional line: "input: abab" (several strings separated by commas).

const OUT_COL = /^(out|output|outputs|λ|lambda|print|prints)$/i;

export function looksLikeTransducer(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;
  const head = lines[0].split(/\s*[|\t]\s*/).map(c => c.trim());
  return head.some(h => OUT_COL.test(h)) || lines.slice(1).some(l => /\|\s*[^|/\s]+\s*\/\s*[^|/\s]+/.test(l));
}

export function parseTransducer(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const split = l => l.split(/\s*[|\t]\s*/).map(c => c.trim()).filter((c, i, a) => !(c === '' && (i === 0 || i === a.length - 1)));
  const head = split(lines[0]);
  const outIdx = head.findIndex(h => OUT_COL.test(h));
  const symCols = head.map((h, i) => i).filter(i => i > 0 && i !== outIdx);
  const alphabet = symCols.map(i => head[i]);
  const type = outIdx > 0 ? 'moore' : 'mealy';
  const states = [];
  const delta = {};
  const out = {};
  let start = null;
  lines.slice(1).forEach((line, r) => {
    const cells = split(line);
    if (cells.length !== head.length) throw new Error(`Row ${r + 1} ("${line}") has ${cells.length} columns, expected ${head.length}.`);
    let name = cells[0];
    let isStart = false;
    for (;;) {
      const m = name.match(/^(→|->|\*)\s*/);
      if (!m) break;
      if (m[1] !== '*') isStart = true;
      name = name.slice(m[0].length);
    }
    states.push(name);
    if (isStart) start = name;
    delta[name] = {};
    if (type === 'moore') out[name] = cells[outIdx];
    else out[name] = {};
    symCols.forEach(i => {
      const cell = cells[i].replace(/[{}]/g, '').trim();
      if (type === 'mealy') {
        const [to, o] = cell.split('/').map(x => x.trim());
        if (!to || o === undefined) throw new Error(`Cell "${cells[i]}" should look like next/output, e.g. q1/0.`);
        delta[name][head[i]] = to;
        out[name][head[i]] = o;
      } else delta[name][head[i]] = cell;
    });
  });
  if (!start) throw new Error('No start state. Mark it with → (or ->).');
  states.forEach(q => alphabet.forEach(a => {
    if (!states.includes(delta[q][a])) throw new Error(`δ(${q}, ${a}) goes to ${delta[q][a]}, which has no row.`);
  }));
  return { type, states, alphabet, start, delta, out };
}

// ---------- running ----------
function runMoore(M, w) {
  let q = M.start;
  const lines = [`start ${q}, print ${M.out[q]}`];
  const outs = [M.out[q]];
  for (const ch of w) {
    q = M.delta[q][ch];
    outs.push(M.out[q]);
    lines.push(`${ch} → ${q}, print ${M.out[q]}`);
  }
  return { lines, output: outs.join(' ') };
}
function runMealy(M, w) {
  let q = M.start;
  const outs = [];
  const parts = [q];
  for (const ch of w) {
    const o = M.out[q][ch];
    q = M.delta[q][ch];
    outs.push(o);
    parts.push(`-${ch}/${o}→ ${q}`);
  }
  return { lines: [parts.join(' ')], output: outs.join(' ') || '(nothing)' };
}

// ---------- diagrams / tables ----------
const qq = s => `"${String(s).replace(/"/g, '\\"')}"`;
function dot(M) {
  const L = ['digraph {', '  rankdir=LR;', '  __start [shape=point, style=invis];'];
  M.states.forEach(s => L.push(`  ${qq(s)} [shape=circle${M.type === 'moore' ? `, label=${qq(`${s} / ${M.out[s]}`)}` : ''}];`));
  L.push(`  __start -> ${qq(M.start)};`);
  const edges = {};
  M.states.forEach(s => M.alphabet.forEach(a => {
    const k = `${s}\u0000${M.delta[s][a]}`;
    (edges[k] = edges[k] || []).push(M.type === 'mealy' ? `${a}/${M.out[s][a]}` : a);
  }));
  Object.entries(edges).forEach(([k, labs]) => {
    const [f, t] = k.split('\u0000');
    L.push(`  ${qq(f)} -> ${qq(t)} [label=${qq(labs.join(', '))}];`);
  });
  L.push('}');
  return L.join('\n');
}
function table(M) {
  if (M.type === 'moore') return [['state', ...M.alphabet, 'output λ'], ...M.states.map(s => [`${s === M.start ? '→ ' : ''}${s}`, ...M.alphabet.map(a => M.delta[s][a]), M.out[s]])];
  return [['state', ...M.alphabet.map(a => `${a} (next/out)`)], ...M.states.map(s => [`${s === M.start ? '→ ' : ''}${s}`, ...M.alphabet.map(a => `${M.delta[s][a]}/${M.out[s][a]}`)])];
}
const drop1 = o => o.split(' ').slice(1).join(' ') || '(nothing)';
const show = w => (w === '' ? 'ε' : w);

// ---------- the solver ----------
export function solveMooreMealy(M, strings = []) {
  const words = strings.length ? strings : defaultWords(M.alphabet);
  const isMoore = M.type === 'moore';
  const steps = [];

  steps.push({
    title: isMoore ? 'The Moore machine' : 'The Mealy machine',
    explain: isMoore
      ? 'A Moore machine prints the output of the state it is in, including the start state before anything is read. So on a string w it prints |w| + 1 symbols.'
      : 'A Mealy machine prints on the arrow it takes, so it prints exactly one symbol per input symbol: |w| symbols.',
    lines: isMoore ? M.states.map(s => `λ(${s}) = ${M.out[s]}`) : M.states.flatMap(s => M.alphabet.map(a => `δ(${s},${a}) = ${M.delta[s][a]}, λ(${s},${a}) = ${M.out[s][a]}`)),
    table: table(M),
    graph: dot(M),
    highlight: [],
    extra: {}
  });

  const runs = {};
  words.forEach(w => {
    const r = isMoore ? runMoore(M, w) : runMealy(M, w);
    runs[w] = r.output;
    steps.push({
      title: `Run on "${show(w)}"`,
      explain: 'State the output length first, then write one move per line.',
      lines: [`|w| = ${w.length}, so the output has ${isMoore ? w.length + 1 : w.length} symbols`, ...r.lines, `output = ${r.output}`],
      graph: dot(M),
      highlight: [],
      extra: {}
    });
  });

  // ---------- conversion ----------
  let C;
  if (isMoore) {
    const out = {};
    const lines = [];
    M.states.forEach(s => {
      out[s] = {};
      M.alphabet.forEach(a => {
        const to = M.delta[s][a];
        out[s][a] = M.out[to];
        lines.push(`λ′(${s}, ${a}) = λ(δ(${s},${a})) = λ(${to}) = ${M.out[to]}`);
      });
    });
    C = { type: 'mealy', states: [...M.states], alphabet: M.alphabet, start: M.start, delta: M.delta, out };
    steps.push({
      title: 'Convert Moore → Mealy',
      explain: 'Keep the same states and arrows. Each arrow prints the output of the state it LANDS in: λ′(q, a) = λ(δ(q, a)). No new states are needed.',
      lines,
      table: table(C),
      graph: dot(C),
      highlight: [],
      extra: {}
    });
  } else {
    const Delta = [...new Set(M.states.flatMap(s => M.alphabet.map(a => M.out[s][a])))];
    const c0 = Delta[0];
    const name = (q, c) => `[${q},${c}]`;
    const startPair = name(M.start, c0);
    const order = [startPair];
    const info = { [startPair]: [M.start, c0] };
    const delta = {};
    const lines = [`start state: [${M.start}, c0] with c0 = ${c0} (any symbol works: it only changes the first output, which equivalence ignores)`];
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      const [q] = info[p];
      delta[p] = {};
      M.alphabet.forEach(a => {
        const to = name(M.delta[q][a], M.out[q][a]);
        delta[p][a] = to;
        lines.push(`δ′(${p}, ${a}) = [δ(${q},${a}), λ(${q},${a})] = ${to}`);
        if (!info[to]) {
          info[to] = [M.delta[q][a], M.out[q][a]];
          order.push(to);
        }
      });
    }
    const all = M.states.length * Delta.length;
    lines.push(`reachable pairs: ${order.length} of |Q|×|Δ| = ${M.states.length}×${Delta.length} = ${all}`);
    C = { type: 'moore', states: order, alphabet: M.alphabet, start: startPair, delta, out: Object.fromEntries(order.map(p => [p, info[p][1]])) };
    steps.push({
      title: 'Convert Mealy → Moore',
      explain: 'A Moore state must remember what was just printed, so its states are pairs [q, c]. λ′([q, c]) = c and δ′([q, c], a) = [δ(q, a), λ(q, a)]. A state splits when the arrows entering it print different symbols.',
      lines,
      table: table(C),
      graph: dot(C),
      highlight: [],
      extra: {}
    });
  }

  // ---------- check equivalence ----------
  const tests = [];
  const lines = words.map(w => {
    const a = runs[w];
    const b = C.type === 'mealy' ? runMealy(C, w).output : runMoore(C, w).output;
    const moore = isMoore ? a : b;
    const mealy = isMoore ? b : a;
    const ok = drop1(moore) === mealy;
    tests.push({ input: w, path: `Moore: ${moore}`, output: `Mealy: ${mealy}` });
    return `${show(w)}:  Moore ${moore}  →  without its first symbol: ${drop1(moore)}   |   Mealy ${mealy}   ${ok ? '✓ agree' : '✗ DISAGREE'}`;
  });
  steps.push({
    title: 'Check: the two machines agree',
    explain: 'Moore always prints one extra symbol at the start (before reading anything). Drop it, and the two outputs must be equal.',
    lines,
    graph: dot(C),
    highlight: [],
    extra: {}
  });

  return {
    technique: 'moore_mealy',
    session: 'S07',
    input_summary: `${isMoore ? 'Moore' : 'Mealy'} machine over {${M.alphabet.join(',')}}, start ${M.start}`,
    facts: [],
    formal: '',
    steps,
    tests,
    language: '',
    conclusion: isMoore
      ? `Moore → Mealy kept all ${M.states.length} states. On every test, the Moore output minus its first symbol equals the Mealy output.`
      : `Mealy → Moore needed ${C.states.length} states (pairs [q, c]). On every test, the Moore output minus its first symbol equals the Mealy output.`
  };
}

function defaultWords(alphabet) {
  const a = alphabet[0];
  const b = alphabet[1] || alphabet[0];
  return [`${a}${b}${a}${b}`, `${b}${a}${a}`];
}
