// S01 · Tracing strings through a DFA (and, as a bonus, through an NFA / ε-NFA
// using the S05 "close → move → close" rule). Code computes every step.

import { EPS, EMPTY, setName, isNfa, epsClosure, sortStates, machineToDot, accepts, stringsUpTo } from '../machine.js';

const show = w => (w === '' ? EPS : w);

export function solveTrace(m, strings, notes = {}) {
  if (!strings.length) throw new Error('Give me at least one string to trace, e.g. "strings: aab, ba, ε".');
  const syms = m.alphabet.filter(a => a !== EPS);
  strings.forEach(w => {
    const bad = [...w].find(ch => !syms.includes(ch));
    if (bad) throw new Error(`"${w}" uses the symbol ${bad}, which is not in Σ = {${syms.join(', ')}}.`);
  });

  const nondet = isNfa(m);
  const hasEps = m.alphabet.includes(EPS);
  const steps = [];

  // Step: the machine and its formal definition
  const missing = [];
  m.states.forEach(q => syms.forEach(a => (m.delta[q][a] || []).length === 0 && missing.push(`δ(${q}, ${a})`)));
  steps.push({
    title: nondet ? 'The machine (an NFA)' : 'The machine (a DFA)',
    explain: nondet
      ? 'Some cells hold several states (or none), so this is an NFA: we follow the set of all states the machine could be in.'
      : 'Every cell holds exactly one state, so this is a DFA: each symbol moves us to exactly one next state.',
    lines: [
      `|Q|×|Σ| = ${m.states.length}×${syms.length} = ${m.states.length * syms.length} transitions`,
      missing.length
        ? `missing: ${missing.join(', ')} (a string that needs one of these dies there)`
        : 'every state has an arrow on every symbol: the table is complete'
    ],
    table: [
      ['state', ...m.alphabet],
      ...m.states.map(q => [
        `${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`,
        ...m.alphabet.map(a => fmtCell(m, m.delta[q][a] || [], nondet))
      ])
    ],
    graph: machineToDot(m),
    highlight: [m.start],
    extra: {}
  });

  // One step per string
  const tests = strings.map(w => {
    const lines = [];
    const visited = new Set();
    let pathText;
    let ok;
    if (!nondet) {
      let q = m.start;
      visited.add(q);
      const path = [q];
      if (w === '') lines.push(`ε has no symbols: zero moves, we stay in ${q}`);
      for (const ch of w) {
        const nxt = m.delta[q][ch][0];
        lines.push(`${q} —${ch}→ ${nxt}`);
        q = nxt;
        visited.add(q);
        path.push(q);
      }
      ok = m.final.includes(q);
      lines.push(`δ̂(${m.start}, ${show(w)}) = ${q} ${ok ? '∈' : '∉'} F = ${setName(m.final)}  →  ${ok ? 'accepted ✓' : 'rejected ✗'}`);
      pathText = path.join(' → ');
    } else {
      let cur = sortStates(epsClosure(m, [m.start]), m.states);
      if (hasEps) lines.push(`start: ε-CL(${m.start}) = ${setName(cur)}`);
      else lines.push(`start: {${m.start}}`);
      cur.forEach(s => visited.add(s));
      const path = [setName(cur)];
      if (w === '') lines.push('ε has no symbols: zero moves');
      for (const ch of w) {
        const moved = new Set();
        cur.forEach(q => (m.delta[q][ch] || []).forEach(t => moved.add(t)));
        const movedArr = sortStates(moved, m.states);
        const closed = sortStates(epsClosure(m, movedArr), m.states);
        lines.push(
          hasEps
            ? `${setName(cur)} —${ch}→ move = ${setName(movedArr)}, close = ${setName(closed)}`
            : `${setName(cur)} —${ch}→ ${setName(closed)}`
        );
        cur = closed;
        cur.forEach(s => visited.add(s));
        path.push(setName(cur));
      }
      const hit = cur.filter(q => m.final.includes(q));
      ok = hit.length > 0;
      lines.push(
        ok
          ? `final set ${setName(cur)} contains ${hit.join(', ')} ∈ F  →  accepted ✓`
          : `final set ${setName(cur)} contains no state of F  →  rejected ✗`
      );
      pathText = path.join(' → ');
    }
    steps.push({
      quiz: {
        question: `Before you look: is "${show(w)}" accepted?`,
        answer: ok ? 'accepted' : 'rejected',
        options: ['accepted', 'rejected'],
        why: lines[lines.length - 1]
      },
      title: `Trace "${show(w)}"`,
      explain:
        w === ''
          ? `The empty string makes zero moves, so it is accepted exactly when the start state${hasEps ? "'s ε-closure" : ''} is accepting.`
          : `Read the string one symbol at a time, writing every move on its own line.`,
      lines,
      graph: machineToDot(m),
      highlight: [...visited],
      extra: {}
    });
    return { input: w, path: pathText, accepted: ok };
  });

  // The contract wants at least one rejected test: add the shortest one if needed.
  if (!tests.some(t => !t.accepted)) {
    const rej = stringsUpTo(m.alphabet, 6).find(w => !accepts(m, w));
    if (rej !== undefined) tests.push({ input: rej, path: '(added: shortest rejected string)', accepted: false });
  }

  steps[steps.length - 1].extra = { machine: m }; // the self-check runs on this

  const acc = tests.filter(t => t.accepted).map(t => show(t.input));
  const rej = tests.filter(t => !t.accepted).map(t => show(t.input));
  return {
    technique: 'dfa_trace',
    session: nondet ? 'S01 / S05' : 'S01',
    input_summary: `${nondet ? 'NFA' : 'DFA'} over {${syms.join(',')}}, start ${m.start}, F = ${setName(m.final)}`,
    facts: notes.facts || [],
    formal:
      `M = (Q, Σ, δ, q0, F) with Q = ${setName(m.states)}, Σ = {${syms.join(',')}}, q0 = ${m.start}, F = ${setName(m.final)}. ` +
      `A string w is accepted iff ${nondet ? 'the set of states reached after w contains a state of F' : 'δ̂(q0, w) ∈ F'}.`,
    steps,
    tests,
    language: notes.language || '',
    conclusion: `Accepted: ${acc.join(', ') || 'none'}. Rejected: ${rej.join(', ') || 'none'}.`
  };
}

function fmtCell(m, arr, nondet) {
  if (!nondet) return arr[0] || EMPTY;
  return setName(sortStates(arr, m.states));
}
