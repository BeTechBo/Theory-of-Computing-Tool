export const EPSILON = 'ε';

export const FA_PRESETS = {
  'Ends with "01" (DFA)': {
    type: 'DFA',
    alphabet: ['0', '1'],
    states: ['q0', 'q1', 'q2'],
    startState: 'q0',
    finalStates: ['q2'],
    transitions: [
      { from: 'q0', symbol: '0', to: 'q1' },
      { from: 'q0', symbol: '1', to: 'q0' },
      { from: 'q1', symbol: '0', to: 'q1' },
      { from: 'q1', symbol: '1', to: 'q2' },
      { from: 'q2', symbol: '0', to: 'q1' },
      { from: 'q2', symbol: '1', to: 'q0' }
    ],
    sampleInputs: ['1001', '0101', '1100', '01', '00']
  },
  'Contains substring "101" (DFA)': {
    type: 'DFA',
    alphabet: ['0', '1'],
    states: ['q0', 'q1', 'q2', 'q3'],
    startState: 'q0',
    finalStates: ['q3'],
    transitions: [
      { from: 'q0', symbol: '0', to: 'q0' },
      { from: 'q0', symbol: '1', to: 'q1' },
      { from: 'q1', symbol: '0', to: 'q2' },
      { from: 'q1', symbol: '1', to: 'q1' },
      { from: 'q2', symbol: '0', to: 'q0' },
      { from: 'q2', symbol: '1', to: 'q3' },
      { from: 'q3', symbol: '0', to: 'q3' },
      { from: 'q3', symbol: '1', to: 'q3' }
    ],
    sampleInputs: ['101', '01010', '11100', '11011']
  },
  'Even 0s and Even 1s (DFA)': {
    type: 'DFA',
    alphabet: ['0', '1'],
    states: ['qEE', 'qOE', 'qEO', 'qOO'],
    startState: 'qEE',
    finalStates: ['qEE'],
    transitions: [
      { from: 'qEE', symbol: '0', to: 'qOE' },
      { from: 'qEE', symbol: '1', to: 'qEO' },
      { from: 'qOE', symbol: '0', to: 'qEE' },
      { from: 'qOE', symbol: '1', to: 'qOO' },
      { from: 'qEO', symbol: '0', to: 'qOO' },
      { from: 'qEO', symbol: '1', to: 'qEE' },
      { from: 'qOO', symbol: '0', to: 'qEO' },
      { from: 'qOO', symbol: '1', to: 'qOE' }
    ],
    sampleInputs: ['0011', '0101', '011', '0000', '']
  },
  'Binary divisible by 3 (DFA)': {
    type: 'DFA',
    alphabet: ['0', '1'],
    states: ['rem0', 'rem1', 'rem2'],
    startState: 'rem0',
    finalStates: ['rem0'],
    transitions: [
      { from: 'rem0', symbol: '0', to: 'rem0' },
      { from: 'rem0', symbol: '1', to: 'rem1' },
      { from: 'rem1', symbol: '0', to: 'rem2' },
      { from: 'rem1', symbol: '1', to: 'rem0' },
      { from: 'rem2', symbol: '0', to: 'rem1' },
      { from: 'rem2', symbol: '1', to: 'rem2' }
    ],
    sampleInputs: ['0', '11', '110', '1001', '101']
  },
  'Ends with "aba" (NFA with non-determinism)': {
    type: 'NFA',
    alphabet: ['a', 'b'],
    states: ['q0', 'q1', 'q2', 'q3'],
    startState: 'q0',
    finalStates: ['q3'],
    transitions: [
      { from: 'q0', symbol: 'a', to: 'q0' },
      { from: 'q0', symbol: 'b', to: 'q0' },
      { from: 'q0', symbol: 'a', to: 'q1' },
      { from: 'q1', symbol: 'b', to: 'q2' },
      { from: 'q2', symbol: 'a', to: 'q3' }
    ],
    sampleInputs: ['aba', 'aaba', 'bab', 'ababa', 'b']
  },
  'Third symbol from end is "1" (NFA)': {
    type: 'NFA',
    alphabet: ['0', '1'],
    states: ['q0', 'q1', 'q2', 'q3'],
    startState: 'q0',
    finalStates: ['q3'],
    transitions: [
      { from: 'q0', symbol: '0', to: 'q0' },
      { from: 'q0', symbol: '1', to: 'q0' },
      { from: 'q0', symbol: '1', to: 'q1' },
      { from: 'q1', symbol: '0', to: 'q2' },
      { from: 'q1', symbol: '1', to: 'q2' },
      { from: 'q2', symbol: '0', to: 'q3' },
      { from: 'q2', symbol: '1', to: 'q3' }
    ],
    sampleInputs: ['100', '111', '0100', '1010', '01']
  }
};

