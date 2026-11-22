// S03 · DFA minimisation by partition refinement and/or table filling.
// Follows the S03 model answers: unreachable states first, Round 0 = {F} | {Q−F},
// signatures per round, passes with witnesses, stop rules, merged machine at the end.

import { EMPTY, setName, machineToDot, isDfa, reachableStates, pickTests, tracePath, accepts, BLOCK_COLOURS, letter } from '../machine.js';

const DEAD = 'dead';

export function solveMinimise(input, method = 'table', notes = {}) {
  if (!isDfa(input)) {
    throw new Error('Minimisation needs a DFA. This machine has ε-moves or a cell with several states, so turn it into a DFA first (subset construction).');
  }
  const steps = [];
  const S = input.alphabet;

  // ---------- Step 1: complete the DFA ----------
  let m = clone(input);
  const missing = [];
  m.states.forEach(q => S.forEach(a => (m.delta[q][a] || []).length === 0 && missing.push(`δ(${q}, ${a})`)));
  if (missing.length) {
    const dead = m.states.includes(DEAD) ? `${DEAD}2` : DEAD;
    m.states.push(dead);
    m.delta[dead] = {};
    S.forEach(a => (m.delta[dead][a] = [dead]));
    m.states.forEach(q => S.forEach(a => (m.delta[q][a] || []).length === 0 && (m.delta[q][a] = [dead])));
    steps.push({
      title: 'Make the DFA complete',
      explain: `Minimisation needs exactly one arrow per state per symbol. ${missing.length} ${missing.length === 1 ? 'is' : 'are'} missing, so they go to a new dead state.`,
      lines: [...missing.map(x => `${x} is missing → ${dead}`), `${dead} loops to itself on every symbol and is not accepting`],
      table: dfaTable(m),
      graph: machineToDot(m),
      highlight: [dead],
      extra: {}
    });
  }

  // ---------- Step 2: unreachable states ----------
  const reach = reachableStates(m);
  const unreachable = m.states.filter(q => !reach.includes(q));
  steps.push({
    title: 'First: remove unreachable states',
    explain: unreachable.length
      ? 'A state nothing can reach never affects the language, but if it stays it can survive as its own block and the result would not be minimal. So it goes first.'
      : 'Always check this first, even when the answer is "none".',
    lines: [
      `reachable from ${m.start}: ${reach.join(', ')}`,
      unreachable.length ? `unreachable: ${unreachable.join(', ')}  →  delete ${unreachable.length === 1 ? 'it' : 'them'}` : 'unreachable: none, nothing is deleted'
    ],
    table: dfaTable(m),
    graph: machineToDot(m, { fill: Object.fromEntries(unreachable.map(q => [q, '#e2e8f0'])) }),
    highlight: [],
    extra: {}
  });
  m = restrict(m, reach);
  const Q = m.states;
  const isF = q => m.final.includes(q);
  const t = (q, a) => m.delta[q][a][0];

  // ---------- Partition refinement ----------
  let partitionClasses = null;
  if (method === 'partition' || method === 'both') {
    const prefix = method === 'both' ? 'Partition refinement · ' : '';
    let blocks = [Q.filter(isF), Q.filter(q => !isF(q))].filter(b => b.length);
    const blockOf = bl => Object.fromEntries(bl.flatMap((b, i) => b.map(q => [q, letter(i)])));
    const colour = bl => Object.fromEntries(bl.flatMap((b, i) => b.map(q => [q, BLOCK_COLOURS[i % BLOCK_COLOURS.length]])));
    const describe = bl => bl.map((b, i) => `${letter(i)} = ${setName(b)}`).join('  |  ');

    steps.push({
      title: `${prefix}Round 0: accepting vs non-accepting`,
      explain: 'Start with two blocks: the accepting states and the rest. Two states in different blocks already behave differently on ε.',
      lines: [describe(blocks)],
      table: signatureTable(Q, S, blockOf(blocks), t),
      graph: machineToDot(m, { fill: colour(blocks) }),
      highlight: [],
      extra: { blocks: blocks.map(b => [...b]) }
    });

    for (let round = 1; round < 50; round++) {
      const map = blockOf(blocks);
      const lines = [];
      const next = [];
      const split = [];
      blocks.forEach((b, i) => {
        if (b.length === 1) {
          next.push(b);
          return;
        }
        const groups = new Map();
        b.forEach(q => {
          const sig = S.map(a => map[t(q, a)]).join(',');
          lines.push(`${q}: ${S.map(a => `${a} → ${map[t(q, a)]}`).join(', ')}   (${sig})`);
          if (!groups.has(sig)) groups.set(sig, []);
          groups.get(sig).push(q);
        });
        const parts = [...groups.values()];
        if (parts.length > 1) {
          split.push(`${letter(i)} = ${setName(b)} splits into ${parts.map(setName).join(' | ')}`);
          next.push(...parts);
        } else {
          lines.push(`all of ${letter(i)} agree, so ${setName(b)} stays together`);
          next.push(b);
        }
      });
      const done = split.length === 0;
      blocks = next;
      steps.push({
        title: `${prefix}Round ${round}${done ? ': nothing splits. Stop' : ''}`,
        explain: done
          ? 'No block has states with different signatures, so the partition is final. Each block becomes one state.'
          : "Give each state its signature: which block each symbol leads to. States in the same block with different signatures are split.",
        lines: [...lines, ...(done ? ['nothing splits  →  STOP'] : split), `result: ${describe(blocks)}`],
        table: signatureTable(Q, S, blockOf(blocks), t),
        graph: machineToDot(m, { fill: colour(blocks) }),
        highlight: [],
        extra: { blocks: blocks.map(b => [...b]) }
      });
      if (done) break;
    }
    partitionClasses = blocks;
  }

  // ---------- Table filling ----------
  let tableClasses = null;
  if (method === 'table' || method === 'both') {
    const prefix = method === 'both' ? 'Table filling · ' : '';
    const key = (p, q) => (Q.indexOf(p) < Q.indexOf(q) ? `${p}|${q}` : `${q}|${p}`);
    const pairs = [];
    Q.forEach((p, i) => Q.slice(i + 1).forEach(q => pairs.push([p, q])));
    const mark = {}; // key -> { pass, witness }

    const pass0 = pairs.filter(([p, q]) => isF(p) !== isF(q));
    pass0.forEach(([p, q]) => (mark[key(p, q)] = { pass: 0, witness: 'ε' }));
    steps.push({
      title: `${prefix}Pass 0: cross every (accepting, non-accepting) pair`,
      explain: 'One state accepts ε and the other does not, so ε already tells them apart. That is the witness.',
      lines: [pass0.length ? `${pass0.map(([p, q]) => `(${p},${q})`).join(' ')}   witness ε` : 'no such pairs (all states are accepting, or none are)'],
      table: grid(Q, mark, 0),
      highlight_cells: gridCells(Q, pass0),
      highlight: [],
      extra: {}
    });

    for (let pass = 1; pass < 100; pass++) {
      const lines = [];
      const newly = [];
      pairs.forEach(([p, q]) => {
        if (mark[key(p, q)]) return;
        let hit = null;
        const parts = [];
        for (const a of S) {
          const p2 = t(p, a);
          const q2 = t(q, a);
          if (p2 === q2) {
            parts.push(`on ${a} → ${p2}, one state`);
            continue;
          }
          const mk = mark[key(p2, q2)];
          if (mk && mk.pass < pass) {
            hit = { a, p2, q2, witness: a + (mk.witness === 'ε' ? '' : mk.witness) };
            parts.push(`on ${a} → (${p2},${q2}), already crossed`);
            break;
          }
          parts.push(`on ${a} → (${p2},${q2}), not crossed`);
        }
        if (hit) {
          newly.push([p, q, hit.witness]);
          lines.push(`(${p},${q}): ${parts.join('; ')}  →  cross, witness "${hit.witness}"`);
        } else lines.push(`(${p},${q}): ${parts.join('; ')}  →  no cross`);
      });
      newly.forEach(([p, q, w]) => (mark[key(p, q)] = { pass, witness: w }));
      const unmarked = pairs.filter(([p, q]) => !mark[key(p, q)]);
      const done = newly.length === 0;
      steps.push({
        title: `${prefix}Pass ${pass}${done ? ': nothing new is crossed. Stop' : ''}`,
        explain: done
          ? 'A pass crossed nothing new, so no further pair can ever be crossed. The uncrossed pairs are equivalent.'
          : 'For each uncrossed pair and each symbol: if the pair it goes to was crossed in an earlier pass, cross this one too. The witness is that symbol followed by the earlier witness.',
        lines: [
          ...(lines.length ? lines : ['no uncrossed pairs left to check']),
          `newly crossed: ${newly.length ? newly.map(([p, q]) => `(${p},${q})`).join(' ') : 'none'}  /  not crossed: ${unmarked.length ? unmarked.map(([p, q]) => `(${p},${q})`).join(' ') : 'none'}`
        ],
        table: grid(Q, mark, pass),
        highlight_cells: gridCells(Q, newly),
        highlight: [],
        extra: {}
      });
      if (done) break;
    }
    // merge the uncrossed pairs
    const parent = Object.fromEntries(Q.map(q => [q, q]));
    const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    pairs.forEach(([p, q]) => !mark[key(p, q)] && (parent[find(p)] = find(q)));
    const groups = {};
    Q.forEach(q => (groups[find(q)] = groups[find(q)] || []).push(q));
    tableClasses = Object.values(groups);
  }

  // ---------- The minimal machine ----------
  const classes = (partitionClasses || tableClasses).map(c => [...c].sort((x, y) => Q.indexOf(x) - Q.indexOf(y)));
  classes.sort((x, y) => Q.indexOf(x[0]) - Q.indexOf(y[0]));
  const nameOf = c => (c.length === 1 ? c[0] : setName(c));
  const cls = Object.fromEntries(classes.flatMap(c => c.map(q => [q, nameOf(c)])));
  const min = {
    states: classes.map(nameOf),
    alphabet: S,
    start: cls[m.start],
    final: classes.filter(c => isF(c[0])).map(nameOf),
    delta: Object.fromEntries(classes.map(c => [nameOf(c), Object.fromEntries(S.map(a => [a, [cls[t(c[0], a)]]]))]))
  };
  const merged = classes.filter(c => c.length > 1);
  const agree =
    method === 'both' && sameClasses(partitionClasses, tableClasses)
      ? 'Both methods give the same classes, as the uniqueness of the minimal DFA guarantees.'
      : '';
  steps.push({
    title: 'The minimal DFA',
    explain: merged.length
      ? `Merge each class into one state. Arrows come from any member of the class, since they all lead to the same classes.${agree ? ' ' + agree : ''}`
      : `Every state is in a class of its own, so the machine is already minimal.${agree ? ' ' + agree : ''}`,
    lines: [
      ...classes.map(c => (c.length > 1 ? `merge ${setName(c)} into one state` : `${c[0]} stays on its own`)),
      `${input.states.length} states → ${min.states.length} states`
    ],
    table: dfaTable(min),
    graph: machineToDot(min),
    highlight: merged.map(nameOf),
    extra: { machine: min }
  });

  const tests = pickTests(min).map(w => ({ input: w, path: tracePath(min, w), accepted: accepts(min, w) }));
  const methodName = { table: 'table filling', partition: 'partition refinement', both: 'partition refinement and table filling' }[method];
  return {
    technique: method === 'partition' ? 'min_partition' : 'min_table',
    session: 'S03',
    input_summary: `DFA over {${S.join(',')}}, start ${input.start}, F = ${setName(input.final)}, minimised by ${methodName}`,
    facts: notes.facts || [],
    formal: '',
    steps,
    tests,
    language: notes.language || '',
    conclusion: merged.length
      ? `${input.states.length} states became ${min.states.length}: ${merged.map(setName).join(' and ')} ${merged.length === 1 ? 'was' : 'were'} merged.${agree ? ' ' + agree : ''}`
      : `The machine is already minimal (${min.states.length} states).${agree ? ' ' + agree : ''}`
  };
}

