// S11 · Regex → ε-NFA (Thompson's Inductive Construction)
// Builds an equivalent ε-NFA from a regular expression from the inside out.

import { EPS, EMPTY, machineToDot, runSets, accepts, setName, stringsUpTo } from '../machine.js';

// --- Simple Regex Parser to AST ---
// Nodes:
//   { type: 'empty' }
//   { type: 'eps' }
//   { type: 'char', char: 'a' }
//   { type: 'star', expr: node }
//   { type: 'concat', left: node, right: node }
//   { type: 'union', left: node, right: node }

function tokenize(str) {
  const tokens = [];
  const clean = str.replace(/\s+/g, '');
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '(' || c === ')' || c === '*' || c === '+' || c === '|' || c === '∪') {
      tokens.push(c === '∪' ? '|' : c);
    } else if (c === 'ε' || c === 'e' || c === 'λ') {
      tokens.push(EPS);
    } else if (c === '∅' || c === '0' && clean[i+1] === '/' && clean[i+2] === '0') {
      tokens.push(EMPTY);
    } else {
      tokens.push(c);
    }
  }
  return tokens;
}

// Infix with explicit concatenation
function addConcatTokens(tokens) {
  const out = [];
  const isOperand = t => t !== '(' && t !== ')' && t !== '|' && t !== '*' && t !== '+';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    out.push(t);
    if (i + 1 < tokens.length) {
      const next = tokens[i + 1];
      const canFollow = isOperand(t) || t === ')' || t === '*' || t === '+';
      const canLead = isOperand(next) || next === '(';
      if (canFollow && canLead) {
        out.push('•');
      }
    }
  }
  return out;
}

// Shunting-yard to Postfix
function toPostfix(tokens) {
  const prec = { '*': 3, '+': 3, '•': 2, '|': 1 };
  const out = [];
  const stack = [];
  tokens.forEach(t => {
    if (t === '(') {
      stack.push(t);
    } else if (t === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
        out.push(stack.pop());
      }
      stack.pop(); // pop '('
    } else if (prec[t]) {
      while (stack.length && prec[stack[stack.length - 1]] >= prec[t]) {
        out.push(stack.pop());
      }
      stack.push(t);
    } else {
      out.push(t);
    }
  });
  while (stack.length) out.push(stack.pop());
  return out;
}

function parseRegex(regexStr) {
  const tokens = tokenize(regexStr);
  if (!tokens.length) return { type: 'eps', text: EPS };
  const withConcat = addConcatTokens(tokens);
  const postfix = toPostfix(withConcat);

  const stack = [];
  postfix.forEach(t => {
    if (t === '*') {
      const expr = stack.pop() || { type: 'eps', text: EPS };
      stack.push({ type: 'star', expr, text: `(${expr.text})*` });
    } else if (t === '+') {
      const expr = stack.pop() || { type: 'eps', text: EPS };
      // a+ is aa*
      stack.push({
        type: 'concat',
        left: expr,
        right: { type: 'star', expr, text: `(${expr.text})*` },
        text: `(${expr.text})+`
      });
    } else if (t === '•') {
      const r = stack.pop();
      const l = stack.pop();
      stack.push({ type: 'concat', left: l, right: r, text: `${l.text}${r.text}` });
    } else if (t === '|') {
      const r = stack.pop();
      const l = stack.pop();
      stack.push({ type: 'union', left: l, right: r, text: `(${l.text}|${r.text})` });
    } else if (t === EPS) {
      stack.push({ type: 'eps', text: EPS });
    } else if (t === EMPTY) {
      stack.push({ type: 'empty', text: EMPTY });
    } else {
      stack.push({ type: 'char', char: t, text: t });
    }
  });
  return stack.pop() || { type: 'eps', text: EPS };
}

// Convert a machine fragment to a displayable transition table
function fragmentTable(m) {
  const alpha = [...m.alphabet];
  return [
    ['state', ...alpha],
    ...m.states.map(q => [
      `${q === m.start ? '→ ' : ''}${m.final.includes(q) ? '* ' : ''}${q}`,
      ...alpha.map(a => (m.delta[q]?.[a]?.length ? `{${m.delta[q][a].join(', ')}}` : '∅'))
    ])
  ];
}

