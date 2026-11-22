// S04 · NFA → DFA by the subset construction.
// Code computes every step (so the tables are always right); the output is the
// shared JSON contract, so the same player renders it as it would an LLM answer.

import { EPS, EMPTY, setName, sortStates, machineToDot, accepts, runSets, pickTests } from '../machine.js';

export function solveSubsetConstruction(nfa, notes = {}) {
  if (nfa.alphabet.includes(EPS)) {
    throw new Error('This NFA has ε-moves. Subset construction here expects an NFA without ε (S04); use ε-removal (S06) first.');
  }
  const { states: Q, alphabet: S, start, final: F, delta } = nfa;
  const order = Q;
  const n = Q.length;
  const total = 2 ** n;

  const fmt = arr => setName(sortStates(arr, order));
  const moveOf = (q, a) => delta[q][a] || [];

  // ---------- run the construction, recording a snapshot per row ----------
  const startSet = [start];
  const discovered = [fmt(startSet)]; // order rows appear in the table
  const members = { [fmt(startSet)]: startSet };
  const rows = {}; // name -> { a: targetName }
  const steps = [];

  const tableSnapshot = (filledUpTo, markFinal = false) => {
    const head = ['subset', ...S];
    const body = discovered.map((name, i) => {
      const isStart = i === 0;
      const isFinal = markFinal && members[name].some(q => F.includes(q));
      const label = `${isStart ? '→ ' : ''}${isFinal ? '* ' : ''}${name}`;
      const filled = i < filledUpTo;
      return [label, ...S.map(a => (filled ? rows[name][a] : '…'))];
    });
    return [head, ...body];
  };

  const dfaSoFar = (processedCount, markFinal = false) => {
    const names = discovered;
    const m = {
      states: names,
      alphabet: S,
      start: names[0],
      final: markFinal ? names.filter(nm => members[nm].some(q => F.includes(q))) : [],
      delta: {}
    };
    names.forEach((nm, i) => {
      m.delta[nm] = {};
      S.forEach(a => {
        m.delta[nm][a] = i < processedCount ? [rows[nm][a]] : [];
      });
    });
    return m;
  };

  // Step: the NFA itself
  steps.push({
    title: 'The NFA we start from',
    explain:
      'Each cell of the NFA table is a set of states, so after reading some input the NFA can be in several states at once. ' +
      'The DFA we build keeps track of exactly that set.',
    lines: Q.flatMap(q => S.map(a => `δ(${q}, ${a}) = ${fmt(moveOf(q, a))}`)),
    table: [
      ['state', ...S],
      ...Q.map(q => [`${q === start ? '→ ' : ''}${F.includes(q) ? '* ' : ''}${q}`, ...S.map(a => fmt(moveOf(q, a)))])
    ],
    graph: machineToDot(nfa),
    highlight: [],
    extra: {}
  });

  // Step: the start subset
  steps.push({
    title: `Start subset ${fmt(startSet)}`,
    explain: `The DFA starts in the set holding only the NFA's start state. There are no ε-moves, so nothing else joins it.`,
    lines: [`start subset = {${start}}`, `to process: ${fmt(startSet)}`],
    table: tableSnapshot(0),
    highlight_cells: [[1, 0]],
    graph: machineToDot(dfaSoFar(0)),
    highlight: [fmt(startSet)],
    extra: {}
  });

  // One step per processed subset (breadth-first, in table order)
  for (let i = 0; i < discovered.length; i++) {
    const name = discovered[i];
    const set = members[name];
    rows[name] = {};
    const lines = [];
    const fresh = [];

    S.forEach(a => {
      const union = new Set();
      set.forEach(q => moveOf(q, a).forEach(t => union.add(t)));
      const target = sortStates(union, order);
      const tName = setName(target);
      const isNew = !(tName in members);
      if (isNew) {
        members[tName] = target;
        discovered.push(tName);
        fresh.push(tName);
      }
      rows[name][a] = tName;

      let working;
      if (set.length === 0) {
        lines.push(`${EMPTY} on ${a} → ${EMPTY}   (no states to move from)`);
        return;
      }
      if (set.length === 1) working = `${name} on ${a} → δ(${set[0]}, ${a}) = ${tName}`;
      else {
        const parts = set.map(q => `δ(${q}, ${a})`).join(' ∪ ');
        const vals = set.map(q => fmt(moveOf(q, a))).join(' ∪ ');
        working = `${name} on ${a} → ${parts} = ${vals} = ${tName}`;
      }
      lines.push(`${working}   ${isNew ? '(new)' : '(already in the table)'}`);
    });

    const rowIdx = i + 1;
    const cells = S.map((_, c) => [rowIdx, c + 1]);
    fresh.forEach(f => cells.push([discovered.indexOf(f) + 1, 0]));

    steps.push({
      title: `Row ${i + 1}: subset ${name}`,
      explain:
        set.length === 0
          ? `${EMPTY} is a real state here: once every path has died, nothing can revive it, so it loops to itself on every symbol.`
          : `For each symbol, take the union of the moves of every state in ${name}. ` +
            (fresh.length
              ? `New subset${fresh.length > 1 ? 's' : ''} found: ${fresh.join(', ')}. ${fresh.length > 1 ? 'They join' : 'It joins'} the table and will get ${fresh.length > 1 ? 'their own rows' : 'its own row'}.`
              : 'No new subsets: every result is already in the table.'),
      lines,
      table: tableSnapshot(i + 1),
      highlight_cells: cells,
      graph: machineToDot(dfaSoFar(i + 1)),
      highlight: [name, ...fresh],
      extra: {}
    });
  }

  // Stop rule
  steps.push({
    title: 'Stop: no new subset appeared',
    explain: 'Every subset in the table has its row filled and the last rows created nothing new, so the construction stops.',
    lines: [`subsets built: ${discovered.length}`, `rows still to process: none`],
    table: tableSnapshot(discovered.length),
    graph: machineToDot(dfaSoFar(discovered.length)),
    highlight: [],
    extra: {}
  });

  // Accepting subsets
  const dfa = dfaSoFar(discovered.length, true);
  const emptyReached = EMPTY in members;
  const emptyLine = emptyReached
    ? `${EMPTY} is reachable (${whereEmptyCameFrom(discovered, rows, S)}), so it stays in the DFA as a dead state.`
    : `No ${EMPTY}: no union ever came out empty, so the DFA needs no dead state.`;
  steps.push({
    title: 'Mark the accepting subsets',
    explain: `A subset is accepting when it contains at least one NFA accepting state (F = ${fmt(F)}).`,
    lines: [
      ...discovered.map(nm => {
        const hit = members[nm].filter(q => F.includes(q));
        return hit.length
          ? `${nm} contains ${hit.join(', ')} → accepting *`
          : `${nm} contains no state of F → not accepting`;
      }),
      emptyLine
    ],
    table: tableSnapshot(discovered.length, true),
    highlight_cells: discovered.map((nm, i) => (dfa.final.includes(nm) ? [i + 1, 0] : null)).filter(Boolean),
    graph: machineToDot(dfa),
    highlight: dfa.final,
    extra: {}
  });

  // Reachable vs all subsets
  const allSubsets = [];
  for (let mask = 0; mask < total; mask++) {
    allSubsets.push(setName(Q.filter((_, i) => mask & (1 << i))));
  }
  const never = allSubsets.filter(s => !(s in members));
  steps.push({
    title: `Reachable subsets: ${discovered.length} of 2^${n} = ${total}`,
    explain:
      'We only built subsets the DFA can actually reach from the start. Listing all of them would also be correct, but it shows no understanding of which ones are reachable.',
    lines: [
      `built (${discovered.length}): ${discovered.join('  ')}`,
      total <= 16
        ? `never built (${never.length}): ${never.join('  ') || 'none'}`
        : `never built: ${never.length} subsets (too many to list)`
    ],
    table: tableSnapshot(discovered.length, true),
    graph: machineToDot(dfa),
    highlight: [],
    extra: { machine: dfa }
  });

  // ---------- tests, language, conclusion ----------
  const tests = pickTests(dfa).map(w => {
    const trail = runSets(dfa, w).map(set => set[0]);
    const path = trail.map((st, i) => (i === 0 ? st : `-${w[i - 1]}→ ${st}`)).join(' ');
    return { input: w, path, accepted: accepts(dfa, w) };
  });

  const facts =
    notes.facts ||
    discovered.map(nm => ({
      item: nm,
      meaning:
        members[nm].length === 0
          ? 'every path of the NFA has died'
          : `the NFA could be in exactly ${members[nm].join(' or ')} now`
    }));

  return {
    technique: 'subset_construction',
    session: 'S04',
    input_summary: `NFA over {${S.join(',')}}, start ${start}, F = ${fmt(F)}`,
    facts,
    formal:
      `N = (Q, Σ, δ, q0, F) with Q = ${fmt(Q)}, Σ = {${S.join(',')}}, q0 = ${start}, F = ${fmt(F)}. ` +
      `The DFA is M = (Q', Σ, δ', {${start}}, F') with Q' ⊆ 2^Q, so at most 2^${n} = ${total} states. ` +
      `Its table has |Q'|×|Σ| = ${discovered.length}×${S.length} = ${discovered.length * S.length} transitions.`,
    steps,
    tests,
    language: notes.language || 'Not written yet: the one-sentence description of L comes from the LLM.',
    conclusion: `${discovered.length} of the ${total} possible subsets are reachable, so the DFA has ${discovered.length} states${
      emptyReached ? ` (including the dead state ${EMPTY})` : ''
    }.`
  };
}

function whereEmptyCameFrom(discovered, rows, S) {
  for (const nm of discovered) {
    if (nm === EMPTY) continue;
    for (const a of S) if (rows[nm][a] === EMPTY) return `${nm} on ${a} gives ${EMPTY}`;
  }
  return '';
}
