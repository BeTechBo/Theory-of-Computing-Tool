// S10 · FA → Regex via GNFA State Elimination and Arden's Lemma
// Systematically eliminates states to derive the regular expression.

import { EPS, EMPTY, accepts, stringsUpTo, setName, pickTests } from '../machine.js';

// Regex string helpers for GNFA labels
function simplifyUnion(a, b) {
  if (!a || a === EMPTY) return b || EMPTY;
  if (!b || b === EMPTY) return a || EMPTY;
  if (a === b) return a;
  return `${a}|${b}`;
}

function simplifyConcat(a, b) {
  if (!a || a === EMPTY || !b || b === EMPTY) return EMPTY;
  if (a === EPS) return b;
  if (b === EPS) return a;
  // Parenthesize if union
  const wrapA = a.includes('|') ? `(${a})` : a;
  const wrapB = b.includes('|') ? `(${b})` : b;
  return `${wrapA}${wrapB}`;
}

function simplifyStar(a) {
  if (!a || a === EMPTY || a === EPS) return EPS;
  if (a.endsWith('*') && !a.includes('|')) return a;
  const wrap = (a.length > 1 && !a.startsWith('(') && !a.endsWith(')')) || a.includes('|') ? `(${a})*` : `${a}*`;
  return wrap;
}

