export const EPSILON = 'ε';

export const PDA_PRESETS = {
  'aⁿbⁿ  (n ≥ 1)': {
    q0: 'q0',
    z: 'Z',
    fin: 'q2',
    mode: 'final',
    w: 'aabb',
    t: `q0 a Z q0 XZ
q0 a X q0 XX
q0 b X q1 e
q1 b X q1 e
q1 e Z q2 Z`,
    description: 'Classic equal count of a followed by equal count of b. Pushes X for each a, pops X for each b.'
  },
  'aⁿb²ⁿ  (n ≥ 1)': {
    q0: 'q0',
    z: 'Z',
    fin: 'q2',
    mode: 'final',
    w: 'aabbbb',
    t: `q0 a Z q0 XXZ
q0 a X q0 XXX
q0 b X q1 e
q1 b X q1 e
q1 e Z q2 Z`,
    description: 'Pushes two X symbols for every a read, pops one X for every b read.'
  },
  '#a = #b  (empty stack)': {
    q0: 'q0',
    z: 'Z',
    fin: '',
    mode: 'empty',
    w: 'abba',
    t: `q0 a Z q0 PZ
q0 b Z q0 NZ
q0 a P q0 PP
q0 b N q0 NN
q0 a N q0 e
q0 b P q0 e
q0 e Z q0 e`,
    description: 'Any permutation with equal number of a and b. P counts excess a, N counts excess b.'
  },
  'w c wᴿ  (deterministic palindrome)': {
    q0: 'q0',
    z: 'Z',
    fin: 'q2',
    mode: 'final',
    w: 'abcba',
    t: `q0 a Z q0 AZ
q0 b Z q0 BZ
q0 a A q0 AA
q0 a B q0 AB
q0 b A q0 BA
q0 b B q0 BB
q0 c Z q1 Z
q0 c A q1 A
q0 c B q1 B
q1 a A q1 e
q1 b B q1 e
q1 e Z q2 Z`,
    description: 'Pushes symbols of w until center marker c is reached, then matches and pops in reverse.'
  },
  'w wᴿ  (non-deterministic guessing)': {
    q0: 'q0',
    z: 'Z',
    fin: '',
    mode: 'empty',
    w: 'abba',
    t: `q0 a Z q0 AZ
q0 b Z q0 BZ
q0 a A q0 AA
q0 a B q0 AB
q0 b A q0 BA
q0 b B q0 BB
q0 e Z q1 Z
q0 e A q1 A
q0 e B q1 B
q1 a A q1 e
q1 b B q1 e
q1 e Z q1 e`,
    description: 'Non-deterministic pushdown automaton (NPDA). At any moment it guesses when the center has been reached via ε-transition.'
  },
  'Balanced Parentheses ()[]': {
    q0: 'q0',
    z: 'Z',
    fin: 'q1',
    mode: 'final',
    w: '([()])',
    t: `q0 ( Z q0 (Z
q0 [ Z q0 [Z
q0 ( ( q0 ((
q0 ( [ q0 ([
q0 [ ( q0 [(
q0 [ [ q0 [[
q0 ) ( q0 e
q0 ] [ q0 e
q0 e Z q1 Z`,
    description: 'Matches nested and interleaved parentheses ( and brackets [.'
  }
};

