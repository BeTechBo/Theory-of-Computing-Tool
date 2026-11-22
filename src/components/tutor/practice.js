// Practice mode: code generates a fresh exercise, so its solution is always correct.
// Every generator retries until the exercise is "interesting" (e.g. a DFA that really shrinks).

import { EPS, isDfa, reachableStates, machineToTable, accepts, stringsUpTo } from './machine.js';
import { solveSubsetConstruction } from './techniques/subsetConstruction.js';
import { solveMinimise } from './techniques/minimise.js';
import { transducerToTable } from './techniques/mooreMealy.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

export const PRACTICE_TOPICS = [
  { technique: 'subset_construction', label: 'NFA → DFA', emoji: '🏁' },
  { technique: 'min_both', label: 'Minimise a DFA', emoji: '✂️' },
  { technique: 'eps_removal', label: 'Remove ε-moves', emoji: '🪄' },
  { technique: 'dfa_trace', label: 'Trace strings', emoji: '🧭' },
  { technique: 'moore_mealy', label: 'Moore → Mealy', emoji: '🖨️' }
];

const empty = (states, alphabet) => Object.fromEntries(states.map(q => [q, Object.fromEntries(alphabet.map(a => [a, []]))]));

function nfa() {
  for (let tries = 0; tries < 500; tries++) {
    const Q = ['q0', 'q1', 'q2'];
    const S = ['a', 'b'];
    const delta = empty(Q, S);
    Q.forEach(q => S.forEach(a => {
      delta[q][a] = Q.filter(() => chance(0.33));
    }));
    const m = { states: Q, alphabet: S, start: 'q0', final: [pick(['q1', 'q2'])], delta };
    const multi = Q.some(q => S.some(a => delta[q][a].length >= 2));
    const dfa = solveSubsetConstruction(m).steps.at(-1).extra.machine;
    const accepted = stringsUpTo(S, 4).filter(w => accepts(m, w)).length;
    if (multi && dfa.states.length >= 3 && dfa.states.length <= 6 && accepted > 2 && reachableStates(m).length === 3) return m;
  }
  throw new Error('Could not generate an NFA, try again.');
}

function bigDfa() {
  for (let tries = 0; tries < 500; tries++) {
    // A random 3-state minimal DFA ...
    const base = ['A', 'B', 'C'];
    const S = ['a', 'b'];
    const delta = Object.fromEntries(base.map(q => [q, Object.fromEntries(S.map(a => [a, [pick(base)]]))]));
    const small = { states: base, alphabet: S, start: 'A', final: [pick(base)], delta };
    if (reachableStates(small).length < 3) continue;
    if (solveMinimise(small, 'table').steps.at(-1).extra.machine.states.length !== 3) continue;
    // ... then split two of its states into copies, so the result is not minimal.
    const states = [...base];
    const d = JSON.parse(JSON.stringify(delta));
    shuffle(base).slice(0, 2).forEach(p => {
      const copy = `${p}2`;
      states.push(copy);
      d[copy] = JSON.parse(JSON.stringify(d[p]));
      // move some arrows that pointed at p to the copy
      states.forEach(q => S.forEach(a => {
        if (d[q][a][0] === p && chance(0.5)) d[q][a] = [copy];
      }));
    });
    const final = states.filter(q => small.final.includes(q.replace('2', '')));
    // Sometimes add an unreachable state (S03 Q3's trap)
    if (chance(0.35)) {
      states.push('X');
      d.X = Object.fromEntries(S.map(a => [a, [pick(states.slice(0, -1))]]));
    }
    // Rename to s0, s1, ... with the start first
    const order = ['A', ...shuffle(states.filter(q => q !== 'A'))];
    const name = Object.fromEntries(order.map((q, i) => [q, `s${i}`]));
    const m = {
      states: order.map(q => name[q]),
      alphabet: S,
      start: 's0',
      final: final.map(q => name[q]),
      delta: Object.fromEntries(order.map(q => [name[q], Object.fromEntries(S.map(a => [a, [name[d[q][a][0]]]]))]))
    };
    const minimal = solveMinimise(m, 'table').steps.at(-1).extra.machine.states.length;
    if (isDfa(m) && reachableStates(m).length >= 5 && minimal === 3) return m;
  }
  throw new Error('Could not generate a DFA, try again.');
}

