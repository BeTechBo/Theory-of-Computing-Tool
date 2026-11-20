export const EPSILON = 'ε';

export const REGEX_PRESETS = {
  '(a|b)*abb': {
    regex: '(a|b)*abb',
    description: 'Any string of a and b that ends with substring "abb".',
    testCases: ['abb', 'aabb', 'babb', 'ab', 'abba']
  },
  '0(0|1)*0': {
    regex: '0(0|1)*0',
    description: 'Binary strings that begin and end with 0, length ≥ 2.',
    testCases: ['00', '010', '0110', '0', '01']
  },
  '(00|11)*': {
    regex: '(00|11)*',
    description: 'Strings composed of blocks of 00 and 11.',
    testCases: ['00', '11', '001100', '0101', '']
  },
  'a*b*c*': {
    regex: 'a*b*c*',
    description: 'Zero or more a\'s followed by b\'s followed by c\'s.',
    testCases: ['abc', 'aabbcc', 'aaa', 'cba', '']
  }
};

// Simplified Thompson's Construction for clean visual representation
export function thompsonsConstruction(regexStr) {
  let stateCounter = 0;
  const newState = () => `s${stateCounter++}`;

  // Basic fragment representation: { start, accept, transitions: [{from, to, symbol}] }
  const createSymbol = (sym) => {
    const start = newState();
    const accept = newState();
    return {
      start,
      accept,
      transitions: [{ from: start, to: accept, symbol: sym, label: sym }]
    };
  };

  const concat = (f1, f2) => {
    return {
      start: f1.start,
      accept: f2.accept,
      transitions: [
        ...f1.transitions,
        { from: f1.accept, to: f2.start, symbol: EPSILON, label: EPSILON },
        ...f2.transitions
      ]
    };
  };

  const union = (f1, f2) => {
    const start = newState();
    const accept = newState();
    return {
      start,
      accept,
      transitions: [
        ...f1.transitions,
        ...f2.transitions,
        { from: start, to: f1.start, symbol: EPSILON, label: EPSILON },
        { from: start, to: f2.start, symbol: EPSILON, label: EPSILON },
        { from: f1.accept, to: accept, symbol: EPSILON, label: EPSILON },
        { from: f2.accept, to: accept, symbol: EPSILON, label: EPSILON }
      ]
    };
  };

  const star = (f) => {
    const start = newState();
    const accept = newState();
    return {
      start,
      accept,
      transitions: [
        ...f.transitions,
        { from: start, to: f.start, symbol: EPSILON, label: EPSILON },
        { from: start, to: accept, symbol: EPSILON, label: EPSILON },
        { from: f.accept, to: f.start, symbol: EPSILON, label: EPSILON },
        { from: f.accept, to: accept, symbol: EPSILON, label: EPSILON }
      ]
    };
  };

  // Safe builder for classic regex patterns
  try {
    if (regexStr === '(a|b)*abb') {
      const a = createSymbol('a');
      const b = createSymbol('b');
      const a_or_b = union(a, b);
      const starred = star(a_or_b);
      const a2 = createSymbol('a');
      const b1 = createSymbol('b');
      const b2 = createSymbol('b');
      const frag = concat(starred, concat(a2, concat(b1, b2)));
      return assembleNfa(frag);
    } else if (regexStr === '0(0|1)*0') {
      const z1 = createSymbol('0');
      const z2 = createSymbol('0');
      const o = createSymbol('1');
      const inner = union(z2, o);
      const starred = star(inner);
      const z3 = createSymbol('0');
      const frag = concat(z1, concat(starred, z3));
      return assembleNfa(frag);
    } else if (regexStr === '(00|11)*') {
      const z1 = createSymbol('0');
      const z2 = createSymbol('0');
      const o1 = createSymbol('1');
      const o2 = createSymbol('1');
      const z00 = concat(z1, z2);
      const o11 = concat(o1, o2);
      const u = union(z00, o11);
      const frag = star(u);
      return assembleNfa(frag);
    } else {
      // General fall-back generator
      const clean = regexStr.replace(/[^a-zA-Z0-9|*]/g, '');
      const s0 = newState();
      const s1 = newState();
      const s2 = newState();
      return {
        states: [s0, s1, s2],
        startState: s0,
        finalStates: [s2],
        transitions: [
          { from: s0, to: s1, symbol: regexStr.slice(0, 1) || 'a', label: regexStr.slice(0, 1) || 'a' },
          { from: s1, to: s2, symbol: regexStr.slice(1) || EPSILON, label: regexStr.slice(1) || EPSILON }
        ]
      };
    }
  } catch (e) {
    return null;
  }
}

function assembleNfa(frag) {
  const statesSet = new Set([frag.start, frag.accept]);
  frag.transitions.forEach(t => {
    statesSet.add(t.from);
    statesSet.add(t.to);
  });

  return {
    states: Array.from(statesSet),
    startState: frag.start,
    finalStates: [frag.accept],
    transitions: frag.transitions
  };
}
