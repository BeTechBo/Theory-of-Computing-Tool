export const EPSILON = 'ε';

export const CFG_PRESETS = {
  'Arithmetic Expressions': {
    name: 'Arithmetic Expressions',
    variables: ['E', 'T', 'F'],
    terminals: ['+', '*', '(', ')', 'a'],
    startSymbol: 'E',
    rawRules: `E -> E + T | T
T -> T * F | F
F -> ( E ) | a`,
    sampleInputs: ['a+a*a', '(a+a)*a', 'a*a', 'a+a']
  },
  'Balanced Parentheses': {
    name: 'Dyck Language (Parentheses)',
    variables: ['S'],
    terminals: ['(', ')'],
    startSymbol: 'S',
    rawRules: `S -> ( S ) | S S | e`,
    sampleInputs: ['()()', '((()))', '(()())', '(()']
  },
  'aⁿbⁿ  (n ≥ 1)': {
    name: 'aⁿbⁿ Language',
    variables: ['S'],
    terminals: ['a', 'b'],
    startSymbol: 'S',
    rawRules: `S -> a S b | a b`,
    sampleInputs: ['aabb', 'aaabbb', 'ab', 'aab']
  },
  'Palindromes (a, b)': {
    name: 'Even & Odd Palindromes',
    variables: ['S'],
    terminals: ['a', 'b'],
    startSymbol: 'S',
    rawRules: `S -> a S a | b S b | a | b | e`,
    sampleInputs: ['aba', 'abba', 'aabbaa', 'ab']
  }
};

export function parseCfgRules(rawRulesText) {
  const rules = [];
  const lines = rawRulesText.split('\n').map(l => l.trim()).filter(Boolean);

  lines.forEach(line => {
    const parts = line.split('->');
    if (parts.length !== 2) return;
    const lhs = parts[0].trim();
    const rhsList = parts[1].split('|').map(r => r.trim()).filter(Boolean);

    rhsList.forEach(rhs => {
      const symbols = rhs === 'e' || rhs === EPSILON ? [] : rhs.split(/\s+/).filter(Boolean);
      rules.push({ lhs, rhs: symbols, raw: `${lhs} -> ${rhs}` });
    });
  });

  return rules;
}

// Leftmost derivation search using BFS
export function findLeftmostDerivation(grammar, targetInput, maxDepth = 12) {
  const cleanTarget = targetInput.trim();
  const rules = parseCfgRules(grammar.rawRules);
  const start = [grammar.startSymbol];

  const queue = [{
    form: start,
    derivationSteps: [{ form: [...start], rule: 'Start' }],
    tree: { name: grammar.startSymbol, children: [] }
  }];

  const seen = new Set([start.join(' ')]);

  while (queue.length > 0) {
    const { form, derivationSteps, tree } = queue.shift();

    // Check if form is all terminals and equals target
    const isAllTerminals = form.every(sym => !grammar.variables.includes(sym));
    const currentStr = form.join('');

    if (isAllTerminals) {
      if (currentStr === cleanTarget) {
        return {
          found: true,
          derivationSteps,
          tree
        };
      }
      continue;
    }

    if (derivationSteps.length >= maxDepth) continue;

    // Find leftmost variable
    const varIdx = form.findIndex(sym => grammar.variables.includes(sym));
    if (varIdx === -1) continue;

    const v = form[varIdx];
    const applicableRules = rules.filter(r => r.lhs === v);

    applicableRules.forEach(rule => {
      const nextForm = [
        ...form.slice(0, varIdx),
        ...rule.rhs,
        ...form.slice(varIdx + 1)
      ];

      // Pruning heuristic: if prefix of terminals doesn't match target
      let prefixMatch = true;
      let targetPos = 0;
      for (const sym of nextForm) {
        if (grammar.variables.includes(sym)) break;
        if (!cleanTarget.startsWith(sym, targetPos)) {
          prefixMatch = false;
          break;
        }
        targetPos += sym.length;
      }

      if (!prefixMatch && nextForm.length > cleanTarget.length + 2) return;

      const k = nextForm.join(' ');
      if (seen.has(k)) return;
      seen.add(k);

      // Deep copy tree and add children
      const nextTree = JSON.parse(JSON.stringify(tree));
      addChildrenToLeftmostVar(nextTree, v, rule.rhs);

      queue.push({
        form: nextForm,
        derivationSteps: [
          ...derivationSteps,
          { form: nextForm, rule: rule.raw }
        ],
        tree: nextTree
      });
    });
  }

  return { found: false, derivationSteps: [], tree: null };
}

function addChildrenToLeftmostVar(node, targetVar, rhsSymbols) {
  if (node.name === targetVar && (!node.children || node.children.length === 0)) {
    node.children = rhsSymbols.length === 0
      ? [{ name: EPSILON, children: [] }]
      : rhsSymbols.map(s => ({ name: s, children: [] }));
    return true;
  }

  if (node.children) {
    for (const child of node.children) {
      if (addChildrenToLeftmostVar(child, targetVar, rhsSymbols)) {
        return true;
      }
    }
  }
  return false;
}

// CYK Table Dynamic Programming Algorithm for CNF grammars
export function computeCykTable(cnfRules, terminals, w) {
  const n = w.length;
  if (n === 0) return { table: [], accepted: false };

  // table[len][i] contains set of variables generating w[i..i+len-1]
  const table = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set())
  );

  // Base case: length 1 substrings
  for (let i = 0; i < n; i++) {
    const char = w[i];
    cnfRules.forEach(r => {
      if (r.rhs.length === 1 && r.rhs[0] === char) {
        table[0][i].add(r.lhs);
      }
    });
  }

  // Length 2 to n
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      for (let k = 1; k < len; k++) {
        const leftSet = table[k - 1][i];
        const rightSet = table[len - k - 1][i + k];

        cnfRules.forEach(r => {
          if (r.rhs.length === 2) {
            const [b, c] = r.rhs;
            if (leftSet.has(b) && rightSet.has(c)) {
              table[len - 1][i].add(r.lhs);
            }
          }
        });
      }
    }
  }

  return {
    table: table.map(row => row.map(cell => Array.from(cell))),
    accepted: table[n - 1][0].has('S')
  };
}