// ---------- helpers ----------
function clone(m) {
  return { ...m, states: [...m.states], final: [...m.final], delta: JSON.parse(JSON.stringify(m.delta)) };
}
function restrict(m, keep) {
  return {
    states: keep,
    alphabet: m.alphabet,
    start: m.start,
    final: m.final.filter(f => keep.includes(f)),
    delta: Object.fromEntries(keep.map(q => [q, m.delta[q]]))
  };
}
function dfaTable(m) {
  return [
    ['state', ...m.alphabet],
    ...m.states.map(q => [`${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`, ...m.alphabet.map(a => m.delta[q][a]?.[0] || EMPTY)])
  ];
}
function signatureTable(Q, S, map, t) {
  return [['state', 'block', ...S.map(a => `${a} → block`)], ...Q.map(q => [q, map[q], ...S.map(a => `${t(q, a)} (${map[t(q, a)]})`)])];
}
// Triangle grid: rows Q[1..], columns Q[0..n-2]; "×w" for crossed pairs (w = witness).
function grid(Q, mark, upToPass) {
  const k = (p, q) => (Q.indexOf(p) < Q.indexOf(q) ? `${p}|${q}` : `${q}|${p}`);
  return [
    ['', ...Q.slice(0, -1)],
    ...Q.slice(1).map((row, r) => [
      row,
      ...Q.slice(0, -1).map((col, c) => {
        if (c > r) return '';
        const mk = mark[k(row, col)];
        return mk && mk.pass <= upToPass ? `× ${mk.witness}` : '·';
      })
    ])
  ];
}
function gridCells(Q, pairs) {
  return pairs.map(([p, q]) => {
    const [a, b] = Q.indexOf(p) > Q.indexOf(q) ? [p, q] : [q, p]; // a = row (later state), b = column
    return [Q.indexOf(a), Q.indexOf(b) + 1];
  });
}
function sameClasses(x, y) {
  const norm = cs => cs.map(c => [...c].sort().join(',')).sort().join('|');
  return x && y && norm(x) === norm(y);
}