export function solveThompson(regexStr, testStrings = []) {
  const cleanStr = String(regexStr || '').trim();
  if (!cleanStr) throw new Error('Please give a regular expression, e.g. "(a|b)*abb".');

  const ast = parseRegex(cleanStr);
  const steps = [];
  let stateId = 0;
  const nextState = () => `q${stateId++}`;

  // Collect alphabet symbols from the AST
  const symSet = new Set();
  const getSyms = n => {
    if (!n) return;
    if (n.type === 'char') symSet.add(n.char);
    if (n.left) getSyms(n.left);
    if (n.right) getSyms(n.right);
    if (n.expr) getSyms(n.expr);
  };
  getSyms(ast);
  const alphabet = [...symSet].sort();
  if (!alphabet.length) alphabet.push('a');
  const fullAlphabet = alphabet.concat(EPS);

  // Helper to deep copy / ensure state delta structure
  function emptyDelta(states) {
    const d = {};
    states.forEach(s => {
      d[s] = {};
      fullAlphabet.forEach(a => { d[s][a] = []; });
    });
    return d;
  }

  function mergeDelta(d1, d2) {
    const res = {};
    const allStates = new Set([...Object.keys(d1), ...Object.keys(d2)]);
    allStates.forEach(s => {
      res[s] = {};
      fullAlphabet.forEach(a => {
        const set = new Set([...(d1[s]?.[a] || []), ...(d2[s]?.[a] || [])]);
        res[s][a] = [...set];
      });
    });
    return res;
  }

  // Inductive fragment builder: returns { states, alphabet, start, final: [accept], delta, label }
  function buildFragment(node) {
    if (node.type === 'char') {
      const s = nextState();
      const f = nextState();
      const d = emptyDelta([s, f]);
      d[s][node.char] = [f];
      const frag = {
        states: [s, f],
        alphabet: fullAlphabet,
        start: s,
        final: [f],
        delta: d,
        label: `symbol "${node.char}"`
      };
      steps.push({
        title: `Base fragment: ${frag.label}`,
        explain: `For the literal symbol "${node.char}", create 2 fresh states: start ${s} and accept ${f}, connected by an arrow on "${node.char}".`,
        lines: [
          `fresh start: ${s}`,
          `fresh accept: ${f}`,
          `transition: δ(${s}, ${node.char}) = {${f}}`
        ],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [s, f],
        extra: {}
      });
      return frag;
    }

    if (node.type === 'eps') {
      const s = nextState();
      const f = nextState();
      const d = emptyDelta([s, f]);
      d[s][EPS] = [f];
      const frag = {
        states: [s, f],
        alphabet: fullAlphabet,
        start: s,
        final: [f],
        delta: d,
        label: `empty string ε`
      };
      steps.push({
        title: `Base fragment: ${frag.label}`,
        explain: `For the empty string ε, create 2 states: start ${s} and accept ${f}, connected by an ε-arrow.`,
        lines: [`δ(${s}, ε) = {${f}}`],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [s, f],
        extra: {}
      });
      return frag;
    }

    if (node.type === 'empty') {
      const s = nextState();
      const f = nextState();
      const d = emptyDelta([s, f]);
      const frag = {
        states: [s, f],
        alphabet: fullAlphabet,
        start: s,
        final: [f],
        delta: d,
        label: `empty set ∅`
      };
      steps.push({
        title: `Base fragment: ${frag.label}`,
        explain: `For the empty set ∅, create start ${s} and accept ${f} with no transitions.`,
        lines: [`No transitions between ${s} and ${f}`],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [s, f],
        extra: {}
      });
      return frag;
    }

    if (node.type === 'concat') {
      const leftFrag = buildFragment(node.left);
      const rightFrag = buildFragment(node.right);
      const lAcc = leftFrag.final[0];
      const rStart = rightFrag.start;

      const delta = mergeDelta(leftFrag.delta, rightFrag.delta);
      // Connect accept of left to start of right via ε
      delta[lAcc][EPS] = [...(delta[lAcc][EPS] || []), rStart];

      const states = [...leftFrag.states, ...rightFrag.states];
      const frag = {
        states,
        alphabet: fullAlphabet,
        start: leftFrag.start,
        final: rightFrag.final,
        delta,
        label: `concatenation: ${node.text}`
      };

      steps.push({
        title: `Concatenation: ${node.text}`,
        explain: `Connect the accept state of the left fragment (${lAcc}) to the start state of the right fragment (${rStart}) via an ε-transition.`,
        lines: [
          `new transition: δ(${lAcc}, ε) = {${rStart}}`,
          `combined start: ${leftFrag.start}`,
          `combined accept: ${rightFrag.final[0]}`,
          `total states: ${states.length}`
        ],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [lAcc, rStart],
        extra: {}
      });
      return frag;
    }

    if (node.type === 'union') {
      const leftFrag = buildFragment(node.left);
      const rightFrag = buildFragment(node.right);

      const s = nextState();
      const f = nextState();

      let delta = mergeDelta(leftFrag.delta, rightFrag.delta);
      delta = mergeDelta(delta, emptyDelta([s, f]));

      // s branches to both starts
      delta[s][EPS] = [leftFrag.start, rightFrag.start];
      // both accepts join to f
      delta[leftFrag.final[0]][EPS] = [...(delta[leftFrag.final[0]][EPS] || []), f];
      delta[rightFrag.final[0]][EPS] = [...(delta[rightFrag.final[0]][EPS] || []), f];

      const states = [s, ...leftFrag.states, ...rightFrag.states, f];
      const frag = {
        states,
        alphabet: fullAlphabet,
        start: s,
        final: [f],
        delta,
        label: `union: ${node.text}`
      };

      steps.push({
        title: `Union: ${node.text}`,
        explain: `Create fresh start state ${s} branching via ε to both fragments (${leftFrag.start} and ${rightFrag.start}), and join both accept states (${leftFrag.final[0]} and ${rightFrag.final[0]}) via ε into fresh accept state ${f}.`,
        lines: [
          `fresh start: ${s}  —ε→ {${leftFrag.start}, ${rightFrag.start}}`,
          `join accepts: ${leftFrag.final[0]} —ε→ ${f}, and ${rightFrag.final[0]} —ε→ ${f}`,
          `total states: ${states.length} (+2 for union)`
        ],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [s, f],
        extra: {}
      });
      return frag;
    }

    if (node.type === 'star') {
      const innerFrag = buildFragment(node.expr);
      const s = nextState();
      const f = nextState();

      let delta = mergeDelta(innerFrag.delta, emptyDelta([s, f]));
      // fresh start branches to inner start and directly to f (bypass for ε)
      delta[s][EPS] = [innerFrag.start, f];
      // inner accept loops back to inner start and forward to f
      delta[innerFrag.final[0]][EPS] = [...(delta[innerFrag.final[0]][EPS] || []), innerFrag.start, f];

      const states = [s, ...innerFrag.states, f];
      const frag = {
        states,
        alphabet: fullAlphabet,
        start: s,
        final: [f],
        delta,
        label: `Kleene star: ${node.text}`
      };

      steps.push({
        title: `Kleene star: ${node.text}`,
        explain: `Create fresh start ${s} with an ε-arrow to ${innerFrag.start} and a bypass ε-arrow to ${f} (so ε is accepted). Connect inner accept ${innerFrag.final[0]} back to ${innerFrag.start} (loop to repeat) and forward to ${f}.`,
        lines: [
          `fresh start: ${s} —ε→ ${innerFrag.start} (enter), and —ε→ ${f} (bypass for ε)`,
          `inner accept: ${innerFrag.final[0]} —ε→ ${innerFrag.start} (repeat), and —ε→ ${f} (exit)`,
          `total states: ${states.length} (+2 for star)`
        ],
        table: fragmentTable(frag),
        graph: machineToDot(frag),
        highlight: [s, f],
        extra: {}
      });
      return frag;
    }
  }

  // Build the complete machine
  const finalMachine = buildFragment(ast);
  if (steps.length) {
    steps[steps.length - 1].extra = { machine: finalMachine };
  }

  // Compute test strings
  const candidateTests = testStrings.length ? [...testStrings] : stringsUpTo(alphabet, 3).slice(0, 6);
  // Guarantee at least one accepted and one rejected string (Style Rule 7)
  let foundRejected = false;
  let foundAccepted = false;

  const tests = [];
  candidateTests.forEach(w => {
    const sets = runSets(finalMachine, w);
    const ok = sets[sets.length - 1].some(q => finalMachine.final.includes(q));
    if (ok) foundAccepted = true;
    else foundRejected = true;
    tests.push({
      input: w === '' ? EPS : w,
      path: sets.map(setName).join(' → '),
      accepted: ok
    });
  });

  // If all are accepted, search for a rejected string
  if (!foundRejected) {
    const longer = stringsUpTo(alphabet, 5);
    const rej = longer.find(w => !accepts(finalMachine, w));
    if (rej !== undefined) {
      const sets = runSets(finalMachine, rej);
      tests.push({
        input: rej === '' ? EPS : rej,
        path: sets.map(setName).join(' → '),
        accepted: false
      });
    }
  }

  return {
    technique: 'thompson',
    session: 'S11',
    input_summary: `Regex: "${cleanStr}" over alphabet Σ = {${alphabet.join(', ')}}`,
    formal: `M = (Q, Σ, δ, ${finalMachine.start}, {${finalMachine.final.join(', ')}}), with |Q| = ${finalMachine.states.length} states`,
    facts: [
      { item: finalMachine.start, meaning: 'initial state before matching any part of the expression' },
      { item: finalMachine.final[0], meaning: 'accepting state reached when the entire regex is matched' }
    ],
    steps,
    tests,
    language: `All strings matched by the regular expression ${cleanStr}.`,
    conclusion: `Thompson's construction complete. Built an equivalent ε-NFA with ${finalMachine.states.length} states and exactly one start and one accept state.`
  };
}
