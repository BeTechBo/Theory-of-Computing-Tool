// S02 · Designing a DFA: "the facts come first".
// The AI proposes the design (facts, arrows with reasons, a regex for L). Code then
// lays it out as the 5-step recipe and CHECKS it: complete, deterministic, and the
// machine agrees with the regex on every short string.

import { normalizeMachine, machineToDot, setName, accepts, pickTests, tracePath, isDfa, EMPTY } from '../machine.js';
import { checkRegex } from '../checks.js';

// design = { alphabet, states: [{ name, fact }], start, final, delta: { q: { a: p } }, reasons: { q: { a: text } }, regex }
export function solveDesign(design, description = '') {
  const names = (design.states || []).map(s => String(s.name ?? s));
  const facts = Object.fromEntries((design.states || []).map(s => [String(s.name ?? s), String(s.fact || '')]));
  const m = normalizeMachine({
    states: names,
    alphabet: design.alphabet,
    start: design.start,
    final: design.final,
    delta: Object.fromEntries(names.map(q => [q, Object.fromEntries((design.alphabet || []).map(a => [a, design.delta?.[q]?.[a] ?? []]))]))
  });
  const S = m.alphabet;
  const reason = (q, a) => {
    const r = String(design.reasons?.[q]?.[a] || '').trim().replace(/\.$/, '');
    return r.replace(/^because\s+/i, '').replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase());
  };
  const steps = [];

  steps.push({
    title: '① Name the facts',
    explain: 'Before drawing anything, decide what the machine must remember about the input read so far. Each fact becomes one state.',
    lines: names.map(q => `${q}: ${facts[q] || '(no fact given)'}`),
    table: [['state', 'fact about the input read so far'], ...names.map(q => [q, facts[q] || ''])],
    highlight: [],
    extra: {}
  });

  steps.push({
    title: '②③ One state per fact, and the start state',
    explain: 'The start state is the fact that is true before anything has been read (for the empty string ε).',
    lines: [`Q = ${setName(names)}  (${names.length} facts, ${names.length} states)`, `start = ${m.start}, because "${facts[m.start]}" is true for ε`],
    graph: machineToDot({ ...m, final: [], delta: Object.fromEntries(names.map(q => [q, {}])) }),
    highlight: [m.start],
    extra: {}
  });

  // Step 4: arrows, one state at a time (the diagram grows)
  const shown = {};
  names.forEach(q => {
    shown[q] = m.delta[q];
    steps.push({
      title: `④ Arrows out of ${q}`,
      explain: `One arrow per symbol. Each one says how the fact changes when that symbol is read.`,
      lines: S.map(a => {
        const to = m.delta[q][a];
        if (!to.length) return `${q} —${a}→ (missing!)`;
        return `${q} —${a}→ ${to.join(', ')}${reason(q, a) ? `   because ${reason(q, a)}` : ''}`;
      }),
      graph: machineToDot({ ...m, final: [], delta: Object.fromEntries(names.map(p => [p, shown[p] || {}])) }),
      highlight: [q],
      extra: {}
    });
  });

  const missing = names.flatMap(q => S.filter(a => !m.delta[q][a].length).map(a => `δ(${q}, ${a})`));
  const startAcc = m.final.includes(m.start);
  steps.push({
    title: '⑤ Mark the accepting states, then check',
    explain: 'A state is accepting when its fact means the string belongs to the language. Then check that the table is complete.',
    lines: [
      ...m.final.map(q => `${q} is accepting: ${facts[q]}`),
      `F = ${setName(m.final)}`,
      missing.length
        ? `|Q|×|Σ| = ${names.length}×${S.length} = ${names.length * S.length}, but ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing`
        : `|Q|×|Σ| = ${names.length}×${S.length} = ${names.length * S.length} transitions, and there are ${names.length * S.length} ✓`,
      `ε: zero moves, stays in ${m.start} ${startAcc ? '∈' : '∉'} F  →  ε is ${startAcc ? 'accepted' : 'rejected'}`
    ],
    table: [['state', ...S], ...names.map(q => [`${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`, ...S.map(a => m.delta[q][a].join(', ') || EMPTY)])],
    graph: machineToDot(m),
    highlight: m.final,
    extra: { machine: m }
  });

  const checks = [];
  if (missing.length) checks.push({ ok: false, text: `The design is incomplete: ${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} no arrow.` });
  if (!isDfa(m)) checks.push({ ok: false, text: 'The design is not deterministic: some state has two arrows on the same symbol.' });
  const rc = design.regex ? checkRegex(String(design.regex), m) : null;
  if (rc) checks.push(rc.ok ? rc : { ok: false, text: `The machine and the description disagree. ${rc.text}` });

  return {
    solution: {
      technique: 'dfa_design',
      session: 'S02',
      input_summary: description || 'DFA design',
      facts: names.map(q => ({ item: q, meaning: facts[q] })),
      formal: '',
      steps,
      tests: pickTests(m).map(w => ({ input: w, path: tracePath(m, w), accepted: accepts(m, w) })),
      language: `${description}${design.regex ? `  Regex: ${design.regex}` : ''}`.trim(),
      conclusion: `${names.length} states, one per fact. The start state is ${m.start}; F = ${setName(m.final)}.`
    },
    machine: m,
    checks
  };
}