// Convert a GNFA adjacency map to a Graphviz DOT string
function gnfaToDot(states, edges, startNode, acceptNode) {
  const q = s => `"${String(s).replace(/"/g, '\\"')}"`;
  const lines = [
    'digraph {',
    '  rankdir=LR;',
    '  __start [shape=point, style=invis];'
  ];

  states.forEach(s => {
    const isAcc = s === acceptNode;
    lines.push(`  ${q(s)} [shape=${isAcc ? 'doublecircle' : 'circle'}];`);
  });

  lines.push(`  __start -> ${q(startNode)};`);

  for (const from of states) {
    for (const to of states) {
      const label = edges[from]?.[to];
      if (label && label !== EMPTY) {
        lines.push(`  ${q(from)} -> ${q(to)} [label=${q(label)}];`);
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}

export function solveStateElimination(m, preferredOrder = null) {
  const origStates = [...m.states];
  const startState = m.start;
  const finalStates = [...m.final];

  const steps = [];

  // 1. Initial GNFA setup
  const gStart = 'q_in';
  const gAccept = 'q_out';
  const gnfaStates = [gStart, ...origStates, gAccept];

  // edges[u][v] = regex expression
  const edges = {};
  gnfaStates.forEach(u => {
    edges[u] = {};
    gnfaStates.forEach(v => {
      edges[u][v] = EMPTY;
    });
  });

  // Connect fresh start to old start with ε
  edges[gStart][startState] = EPS;

  // Connect old accepting states to fresh accept with ε
  finalStates.forEach(f => {
    edges[f][gAccept] = EPS;
  });

  // Copy transitions from original machine
  origStates.forEach(u => {
    m.alphabet.forEach(a => {
      (m.delta[u]?.[a] || []).forEach(v => {
        edges[u][v] = simplifyUnion(edges[u][v], a);
      });
    });
  });

  steps.push({
    title: 'Step 1: Construct the Initial GNFA',
    explain: `Create a Generalized NFA (GNFA) by adding a fresh start state (${gStart}) with an ε-arrow to ${startState}, and a fresh accept state (${gAccept}) with ε-arrows from all accepting states (${finalStates.join(', ')}). Original states become non-final.`,
    lines: [
      `fresh start: ${gStart} —ε→ ${startState}`,
      `fresh accept: ${finalStates.map(f => `${f} —ε→ ${gAccept}`).join(', ')}`,
      `transitions between original states carry symbol labels or ∅`
    ],
    table: [
      ['from / to', ...gnfaStates],
      ...gnfaStates.map(u => [u, ...gnfaStates.map(v => edges[u][v] || EMPTY)])
    ],
    graph: gnfaToDot(gnfaStates, edges, gStart, gAccept),
    highlight: [gStart, gAccept],
    extra: {}
  });

  // 2. Eliminate internal states
  const eliminationOrder = preferredOrder && preferredOrder.length === origStates.length
    ? preferredOrder
    : [...origStates];

  let currentStates = [...gnfaStates];

  eliminationOrder.forEach((elimState, idx) => {
    const loop = edges[elimState][elimState];
    const loopStar = simplifyStar(loop);

    // Find predecessors (states with arrows into elimState)
    const predecessors = currentStates.filter(p => p !== elimState && edges[p][elimState] !== EMPTY);
    // Find successors (states with arrows out of elimState)
    const successors = currentStates.filter(s => s !== elimState && edges[elimState][s] !== EMPTY);

    const calculationLines = [
      `State to eliminate: ${elimState}`,
      `Self-loop: R(${elimState}, ${elimState}) = ${loop || EPS}  →  star: (R)* = ${loopStar}`,
      `Predecessors: {${predecessors.join(', ') || 'none'}}`,
      `Successors: {${successors.join(', ') || 'none'}}`
    ];

    // For every predecessor and successor, bypass elimState:
    // R_new(p, r) = R_old(p, r) | R(p, elim) · (R(elim, elim))* · R(elim, r)
    predecessors.forEach(p => {
      successors.forEach(r => {
        const direct = edges[p][r];
        const inEdge = edges[p][elimState];
        const outEdge = edges[elimState][r];

        const bypass = simplifyConcat(simplifyConcat(inEdge, loopStar), outEdge);
        const updated = simplifyUnion(direct, bypass);

        calculationLines.push(
          `R(${p}, ${r}) = ${direct !== EMPTY ? direct : '∅'} | (${inEdge})(${loopStar})(${outEdge})  =  ${updated}`
        );

        edges[p][r] = updated;
      });
    });

    // Remove elimState from current states
    currentStates = currentStates.filter(s => s !== elimState);

    steps.push({
      title: `Step ${idx + 2}: Eliminate state ${elimState}`,
      explain: `Bypass state ${elimState}. For every pair of predecessor p and successor r, update the transition label using the course formula: R_new(p, r) = R_old(p, r) | R(p, q) · R(q, q)* · R(q, r).`,
      lines: calculationLines,
      table: [
        ['from / to', ...currentStates],
        ...currentStates.map(u => [u, ...currentStates.map(v => edges[u][v] || EMPTY)])
      ],
      graph: gnfaToDot(currentStates, edges, gStart, gAccept),
      highlight: [...predecessors, ...successors],
      extra: {}
    });
  });

  // Final regex
  const finalRegex = edges[gStart][gAccept] || EMPTY;

  steps.push({
    title: 'Final Step: The Regular Expression',
    explain: `Only the start state (${gStart}) and the accept state (${gAccept}) remain. The label on the single arrow between them is the final regular expression for the language.`,
    lines: [
      `Remaining states: ${gStart}, ${gAccept}`,
      `Resulting regular expression: ${finalRegex}`
    ],
    table: [
      ['from / to', gStart, gAccept],
      [gStart, EMPTY, finalRegex],
      [gAccept, EMPTY, EMPTY]
    ],
    graph: gnfaToDot(currentStates, edges, gStart, gAccept),
    highlight: [gStart, gAccept],
    extra: {}
  });

  // Test strings: use pickTests to ensure balanced accepted and rejected strings
  const testWords = pickTests(m);
  const tests = testWords.map(w => {
    const ok = accepts(m, w);
    return {
      input: w === '' ? EPS : w,
      path: `Evaluated on original machine`,
      accepted: ok
    };
  });

  return {
    technique: 'state_elimination',
    session: 'S10',
    input_summary: `DFA/NFA with states {${origStates.join(', ')}}, start ${startState}, accepting {${finalStates.join(', ')}}`,
    formal: `GNFA eliminated in order: ${eliminationOrder.join(' → ')}`,
    facts: origStates.map(s => ({
      item: s,
      meaning: `state eliminated during step-by-step bypass`
    })),
    steps,
    tests,
    language: `All strings matched by the regular expression ${finalRegex}.`,
    conclusion: `State elimination complete. The language of the automaton is represented by the regular expression: ${finalRegex}`
  };
}