// Calculate epsilon closure of a set of states
export function epsilonClosure(states, transitions) {
  const closure = new Set(states);
  const queue = [...states];

  while (queue.length > 0) {
    const curr = queue.shift();
    transitions.forEach(t => {
      if (t.from === curr && (t.symbol === '' || t.symbol === 'e' || t.symbol === EPSILON)) {
        if (!closure.has(t.to)) {
          closure.add(t.to);
          queue.push(t.to);
        }
      }
    });
  }
  return closure;
}

// Step-by-step simulation of FA on an input string
export function simulateFa(fa, inputStr) {
  const finalSet = new Set(fa.finalStates);
  const startClosure = epsilonClosure([fa.startState], fa.transitions);

  const steps = [
    {
      index: 0,
      charRead: null,
      activeStates: Array.from(startClosure),
      transitionTaken: null
    }
  ];

  let currentStates = startClosure;

  for (let i = 0; i < inputStr.length; i++) {
    const symbol = inputStr[i];
    const nextStates = new Set();
    const transitionsUsed = [];

    currentStates.forEach(st => {
      fa.transitions.forEach((t, tIdx) => {
        if (t.from === st && t.symbol === symbol) {
          nextStates.add(t.to);
          transitionsUsed.push(tIdx);
        }
      });
    });

    // Expand by epsilon closure
    const closedNext = epsilonClosure(Array.from(nextStates), fa.transitions);
    currentStates = closedNext;

    steps.push({
      index: i + 1,
      charRead: symbol,
      activeStates: Array.from(currentStates),
      transitionsTaken: transitionsUsed
    });
  }

  // Accepted if any active state at the end is in finalStates
  const isAccepted = Array.from(currentStates).some(st => finalSet.has(st));

  return {
    accepted: isAccepted,
    steps,
    finalActiveStates: Array.from(currentStates)
  };
}

// Subset construction (NFA to DFA)
export function convertNfaToDfa(nfa) {
  const nfaFinalSet = new Set(nfa.finalStates);
  const startClosure = Array.from(epsilonClosure([nfa.startState], nfa.transitions)).sort();
  const subsetKey = subset => subset.length === 0 ? '∅' : `{${subset.join(',')}}`;

  const dfaStates = [];
  const dfaFinalStates = [];
  const dfaTransitions = [];
  const tableRows = [];

  const queue = [startClosure];
  const visited = new Set();
  const stateMap = {};

  let stateCounter = 0;
  const getName = subset => {
    const k = subsetKey(subset);
    if (!stateMap[k]) {
      stateMap[k] = `Q${stateCounter++}`;
    }
    return stateMap[k];
  };

  while (queue.length > 0) {
    const currSubset = queue.shift();
    const k = subsetKey(currSubset);
    if (visited.has(k)) continue;
    visited.add(k);

    const dfaName = getName(currSubset);
    dfaStates.push(dfaName);

    // Is it an accepting DFA state?
    if (currSubset.some(s => nfaFinalSet.has(s))) {
      dfaFinalStates.push(dfaName);
    }

    const row = {
      subset: k,
      dfaName,
      isFinal: currSubset.some(s => nfaFinalSet.has(s)),
      moves: {}
    };

    nfa.alphabet.forEach(symbol => {
      const nextRaw = new Set();
      currSubset.forEach(st => {
        nfa.transitions.forEach(t => {
          if (t.from === st && t.symbol === symbol) {
            nextRaw.add(t.to);
          }
        });
      });

      const nextClosed = Array.from(epsilonClosure(Array.from(nextRaw), nfa.transitions)).sort();
      const nextKey = subsetKey(nextClosed);
      const nextName = getName(nextClosed);

      row.moves[symbol] = {
        targetSubset: nextKey,
        targetName: nextName
      };

      dfaTransitions.push({
        from: dfaName,
        symbol,
        to: nextName,
        label: symbol
      });

      if (!visited.has(nextKey)) {
        queue.push(nextClosed);
      }
    });

    tableRows.push(row);
  }

  return {
    dfa: {
      alphabet: nfa.alphabet,
      states: dfaStates,
      startState: getName(startClosure),
      finalStates: dfaFinalStates,
      transitions: dfaTransitions
    },
    tableRows,
    stateMap
  };
}

