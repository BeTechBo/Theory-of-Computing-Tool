// S12 · Closure Properties: Product Construction and Complement
// Builds the Cartesian product automaton M1 × M2 for L1 ∩ L2, L1 ∪ L2, and L1 \ L2,
// or computes the DFA complement.

import { EPS, EMPTY, machineToDot, accepts, stringsUpTo, setName } from '../machine.js';

const pairName = (p, q) => `[${p},${q}]`;

// Ensure DFA has all transitions; add dead state if needed
function makeCompleteDfa(m) {
  const syms = m.alphabet.filter(a => a !== EPS);
  let deadNeeded = false;
  m.states.forEach(q => {
    syms.forEach(a => {
      if (!m.delta[q]?.[a] || m.delta[q][a].length === 0) deadNeeded = true;
    });
  });

  if (!deadNeeded) return m;

  const deadState = 'dead';
  const newStates = [...m.states, deadState];
  const newDelta = {};

  newStates.forEach(s => {
    newDelta[s] = {};
    syms.forEach(a => {
      if (s === deadState) {
        newDelta[s][a] = [deadState];
      } else {
        const target = m.delta[s]?.[a];
        newDelta[s][a] = target && target.length ? target : [deadState];
      }
    });
  });

  return {
    states: newStates,
    alphabet: syms,
    start: m.start,
    final: [...m.final],
    delta: newDelta
  };
}

export function solveProductConstruction(m1Input, m2Input, operation = 'both') {
  // If only one machine is given or operation is complement
  if (!m2Input || operation === 'complement') {
    return solveComplement(m1Input);
  }

  const m1 = makeCompleteDfa(m1Input);
  const m2 = makeCompleteDfa(m2Input);

  // Common alphabet
  const syms = Array.from(new Set([...m1.alphabet, ...m2.alphabet])).filter(a => a !== EPS).sort();
  const steps = [];

  // 1. Setup & Pairs definition
  const allPairs = [];
  m1.states.forEach(p => {
    m2.states.forEach(q => {
      allPairs.push([p, q]);
    });
  });

  const startPair = [m1.start, m2.start];
  const startPairName = pairName(startPair[0], startPair[1]);

  steps.push({
    title: 'Step 1: Product States & Start State',
    explain: `The product states are all pairs [p, q] ∈ Q₁ × Q₂. |Q₁|×|Q₂| = ${m1.states.length}×${m2.states.length} = ${allPairs.length} state pairs. Start state is [${m1.start}, ${m2.start}].`,
    lines: [
      `Q₁ = {${m1.states.join(', ')}}, start₁ = ${m1.start}, F₁ = {${m1.final.join(', ')}}`,
      `Q₂ = {${m2.states.join(', ')}}, start₂ = ${m2.start}, F₂ = {${m2.final.join(', ')}}`,
      `Total pairs: ${allPairs.length} states in Q₁ × Q₂`,
      `Start state of product: ${startPairName}`
    ],
    table: [
      ['Pair', 'In F₁?', 'In F₂?', 'In L₁ ∩ L₂?', 'In L₁ ∪ L₂?'],
      ...allPairs.map(([p, q]) => [
        pairName(p, q),
        m1.final.includes(p) ? 'Yes ✓' : 'No',
        m2.final.includes(q) ? 'Yes ✓' : 'No',
        m1.final.includes(p) && m2.final.includes(q) ? 'Yes (Accept)' : 'No',
        m1.final.includes(p) || m2.final.includes(q) ? 'Yes (Accept)' : 'No'
      ])
    ],
    graph: '',
    highlight: [startPairName],
    extra: {}
  });

  // 2. Compute Transitions for reachable pairs using BFS
  const visited = new Set([startPairName]);
  const queue = [startPair];
  const reachablePairs = [startPair];
  const productDelta = {};

  const transitionLines = [];

  while (queue.length > 0) {
    const [p, q] = queue.shift();
    const currName = pairName(p, q);
    productDelta[currName] = {};

    syms.forEach(a => {
      const nextP = m1.delta[p][a][0];
      const nextQ = m2.delta[q][a][0];
      const nextPair = [nextP, nextQ];
      const nextName = pairName(nextP, nextQ);

      productDelta[currName][a] = [nextName];
      transitionLines.push(
        `δ(${currName}, ${a}) = [δ₁(${p}, ${a}), δ₂(${q}, ${a})] = [${nextP}, ${nextQ}] = ${nextName}`
      );

      if (!visited.has(nextName)) {
        visited.add(nextName);
        reachablePairs.push(nextPair);
        queue.push(nextPair);
      }
    });
  }

  const reachableNames = reachablePairs.map(([p, q]) => pairName(p, q));

  // Determine final states based on operation
  const interFinal = reachablePairs
    .filter(([p, q]) => m1.final.includes(p) && m2.final.includes(q))
    .map(([p, q]) => pairName(p, q));

  const unionFinal = reachablePairs
    .filter(([p, q]) => m1.final.includes(p) || m2.final.includes(q))
    .map(([p, q]) => pairName(p, q));

  const activeFinal = operation === 'intersection' ? interFinal : unionFinal;

  const productMachine = {
    states: reachableNames,
    alphabet: syms,
    start: startPairName,
    final: activeFinal,
    delta: productDelta
  };

  steps.push({
    title: 'Step 2: Transition Function on Reachable Pairs',
    explain: `Compute transitions δ([p, q], a) = [δ₁(p, a), δ₂(q, a)] step by step. We generate only the ${reachableNames.length} reachable pairs out of ${allPairs.length} total pairs.`,
    lines: transitionLines.slice(0, 15).concat(
      transitionLines.length > 15 ? [`... and ${transitionLines.length - 15} more transitions`] : []
    ),
    table: [
      ['State', ...syms, 'F (∩)', 'F (∪)'],
      ...reachablePairs.map(([p, q]) => {
        const name = pairName(p, q);
        return [
          `${name === startPairName ? '→ ' : ''}${activeFinal.includes(name) ? '* ' : ''}${name}`,
          ...syms.map(a => productDelta[name]?.[a]?.[0] || EMPTY),
          interFinal.includes(name) ? '★' : '-',
          unionFinal.includes(name) ? '★' : '-'
        ];
      })
    ],
    graph: machineToDot(productMachine),
    highlight: activeFinal,
    extra: { machine: productMachine }
  });

  // Tests
  const testWords = stringsUpTo(syms, 3).slice(0, 6);
  const tests = testWords.map(w => {
    const in1 = accepts(m1, w);
    const in2 = accepts(m2, w);
    const ok = operation === 'intersection' ? (in1 && in2) : (in1 || in2);
    return {
      input: w === '' ? EPS : w,
      path: `in M₁: ${in1 ? '✓' : '✗'}, in M₂: ${in2 ? '✓' : '✗'}`,
      accepted: ok
    };
  });

  const opLabel = operation === 'intersection' ? 'Intersection (L₁ ∩ L₂)' : 'Union (L₁ ∪ L₂)';

  return {
    technique: 'product',
    session: 'S12',
    input_summary: `Product construction of M₁ (${m1.states.length} states) and M₂ (${m2.states.length} states)`,
    formal: `M_prod = (Q₁ × Q₂, Σ, δ_prod, [${m1.start}, ${m2.start}], F_prod). ${reachableNames.length} of ${allPairs.length} pairs reachable.`,
    facts: reachableNames.map(name => ({
      item: name,
      meaning: `simultaneous state in M₁ and M₂`
    })),
    steps,
    tests,
    language: `Strings in ${opLabel}.`,
    conclusion: `Product construction complete. Machine has ${reachableNames.length} reachable states with ${activeFinal.length} accepting states for ${opLabel}.`
  };
}