function epsNfa() {
  for (let tries = 0; tries < 500; tries++) {
    const Q = ['p0', 'p1', 'p2', 'p3'];
    const S = ['a', 'b', EPS];
    const delta = empty(Q, S);
    // an ε-chain from the start, plus one more ε-arrow sometimes
    delta.p0[EPS] = ['p1'];
    if (chance(0.6)) delta.p1[EPS] = ['p2'];
    if (chance(0.3)) delta.p3[EPS] = [pick(['p1', 'p2'])];
    Q.forEach(q => ['a', 'b'].forEach(a => {
      if (chance(0.4)) delta[q][a] = [pick(Q)];
    }));
    const m = { states: Q, alphabet: S, start: 'p0', final: [pick(['p2', 'p3'])], delta };
    const accepted = stringsUpTo(['a', 'b'], 4).filter(w => accepts(m, w)).length;
    if (reachableStates(m).length === 4 && accepted >= 3 && accepted < 25) return m;
  }
  throw new Error('Could not generate an ε-NFA, try again.');
}

function traceDfa() {
  for (let tries = 0; tries < 500; tries++) {
    const Q = ['q0', 'q1', 'q2'];
    const S = ['0', '1'];
    const delta = Object.fromEntries(Q.map(q => [q, Object.fromEntries(S.map(a => [a, [pick(Q)]]))]));
    const m = { states: Q, alphabet: S, start: 'q0', final: [pick(Q)], delta };
    const words = shuffle(stringsUpTo(S, 5).filter(w => w.length >= 3)).slice(0, 3);
    const verdicts = words.map(w => accepts(m, w));
    if (reachableStates(m).length === 3 && verdicts.includes(true) && verdicts.includes(false)) return { machine: m, strings: [...words, ''] };
  }
  throw new Error('Could not generate a DFA, try again.');
}

function moore() {
  const Q = ['q0', 'q1', 'q2'];
  const S = ['a', 'b'];
  for (let tries = 0; tries < 200; tries++) {
    const delta = Object.fromEntries(Q.map(q => [q, Object.fromEntries(S.map(a => [a, pick(Q)]))]));
    const out = Object.fromEntries(Q.map(q => [q, pick(['0', '1'])]));
    const M = { type: 'moore', states: Q, alphabet: S, start: 'q0', delta, out };
    const seen = new Set(['q0']);
    Q.forEach(() => [...seen].forEach(q => S.forEach(a => seen.add(delta[q][a]))));
    if (seen.size === 3 && new Set(Object.values(out)).size === 2) {
      return { transducer: M, strings: [shuffle(['a', 'b', 'a', 'b', 'b']).join('')] };
    }
  }
  throw new Error('Could not generate a Moore machine, try again.');
}


// Returns { technique, task, table, machine | transducer, strings }
export function makePractice(technique) {
  const t = technique || pick(PRACTICE_TOPICS).technique;
  if (t === 'subset_construction') {
    const m = nfa();
    return { technique: t, machine: m, strings: [], table: machineToTable(m), task: 'Convert this NFA to a DFA by the **subset construction**. Build reachable subsets only, mark the accepting ones, and say how many of the 2³ = 8 subsets you built.' };
  }
  if (t === 'min_both' || t === 'min_table' || t === 'min_partition') {
    const m = bigDfa();
    return { technique: 'min_both', machine: m, strings: [], table: machineToTable(m), task: 'Minimise this DFA. Check for unreachable states first, then use **partition refinement** (write every round) and **table filling** (write a witness in every crossed cell). Both must give the same classes.' };
  }
  if (t === 'eps_removal' || t === 'eps_closure') {
    const m = epsNfa();
    return { technique: 'eps_removal', machine: m, strings: [], table: machineToTable(m), task: 'Remove the ε-moves. Write the closure table, every δ′ entry (close, move, close), and F′. Then test both machines on ε and two more strings.' };
  }
  if (t === 'dfa_trace') {
    const { machine, strings } = traceDfa();
    const show = strings.map(w => (w === '' ? 'ε' : w)).join(', ');
    return { technique: t, machine, strings, table: machineToTable(machine), task: `Trace **${show}** through this DFA, one move per line, and say whether each is accepted using δ̂(q0, w) ∈ F.` };
  }
  if (t === 'moore_mealy') {
    const { transducer, strings } = moore();
    return { technique: t, transducer, strings, table: transducerToTable(transducer), task: `Run this Moore machine on **${strings[0]}** (state the output length first), convert it to a Mealy machine, and check that the outputs agree.` };
  }
  throw new Error('Unknown practice topic.');
}