export function parsePdaDefinition({ q0, z, fin, mode, transitionsText }) {
  const errors = [];
  const cleanQ0 = q0.trim();
  const cleanZ = z.trim();
  const finalSet = new Set(
    fin.split(',').map(s => s.trim()).filter(Boolean)
  );

  if (!cleanQ0) errors.push('Start state (q0) is required.');
  if (!cleanZ) errors.push('Initial stack symbol (Z0) is required.');
  if (cleanZ.length > 1) errors.push('Initial stack symbol must be a single character.');

  const transitions = [];
  const lines = transitionsText.split('\n').map(l => l.trim()).filter(Boolean);

  lines.forEach((line, idx) => {
    const parts = line.split(/\s+/);
    if (parts.length !== 5) {
      errors.push(`Line ${idx + 1}: Expected 5 fields (from, input, top, to, push) but got ${parts.length}: "${line}"`);
      return;
    }
    const [from, a, top, to, push] = parts;

    if (top.length !== 1 || top === 'e' || top === EPSILON) {
      errors.push(`Line ${idx + 1}: Stack top symbol must be a single non-epsilon character.`);
      return;
    }

    const normInput = (a === 'e' || a === EPSILON) ? '' : a;
    if (normInput.length > 1) {
      errors.push(`Line ${idx + 1}: Input symbol must be a single character or 'e'.`);
      return;
    }

    const normPush = (push === 'e' || push === EPSILON) ? '' : push;

    transitions.push({
      from,
      a: normInput,
      top,
      to,
      push: normPush,
      raw: line,
      label: `${normInput || EPSILON}, ${top} → ${normPush || EPSILON}`
    });
  });

  // Collect all states
  const statesSet = new Set();
  if (cleanQ0) statesSet.add(cleanQ0);
  finalSet.forEach(st => statesSet.add(st));
  transitions.forEach(t => {
    statesSet.add(t.from);
    statesSet.add(t.to);
  });

  return {
    machine: {
      q0: cleanQ0,
      z: cleanZ,
      fin: finalSet,
      mode,
      states: Array.from(statesSet),
      transitions
    },
    errors
  };
}

export function simulatePda(machine, inputString, maxConfigs = 6000) {
  const { q0, z, fin, mode, transitions } = machine;
  const w = inputString.trim();

  const startConfig = { q: q0, i: 0, s: [z] };
  const key = c => `${c.q}|${c.i}|${c.s.join('')}`;

  const nodes = [{ c: startConfig, p: -1, t: null, d: 0 }];
  const seen = new Set([key(startConfig)]);

  let acceptIndex = -1;
  let bestIndex = 0;
  let maxStackObserved = 1;

  for (let h = 0; h < nodes.length && nodes.length < maxConfigs; h++) {
    const { c } = nodes[h];

    if (c.s.length > maxStackObserved) {
      maxStackObserved = c.s.length;
    }

    // Acceptance condition
    const isInputConsumed = c.i === w.length;
    const isAccepted = isInputConsumed && (
      mode === 'final' ? fin.has(c.q) : c.s.length === 0
    );

    if (isAccepted) {
      acceptIndex = h;
      break;
    }

    // Track best path so far for rejected traces
    const bestNode = nodes[bestIndex];
    if (c.i > bestNode.c.i || (c.i === bestNode.c.i && nodes[h].d > bestNode.d)) {
      bestIndex = h;
    }

    if (!c.s.length) continue;

    transitions.forEach((t, tIndex) => {
      if (t.from !== c.q || t.top !== c.s[0]) return;
      if (t.a && w[c.i] !== t.a) return;

      const nextStack = [...t.push.split(''), ...c.s.slice(1)];
      if (nextStack.length > 50) return; // stack bound guard

      const nextConfig = {
        q: t.to,
        i: c.i + (t.a ? 1 : 0),
        s: nextStack
      };

      const k = key(nextConfig);
      if (seen.has(k)) return;
      seen.add(k);

      nodes.push({
        c: nextConfig,
        p: h,
        t: tIndex,
        d: nodes[h].d + 1
      });
    });
  }

  const endIndex = acceptIndex >= 0 ? acceptIndex : bestIndex;
  const path = [];
  for (let curr = endIndex; curr >= 0; curr = nodes[curr].p) {
    path.unshift(nodes[curr]);
  }

  return {
    accepted: acceptIndex >= 0,
    steps: path,
    exploredCount: nodes.length,
    maxStackDepth: maxStackObserved,
    input: w
  };
}