export function solveComplement(mInput) {
  const m = makeCompleteDfa(mInput);
  const syms = m.alphabet.filter(a => a !== EPS);
  const oldFinal = new Set(m.final);
  const newFinal = m.states.filter(s => !oldFinal.has(s));

  const compMachine = {
    states: m.states,
    alphabet: syms,
    start: m.start,
    final: newFinal,
    delta: m.delta
  };

  const steps = [
    {
      title: 'Step 1: Verify Completeness',
      explain: 'Complementing a DFA requires the machine to be complete (every state has an outgoing transition for every symbol). If any transitions are missing, an absorbing dead state must be added before complementing.',
      lines: [
        `States: {${m.states.join(', ')}}`,
        `Alphabet: {${syms.join(', ')}}`,
        `Transitions: complete (|Q|×|Σ| = ${m.states.length * syms.length})`
      ],
      table: [
        ['state', ...syms, 'Original F'],
        ...m.states.map(q => [
          `${q === m.start ? '→ ' : ''}${oldFinal.has(q) ? '* ' : ''}${q}`,
          ...syms.map(a => m.delta[q]?.[a]?.[0] || EMPTY),
          oldFinal.has(q) ? 'Accept' : 'Reject'
        ])
      ],
      graph: machineToDot(m),
      highlight: [...oldFinal],
      extra: {}
    },
    {
      title: 'Step 2: Swap Accepting and Non-Accepting States',
      explain: 'Invert the accepting status: F_new = Q \\ F_old. Every state that was accepting now rejects, and every state that was rejecting now accepts.',
      lines: [
        `Original F: {${[...oldFinal].join(', ')}}`,
        `New F: Q \\ F = {${newFinal.join(', ')}}`
      ],
      table: [
        ['state', ...syms, 'New F (Complement)'],
        ...m.states.map(q => [
          `${q === m.start ? '→ ' : ''}${newFinal.includes(q) ? '* ' : ''}${q}`,
          ...syms.map(a => m.delta[q]?.[a]?.[0] || EMPTY),
          newFinal.includes(q) ? 'Accept ★' : 'Reject'
        ])
      ],
      graph: machineToDot(compMachine),
      highlight: newFinal,
      extra: { machine: compMachine }
    }
  ];

  const testWords = stringsUpTo(syms, 3).slice(0, 5);
  const tests = testWords.map(w => {
    const origOk = accepts(m, w);
    return {
      input: w === '' ? EPS : w,
      path: `Original: ${origOk ? 'accepted' : 'rejected'}`,
      accepted: !origOk
    };
  });

  return {
    technique: 'product',
    session: 'S12',
    input_summary: `DFA Complement for machine with states {${m.states.join(', ')}}`,
    formal: `M' = (Q, Σ, δ, ${m.start}, F'), where F' = Q \\ F = {${newFinal.join(', ')}}`,
    facts: m.states.map(s => ({
      item: s,
      meaning: newFinal.includes(s) ? 'accepted in complement language' : 'rejected in complement language'
    })),
    steps,
    tests,
    language: `Complement language: Σ* \\ L(M).`,
    conclusion: `DFA complemented successfully by swapping accepting states. New accepting set has ${newFinal.length} states.`
  };
}
