// S05 · ε-closure (+ close → move → close traces) and S06 · ε-removal.
// S06 follows the course's method exactly: δ′(q,a) = ε-CL(δ(ε-CL(q), a)) and
// F′ = F plus q0 only (when ε-CL(q0) meets F).

import { EPS, EMPTY, setName, sortStates, machineToDot, accepts, pickTests, tracePath } from '../machine.js';
import { solveTrace } from './dfaTrace.js';

// Closure of every state, with the "add … add …" working the course writes out.
function closures(m) {
  const result = {};
  const lines = [];
  m.states.forEach(q => {
    const order = [q];
    const seen = new Set([q]);
    for (let i = 0; i < order.length; i++) {
      (m.delta[order[i]][EPS] || []).forEach(t => {
        if (!seen.has(t)) {
          seen.add(t);
          order.push(t);
        }
      });
    }
    result[q] = sortStates(seen, m.states);
    const chain = order.length > 1 ? `{${q}} → ${order.slice(1).map(x => `add ${x}`).join(' → ')} → nothing further` : `no ε-arrows out, but always itself`;
    lines.push(`ε-CL(${q}) = ${setName(result[q])}      ${chain}`);
  });
  // States on an ε-cycle share one closure
  const shared = {};
  m.states.forEach(q => (shared[setName(result[q])] = [...(shared[setName(result[q])] || []), q]));
  Object.values(shared)
    .filter(g => g.length > 1 && g.every(q => result[q].includes(q) && g.every(p => result[q].includes(p))))
    .forEach(g => lines.push(`${g.join(', ')} share one closure: they sit on an ε-cycle`));
  return { cl: result, lines };
}

function closureStep(m, cl, lines) {
  return {
    title: 'The ε-closure of every state',
    explain:
      'ε-CL(q) is every state you can reach from q for free, using ε-arrows only. It always contains q itself, and it follows chains to the end.',
    lines,
    table: [['state', 'ε-CL(state)'], ...m.states.map(q => [`${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`, setName(cl[q])])],
    graph: machineToDot(m),
    highlight: [],
    extra: {}
  };
}

function needEps(m) {
  if (!m.alphabet.includes(EPS)) throw new Error('This machine has no ε-moves, so there is nothing to remove. Add an ε (or "eps") column to the table.');
}

// ---------------- S05 ----------------
export function solveEpsClosure(m, strings = [], notes = {}) {
  needEps(m);
  const { cl, lines } = closures(m);
  const steps = [closureStep(m, cl, lines)];
  let tests = [];
  if (strings.length) {
    const traced = solveTrace(m, strings, notes);
    steps.push(...traced.steps.slice(1));
    tests = traced.tests;
  }
  const startHasF = cl[m.start].some(q => m.final.includes(q));
  steps.push({
    title: 'Is ε accepted?',
    explain: 'Before reading anything the machine can already be anywhere in ε-CL(q0).',
    lines: [
      `ε-CL(${m.start}) = ${setName(cl[m.start])}`,
      startHasF
        ? `it contains ${cl[m.start].filter(q => m.final.includes(q)).join(', ')} ∈ F  →  ε is accepted`
        : `it contains no state of F = ${setName(m.final)}  →  ε is rejected`
    ],
    graph: machineToDot(m),
    highlight: cl[m.start],
    extra: { machine: m }
  });
  if (!tests.length) {
    tests = pickTests(m).map(w => ({ input: w, path: tracePath(m, w), accepted: accepts(m, w) }));
  }
  return {
    technique: 'eps_closure',
    session: 'S05',
    input_summary: `ε-NFA over {${m.alphabet.filter(a => a !== EPS).join(',')}}, start ${m.start}, F = ${setName(m.final)}`,
    facts: notes.facts || [],
    formal: '',
    steps,
    tests,
    language: notes.language || '',
    conclusion: `ε-CL(${m.start}) = ${setName(cl[m.start])}, so ε is ${startHasF ? 'accepted' : 'rejected'}.`
  };
}