// DFA Minimization using Table-Filling / Myhill-Nerode algorithm
export function minimizeDfa(dfa) {
  const states = [...dfa.states];
  const finalSet = new Set(dfa.finalStates);
  const n = states.length;

  // Build transition lookup: transMap[state][symbol] = nextState
  const transMap = {};
  states.forEach(s => {
    transMap[s] = {};
  });
  dfa.transitions.forEach(t => {
    transMap[t.from][t.symbol] = t.to;
  });

  // Table of distinguishable pairs
  // table[i][j] where i > j indicates pair (states[i], states[j])
  const marked = {};
  const reason = {};

  for (let i = 0; i < n; i++) {
    marked[i] = {};
    reason[i] = {};
    for (let j = 0; j < i; j++) {
      const s1 = states[i];
      const s2 = states[j];
      const isFin1 = finalSet.has(s1);
      const isFin2 = finalSet.has(s2);

      // Step 1: Mark pairs where one is final and one is non-final
      if (isFin1 !== isFin2) {
        marked[i][j] = true;
        reason[i][j] = 'One final, one non-final';
      } else {
        marked[i][j] = false;
        reason[i][j] = '';
      }
    }
  }

  // Step 2: Iteratively mark pairs
  let changed = true;
  let iteration = 1;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (marked[i][j]) continue;

        const s1 = states[i];
        const s2 = states[j];

        for (const sym of dfa.alphabet) {
          const next1 = transMap[s1]?.[sym];
          const next2 = transMap[s2]?.[sym];
          if (!next1 || !next2 || next1 === next2) continue;

          const idx1 = states.indexOf(next1);
          const idx2 = states.indexOf(next2);
          const hi = Math.max(idx1, idx2);
          const lo = Math.min(idx1, idx2);

          if (marked[hi]?.[lo]) {
            marked[i][j] = true;
            reason[i][j] = `On '${sym}', goes to marked pair (${next1}, ${next2})`;
            changed = true;
            break;
          }
        }
      }
    }
    iteration++;
  }

  // Step 3: Find equivalent equivalence classes
  const parent = {};
  states.forEach(s => { parent[s] = s; });
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[rx] = ry;
  };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (!marked[i][j]) {
        union(states[i], states[j]);
      }
    }
  }

  const clusters = {};
  states.forEach(s => {
    const root = find(s);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(s);
  });

  const minStates = [];
  const minFinalStates = [];
  const clusterNameMap = {};

  Object.values(clusters).forEach((group, idx) => {
    const name = group.length > 1 ? `[${group.join(',')}]` : group[0];
    minStates.push(name);
    group.forEach(s => {
      clusterNameMap[s] = name;
    });
    if (group.some(s => finalSet.has(s))) {
      minFinalStates.push(name);
    }
  });

  const minTransitions = [];
  const seenTrans = new Set();
  minStates.forEach(minSt => {
    const rep = Object.keys(clusterNameMap).find(s => clusterNameMap[s] === minSt);
    dfa.alphabet.forEach(sym => {
      const nxt = transMap[rep]?.[sym];
      if (nxt) {
        const destMin = clusterNameMap[nxt];
        const key = `${minSt}>${sym}>${destMin}`;
        if (!seenTrans.has(key)) {
          seenTrans.add(key);
          minTransitions.push({
            from: minSt,
            symbol: sym,
            to: destMin,
            label: sym
          });
        }
      }
    });
  });

  return {
    minimizedDfa: {
      alphabet: dfa.alphabet,
      states: minStates,
      startState: clusterNameMap[dfa.startState],
      finalStates: minFinalStates,
      transitions: minTransitions
    },
    markedTable: marked,
    reasonTable: reason,
    states,
    clusters: Object.values(clusters)
  };
}