// ---------------- S06 ----------------
export function solveEpsRemoval(m, notes = {}) {
  needEps(m);
  const S = m.alphabet.filter(a => a !== EPS);
  const { cl, lines } = closures(m);
  const steps = [closureStep(m, cl, lines)];
  const close = set => sortStates(new Set([...set].flatMap(q => cl[q])), m.states);
  const move = (set, a) => sortStates(new Set(set.flatMap(q => m.delta[q][a] || [])), m.states);

  // δ′ one state at a time
  const dp = {};
  const rows = [];
  const seenRows = {};
  m.states.forEach((q, i) => {
    dp[q] = {};
    const ls = [];
    S.forEach(a => {
      const mv = move(cl[q], a);
      const res = close(mv);
      dp[q][a] = res;
      ls.push(`δ′(${q},${a}) = ε-CL( δ(${setName(cl[q])}, ${a}) ) = ε-CL(${setName(mv)}) = ${setName(res)}`);
    });
    const key = setName(cl[q]);
    if (seenRows[key]) ls.push(`same closure as ${seenRows[key]}, so the same row`);
    else seenRows[key] = q;
    rows.push(q);
    steps.push({
      title: `δ′ for ${q}`,
      explain:
        i === 0
          ? 'Close, move, close: start from ε-CL(q), take every move on the symbol, then close again. One line per entry.'
          : `Same recipe for ${q}: close, move, close.`,
      lines: ls,
      table: [
        ['state', ...S.map(a => `δ′(·,${a})`)],
        ...m.states.map(p => [p, ...S.map(a => (rows.includes(p) ? setName(dp[p][a]) : '…'))])
      ],
      highlight_cells: S.map((_, c) => [i + 1, c + 1]),
      graph: machineToDot(m),
      highlight: cl[q],
      extra: {}
    });
  });

  // F′: the course rule
  const hit = cl[m.start].filter(q => m.final.includes(q));
  const addStart = hit.length > 0 && !m.final.includes(m.start);
  const Fp = sortStates(new Set([...m.final, ...(hit.length ? [m.start] : [])]), m.states);
  steps.push({
    title: "F′: this is where the marks are",
    explain:
      'F′ = F, plus the start state if its closure contains an accepting state. Nothing else is added: δ′ already closes after every move, so the only moment it never sees is before the first symbol, the empty string.',
    lines: [
      `F = ${setName(m.final)}`,
      hit.length
        ? `ε-CL(${m.start}) = ${setName(cl[m.start])}, which contains ${hit.join(', ')} ∈ F  →  ${addStart ? `ADD ${m.start}` : `${m.start} is already in F`}`
        : `ε-CL(${m.start}) = ${setName(cl[m.start])} contains no state of F  →  no patch`,
      `F′ = ${setName(Fp)}`
    ],
    graph: machineToDot(m),
    highlight: cl[m.start],
    extra: {}
  });

  const nfa = { states: [...m.states], alphabet: S, start: m.start, final: Fp, delta: dp };
  steps.push({
    title: 'The ε-free NFA',
    explain: 'Same states, the δ′ table as its arrows, and F′ as its accepting states. No more ε-arrows.',
    lines: [`M′ = (Q, Σ, δ′, ${m.start}, ${setName(Fp)})`],
    table: [['state', ...S], ...m.states.map(q => [`${q === m.start ? '→ ' : ''}${Fp.includes(q) ? '* ' : ''}${q}`, ...S.map(a => setName(dp[q][a]))])],
    graph: machineToDot(nfa),
    highlight: addStart ? [m.start] : [],
    extra: {}
  });

  // Test both machines on the same strings
  const words = pickTests(nfa);
  const show = w => (w === '' ? 'ε' : w);
  steps.push({
    title: 'Test both machines on the same strings',
    explain: 'The two machines must agree on every string, including ε.',
    lines: words.map(w => {
      const a = accepts(m, w);
      const b = accepts(nfa, w);
      return `${show(w).padEnd(6)} ε-NFA: ${a ? 'ACCEPT' : 'reject'}    new NFA: ${b ? 'ACCEPT' : 'reject'}    ${a === b ? '✓' : '✗ DISAGREE'}`;
    }),
    graph: machineToDot(nfa),
    highlight: [],
    extra: { machine: nfa }
  });

  return {
    technique: 'eps_removal',
    session: 'S06',
    input_summary: `ε-NFA over {${S.join(',')}}, start ${m.start}, F = ${setName(m.final)}`,
    facts: notes.facts || [],
    formal: '',
    steps,
    tests: words.map(w => ({ input: w, path: tracePath(nfa, w), accepted: accepts(nfa, w) })),
    language: notes.language || '',
    conclusion: addStart
      ? `${m.start} joins F′ because ε-CL(${m.start}) contains ${hit.join(', ')}. F′ = ${setName(Fp)}.`
      : hit.length
      ? `${m.start} was already accepting, so F′ = F = ${setName(Fp)}.`
      : `No patch was needed: ε-CL(${m.start}) contains no accepting state, so F′ = F = ${setName(Fp)}.`
  };
}

export { EMPTY };
