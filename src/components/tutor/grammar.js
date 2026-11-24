// Shared helpers for context-free grammars in the Technique Tutor (S17–S21, Noor).
//
// Grammar shape used everywhere:
//   { variables: ['S','A'], terminals: ['a','b'], start: 'S',
//     rules: [{ lhs: 'S', rhs: ['a','S','b'] }, { lhs: 'S', rhs: [] }] }
// A right-hand side is a list of symbols; [] is ε. variables[0] is always the start symbol.
// Terminals are single characters; variables are a capital letter, optionally followed by
// one lowercase letter, digits or primes (S, A1, S0, Ca, D2, A′).

export const EPS = 'ε';
export const VAR = "[A-Z][a-z]?[0-9₀-₉]{0,2}['′]*";
const ARROW = '(?:→|⟶|-->|->|::=)';
const EPS_WORDS = ['ε', 'eps', 'epsilon', 'λ', 'lambda', 'Λ', '^', '""', "''", 'empty'];
// "X →" at the start of a line or after a space / ( / { / :, but not the "a, X → AX" label of a PDA arrow.
const RULE_START = new RegExp(`(?:^|(?<=[\\s:({])(?<!,\\s*))(${VAR})\\s*${ARROW}`, 'm');

// Does this text contain productions? (An FA table row starts with the arrow; a rule has a variable before it.)
export const hasProductions = text => RULE_START.test(text);
export const firstRuleAt = line => {
  const m = RULE_START.exec(line);
  return m ? m.index : -1;
};

// ---------- text → grammar ----------
//
//   S → aSb | ε            also "->", "::=", several rules on one line separated by , or ;
//   A -> aA | a            a line starting with | continues the rule above it
// Optional: "start: S", "T = {a, b, c}", or the 4-tuple G = ({S, A}, {a, b}, P, S).
export function parseGrammar(text) {
  const declared = { V: [], T: [], start: null };
  const list = s => s.split(',').map(x => x.trim()).filter(Boolean);
  const tup = text.match(/\(\s*\{([^}]*)\}\s*,\s*\{([^}]*)\}\s*,/);
  if (tup) {
    Object.assign(declared, { V: list(tup[1]), T: list(tup[2]) });
    const st = text.match(new RegExp(`,\\s*(${VAR})\\s*\\)`));
    if (st) declared.start = st[1];
  }
  // P written inside braces, possibly inside the tuple: { S → aSb | ε }
  const inner = text.match(new RegExp(`\\{\\s*(${VAR}\\s*${ARROW}[^{}]*)\\}`));

  const chunks = []; // [lhs, body]
  (inner ? inner[1] : text).split('\n').forEach(raw => {
    const line = raw.replace(/^\s*(?:[-•*]\s+)?(?:P\d*['′]?\s*=\s*)?\{?\s*/, '').replace(/[\s,;]*\}?[\s,;]*$/, '');
    if (!line) return;
    let m;
    if ((m = line.match(/^(?:V|N)\s*=\s*\{([^}]*)$/))) return void (declared.V = list(m[1]));
    if ((m = line.match(/^(?:T|Σ|Sigma)\s*=\s*\{([^}]*)$/i))) return void (declared.T = list(m[1]));
    if ((m = line.match(new RegExp(`^start(?: symbol)?\\s*[:=]\\s*(${VAR})$`, 'i')))) return void (declared.start = m[1]);
    if (/^\|/.test(line) && chunks.length) return void (chunks[chunks.length - 1][1] += ' ' + line);
    // several rules on one line: split before every "X →" that follows a comma or semicolon
    line.split(new RegExp(`\\s*[,;]\\s*(?=${VAR}\\s*${ARROW})`)).forEach(part => {
      const at = firstRuleAt(part); // words before the rule ("Simplify: S → …") are not part of it
      const r = at < 0 ? null : part.slice(at).match(new RegExp(`^(${VAR})\\s*${ARROW}(.*)$`));
      if (r) chunks.push([r[1], r[2]]);
    });
  });
  if (!chunks.length) throw new Error('I could not find any productions. Write them like  S → aSb | ε  (one variable, an arrow, then the alternatives separated by |).');

  const names = [...new Set([...chunks.map(c => c[0]), ...declared.V])].sort((a, b) => b.length - a.length);
  const tokens = body => {
    const out = [];
    body.split(/\s+/).forEach(word => {
      for (let i = 0; i < word.length; ) {
        const known = names.find(nm => word.startsWith(nm, i));
        if (known) {
          out.push(known);
          i += known.length;
        } else if (/[A-Z]/.test(word[i])) {
          const v = word.slice(i).match(/^[A-Z]['′]*/)[0]; // a variable with no productions of its own
          out.push(v);
          i += v.length;
        } else {
          if (!EPS_WORDS.includes(word[i])) out.push(word[i]);
          i++;
        }
      }
    });
    return out;
  };

  const raw = chunks.flatMap(([lhs, body]) => body.split('|').map(alt => ({ lhs, alt: alt.trim() })));
  // A lone "e" means ε (students cannot type ε), unless e is clearly used as a terminal elsewhere.
  const eIsTerminal = raw.some(r => r.alt !== 'e' && !EPS_WORDS.includes(r.alt.toLowerCase()) && tokens(r.alt).includes('e'));
  const notes = [];
  const rules = [];
  raw.forEach(({ lhs, alt }) => {
    let rhs;
    if (alt === '' || EPS_WORDS.includes(alt) || EPS_WORDS.includes(alt.toLowerCase())) rhs = [];
    else if (alt === 'e' && !eIsTerminal) {
      rhs = [];
      if (!notes.length) notes.push('I read the lone "e" as ε.');
    } else rhs = tokens(alt);
    if (!rules.some(r => r.lhs === lhs && r.rhs.join(' ') === rhs.join(' '))) rules.push({ lhs, rhs });
  });

  const start = declared.start || chunks[0][0];
  const variables = [...new Set([start, ...chunks.map(c => c[0]), ...declared.V, ...rules.flatMap(r => r.rhs.filter(x => /^[A-Z]/.test(x)))])];
  const used = [...new Set(rules.flatMap(r => r.rhs.filter(x => !/^[A-Z]/.test(x))))].sort();
  const terminals = [...new Set([...declared.T.filter(t => !/^[A-Z]/.test(t)), ...used])];
  const g = { variables, terminals, start, rules };
  if (notes.length) g.notes = notes;
  return g;
}

// ---------- grammar → text ----------
export const isVar = (g, x) => g.variables.includes(x);
export const rhsStr = rhs => (rhs.length === 0 ? EPS : rhs.some(s => s.length > 1) ? rhs.join(' ') : rhs.join(''));
export const ruleStr = r => `${r.lhs} → ${rhsStr(r.rhs)}`;
export const rulesOf = (g, A) => g.rules.filter(r => r.lhs === A);
export const setStr = arr => (arr.length ? `{${arr.join(', ')}}` : '∅');
export const tupleStr = (g, name = 'G') => `${name} = (${setStr(g.variables)}, ${setStr(g.terminals)}, P, ${g.start})`;
export const grammarLines = g => g.variables.filter(A => rulesOf(g, A).length).map(A => `${A} → ${rulesOf(g, A).map(r => rhsStr(r.rhs)).join(' | ')}`);
export const grammarText = g => grammarLines(g).join('\n');
export const sameRule = (a, b) => a.lhs === b.lhs && a.rhs.length === b.rhs.length && a.rhs.every((x, i) => x === b.rhs[i]);
export const dedupeRules = rules => rules.filter((r, i) => rules.findIndex(o => sameRule(o, r)) === i);
// Same V, T and S, new productions (grouped by variable, in the order of V).
export const withRules = (g, rules, extra = {}) => {
  const base = { ...g, ...extra };
  const clean = dedupeRules(rules);
  return { variables: base.variables, terminals: base.terminals, start: base.start, rules: base.variables.flatMap(A => clean.filter(r => r.lhs === A)) };
};
export const freshName = (taken, base) => {
  let name = base;
  while (taken.includes(name)) name += '′';
  return name;
};

// ---------- the three closure computations (each records its rounds, for the worked steps) ----------

// Lemma 1 (S18): A is generating if A ⇒* w for some terminal string w (ε counts). Bottom-up.
export function generating(g) {
  const set = new Set();
  const rounds = [];
  for (;;) {
    const add = [];
    g.variables.forEach(A => {
      if (set.has(A)) return;
      const rule = g.rules.find(r => r.lhs === A && r.rhs.every(x => !isVar(g, x) || set.has(x)));
      if (rule) add.push({ v: A, rule });
    });
    if (!add.length) break;
    add.forEach(a => set.add(a.v));
    rounds.push(add);
  }
  return { set, rounds };
}

// Lemma 2 (S18): X is reachable if S ⇒* αXβ. Top-down from S. The set holds variables AND terminals.
export function reachable(g) {
  const set = new Set([g.start]);
  const rounds = [];
  let frontier = [g.start];
  while (frontier.length) {
    const add = [];
    frontier.forEach(A => rulesOf(g, A).forEach(rule => rule.rhs.forEach(x => {
      if (!set.has(x)) {
        set.add(x);
        add.push({ sym: x, rule });
      }
    })));
    if (add.length) rounds.push(add);
    frontier = add.map(a => a.sym).filter(x => isVar(g, x));
  }
  return { set, rounds };
}

// A is nullable if A ⇒* ε.
export function nullable(g) {
  const set = new Set();
  const rounds = [];
  for (;;) {
    const add = [];
    g.variables.forEach(A => {
      if (set.has(A)) return;
      const rule = g.rules.find(r => r.lhs === A && r.rhs.every(x => set.has(x)));
      if (rule) add.push({ v: A, rule });
    });
    if (!add.length) break;
    add.forEach(a => set.add(a.v));
    rounds.push(add);
  }
  return { set, rounds };
}

export const isUnit = (g, r) => r.rhs.length === 1 && isVar(g, r.rhs[0]);

// ---------- the simplification steps (S18), each a pure function ----------

export function removeNonGenerating(g) {
  const info = generating(g);
  const keep = g.variables.filter(A => info.set.has(A) || A === g.start);
  const rules = g.rules.filter(r => info.set.has(r.lhs) && r.rhs.every(x => !isVar(g, x) || info.set.has(x)));
  return { grammar: { variables: keep, terminals: g.terminals, start: g.start, rules }, ...info, removed: g.variables.filter(A => !info.set.has(A)) };
}

export function removeUnreachable(g) {
  const info = reachable(g);
  const rules = g.rules.filter(r => info.set.has(r.lhs));
  return {
    grammar: { variables: g.variables.filter(A => info.set.has(A)), terminals: g.terminals.filter(t => info.set.has(t)), start: g.start, rules },
    ...info,
    removed: g.variables.filter(A => !info.set.has(A)),
    removedTerminals: g.terminals.filter(t => !info.set.has(t))
  };
}

// Every combination with the nullable symbols present or absent, but never all absent.
export function removeEpsilon(g) {
  const info = nullable(g);
  const out = [];
  const detail = [];
  g.rules.forEach(rule => {
    if (!rule.rhs.length) return void detail.push({ rule, deleted: true, variants: [] });
    const idx = rule.rhs.map((x, i) => (info.set.has(x) ? i : -1)).filter(i => i >= 0);
    const variants = [];
    for (let mask = 0; mask < 1 << idx.length; mask++) {
      const rhs = rule.rhs.filter((_, i) => !idx.some((p, k) => p === i && mask & (1 << k)));
      if (rhs.length && !variants.some(v => v.join(' ') === rhs.join(' '))) variants.push(rhs);
    }
    detail.push({ rule, variants, nullableCount: idx.length });
    variants.forEach(rhs => out.push({ lhs: rule.lhs, rhs }));
  });
  return { grammar: withRules(g, out), ...info, detail, epsInLanguage: info.set.has(g.start) };
}

// A ⇒* B by unit productions only (the chains), then A receives B's non-unit productions.
export function removeUnits(g) {
  const units = g.rules.filter(r => isUnit(g, r));
  const out = [];
  const detail = [];
  g.variables.forEach(A => {
    const chain = new Map([[A, [A]]]);
    const queue = [A];
    while (queue.length) {
      const X = queue.shift();
      rulesOf(g, X).filter(r => isUnit(g, r)).forEach(r => {
        if (!chain.has(r.rhs[0])) {
          chain.set(r.rhs[0], [...chain.get(X), r.rhs[0]]);
          queue.push(r.rhs[0]);
        }
      });
    }
    const own = rulesOf(g, A).filter(r => !isUnit(g, r));
    out.push(...own);
    chain.forEach((path, B) => {
      if (B === A) return;
      const gained = rulesOf(g, B).filter(r => !isUnit(g, r)).map(r => ({ lhs: A, rhs: r.rhs }));
      const fresh = gained.filter(r => !out.some(o => sameRule(o, r)));
      out.push(...gained);
      detail.push({ A, B, chain: path, gained, fresh });
    });
    if (rulesOf(g, A).some(r => isUnit(g, r) && r.rhs[0] === A)) detail.push({ A, B: A, chain: [A, A], gained: [], fresh: [], self: true });
  });
  return { grammar: withRules(g, out), units, detail };
}

// Variables that have lost every production (e.g. A → ε only) and the rules that still mention them.
export function dropDead(g) {
  let cur = g;
  const dead = [];
  for (;;) {
    const gone = cur.variables.filter(A => A !== cur.start && !rulesOf(cur, A).length);
    if (!gone.length) return { grammar: cur, dead };
    dead.push(...gone);
    cur = { ...cur, variables: cur.variables.filter(A => !gone.includes(A)), rules: cur.rules.filter(r => !r.rhs.some(x => gone.includes(x))) };
  }
}

// ---------- the Chomsky type, read off the shape of the productions (S17) ----------
export function shapeOf(g, r) {
  const at = r.rhs.map((x, i) => (isVar(g, x) ? i : -1)).filter(i => i >= 0);
  if (at.length === 0) return 'terminal'; // A → w : fits right- and left-linear
  if (at.length > 1) return 'cf';
  if (r.rhs.length === 1) return 'unit'; // A → B : fits both
  if (at[0] === r.rhs.length - 1) return 'right';
  if (at[0] === 0) return 'left';
  return 'middle';
}
export function classify(g) {
  const shapes = g.rules.map(r => ({ rule: r, shape: shapeOf(g, r) }));
  const all = (...ok) => shapes.every(s => ok.includes(s.shape));
  const witness = (...bad) => shapes.find(s => bad.includes(s.shape))?.rule;
  if (all('terminal', 'unit', 'right')) return { type: 'right-linear', chomsky: 3, shapes, why: 'every right-hand side is terminals only, or terminals followed by ONE variable at the right end' };
  if (all('terminal', 'unit', 'left')) return { type: 'left-linear', chomsky: 3, shapes, why: 'every right-hand side is terminals only, or ONE variable at the left end followed by terminals' };
  if (all('terminal', 'unit', 'right', 'left', 'middle')) {
    const mid = witness('middle');
    return {
      type: 'linear',
      chomsky: 2,
      shapes,
      why: mid
        ? `${ruleStr(mid)} has its variable in the MIDDLE, so the grammar is linear but neither right- nor left-linear`
        : `${ruleStr(witness('right'))} is right-linear but ${ruleStr(witness('left'))} is left-linear: a Type 3 grammar must be ALL one or ALL the other`
    };
  }
  return { type: 'context-free', chomsky: 2, shapes, why: `${ruleStr(witness('cf'))} has two or more variables on the right` };
}

// Normal-form shapes (S19). Returns the first production that breaks each form, or null.
export function normalForms(g) {
  const startOnRhs = g.rules.some(r => r.rhs.includes(g.start));
  const cnfOk = r => (r.rhs.length === 2 && r.rhs.every(x => isVar(g, x))) || (r.rhs.length === 1 && !isVar(g, r.rhs[0])) || (r.rhs.length === 0 && r.lhs === g.start && !startOnRhs);
  const gnfOk = r => r.rhs.length >= 1 && !isVar(g, r.rhs[0]) && r.rhs.slice(1).every(x => isVar(g, x));
  return { cnfBreak: g.rules.find(r => !cnfOk(r)) || null, gnfBreak: g.rules.find(r => !gnfOk(r)) || null, cnfOk, gnfOk };
}

// ---------- the language, by brute force (independent of every transformation above) ----------

// Every string of length ≤ N that each variable derives: a fixpoint over sets of strings.
export function languageUpTo(g, N, cap = 20000) {
  const L = Object.fromEntries(g.variables.map(A => [A, new Set()]));
  let total = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (const r of g.rules) {
      let partial = [''];
      for (const x of r.rhs) {
        const next = new Set();
        if (!isVar(g, x)) partial.forEach(p => p.length < N && next.add(p + x));
        else for (const p of partial) for (const s of L[x]) if (p.length + s.length <= N) next.add(p + s);
        partial = [...next];
        if (!partial.length) break;
      }
      for (const s of partial) {
        if (L[r.lhs].has(s)) continue;
        L[r.lhs].add(s);
        changed = true;
        if (++total > cap) throw new Error('too many strings');
      }
    }
  }
  return L;
}

// The largest length we can afford to enumerate (the whole table stays under the budget).
export function affordableLength(g, budget = 4000, max = 10) {
  let best = 0;
  for (let n = 1; n <= max; n++) {
    try {
      languageUpTo(g, n, budget);
      best = n;
    } catch {
      break;
    }
  }
  return best;
}

const byLength = terminals => (a, b) => a.length - b.length || [...a].map(c => terminals.indexOf(c)).join(',').localeCompare([...b].map(c => terminals.indexOf(c)).join(','), undefined, { numeric: true });
export function members(g, N) {
  return [...languageUpTo(g, N)[g.start]].sort(byLength(g.terminals));
}

// Compare L(G1) and L(G2) on every string up to a length bound. minusEps: G2 may have lost ε.
export function sameLanguage(g1, g2, { minusEps = false, budget = 4000 } = {}) {
  const N = Math.max(1, Math.min(affordableLength(g1, budget), affordableLength(g2, budget)));
  const a = languageUpTo(g1, N, 10 * budget)[g1.start];
  const b = languageUpTo(g2, N, 10 * budget)[g2.start];
  if (minusEps) a.delete('');
  const order = byLength([...new Set([...g1.terminals, ...g2.terminals])]);
  const onlyA = [...a].filter(w => !b.has(w)).sort(order)[0];
  const onlyB = [...b].filter(w => !a.has(w)).sort(order)[0];
  return { ok: onlyA === undefined && onlyB === undefined, N, count: a.size, onlyFirst: onlyA, onlySecond: onlyB };
}

// All strings over the terminals up to length n, shortest first.
export function allStrings(terminals, n, cap = 5000) {
  const out = [''];
  let layer = [''];
  for (let len = 1; len <= n && out.length < cap; len++) {
    const next = [];
    layer.forEach(p => terminals.forEach(a => next.push(p + a)));
    out.push(...next);
    layer = next;
  }
  return out;
}

// ---------- parsing one string: a chart, then the derivation trees ----------
function buildChart(g, w) {
  const n = w.length;
  const vars = new Set(g.variables);
  const can = Object.fromEntries(g.variables.map(A => [A, new Set()]));
  const key = (i, j) => i * (n + 1) + j;
  // positions reachable after deriving rhs[from..] starting at position i
  const ends = (rhs, from, i) => {
    let cur = new Set([i]);
    for (let k = from; k < rhs.length && cur.size; k++) {
      const x = rhs[k];
      const next = new Set();
      if (!vars.has(x)) cur.forEach(e => e < n && w[e] === x && next.add(e + 1));
      else cur.forEach(e => {
        for (let j = e; j <= n; j++) if (can[x].has(key(e, j))) next.add(j);
      });
      cur = next;
    }
    return cur;
  };
  for (let changed = true; changed; ) {
    changed = false;
    for (const r of g.rules) {
      for (let i = 0; i <= n; i++) {
        ends(r.rhs, 0, i).forEach(j => {
          if (!can[r.lhs].has(key(i, j))) {
            can[r.lhs].add(key(i, j));
            changed = true;
          }
        });
      }
    }
  }
  return { can, key, ends, n, vars };
}

export const derives = (g, w) => {
  const c = buildChart(g, w);
  return c.can[g.start].has(c.key(0, c.n));
};

// Up to `limit` different derivation trees for w. Tree node: { sym, rule, children } for a
// variable, { sym } for a terminal, and a lone { sym: 'ε' } child for A → ε.
// repeat = how often the same (variable, span) may nest inside itself: 1 gives the trees with
// no loops; 2 also finds the second tree of a grammar whose only ambiguity is a loop (A ⇒ B ⇒ A).
export function parseTrees(g, w, { limit = 2, repeat = 1, budget = 60000 } = {}) {
  const { can, key, ends, n, vars } = buildChart(g, w);
  if (!can[g.start].has(key(0, n))) return [];
  let work = 0;
  const path = new Map();
  const take = gen => {
    const got = [];
    for (const x of gen) {
      got.push(x);
      if (got.length >= limit) break;
    }
    return got;
  };
  function* node(A, i, j) {
    const k = `${A}|${i}|${j}`;
    const depth = path.get(k) || 0;
    if (depth >= repeat) return;
    path.set(k, depth + 1);
    try {
      for (const rule of g.rules) {
        if (rule.lhs !== A) continue;
        if (!rule.rhs.length) {
          if (i === j) yield { sym: A, rule, children: [{ sym: EPS }] };
        } else if (ends(rule.rhs, 0, i).has(j)) {
          for (const children of seq(rule.rhs, 0, i, j)) yield { sym: A, rule, children };
        }
      }
    } finally {
      path.set(k, depth);
    }
  }
  function* seq(rhs, idx, i, j) {
    if (++work > budget) return;
    if (idx === rhs.length) {
      if (i === j) yield [];
      return;
    }
    const x = rhs[idx];
    if (!vars.has(x)) {
      if (i < j && w[i] === x) for (const rest of seq(rhs, idx + 1, i + 1, j)) yield [{ sym: x }, ...rest];
      return;
    }
    for (let m = i; m <= j; m++) {
      if (!can[x].has(key(i, m)) || !ends(rhs, idx + 1, m).has(j)) continue;
      const subtrees = take(node(x, i, m)); // finished before the siblings are explored
      for (const t of subtrees) for (const rest of seq(rhs, idx + 1, m, j)) yield [t, ...rest];
    }
  }
  return take(node(g.start, 0, n));
}

// How many trees (counted up to cap). Loops are tried only when the loop-free search finds one tree.
export function countTrees(g, w, cap = 2) {
  const plain = parseTrees(g, w, { limit: cap });
  if (plain.length !== 1 || cap < 2) return plain.length;
  return parseTrees(g, w, { limit: 2, repeat: 2, budget: 20000 }).length;
}
export function twoTrees(g, w) {
  const plain = parseTrees(g, w, { limit: 2 });
  return plain.length === 1 ? parseTrees(g, w, { limit: 2, repeat: 2, budget: 20000 }) : plain;
}

// The tree to show for w: the smallest of the first few found (fewest productions), or null.
export function shortestTree(g, w) {
  const trees = parseTrees(g, w, { limit: 12 });
  return trees.length ? trees.reduce((best, t) => (treeSize(t) < treeSize(best) ? t : best)) : null;
}

// The leftmost (or rightmost) derivation that a tree describes: one entry per ⇒.
// steps[0] is the start symbol; steps[k] = { form, rule, node } after the k-th production.
export function derivation(tree, leftmost = true) {
  let frontier = [tree];
  const steps = [{ form: [tree.sym], rule: null, node: null }];
  for (;;) {
    let at = -1;
    if (leftmost) at = frontier.findIndex(nd => nd.children);
    else for (let i = frontier.length - 1; i >= 0 && at < 0; i--) if (frontier[i].children) at = i;
    if (at < 0) break;
    const nd = frontier[at];
    frontier = [...frontier.slice(0, at), ...nd.children.filter(c => c.sym !== EPS), ...frontier.slice(at + 1)];
    steps.push({ form: frontier.map(x => x.sym), rule: nd.rule, node: nd, at });
  }
  return steps;
}
export const formStr = form => rhsStr(form);
export const derivationText = steps => steps.map(s => formStr(s.form)).join(' ⇒ ');
export const treeYield = tree => (tree.children ? tree.children.map(treeYield).join('') : tree.sym === EPS ? '' : tree.sym);
export const treeSize = tree => 1 + (tree.children ? tree.children.reduce((s, c) => s + treeSize(c), 0) : 0);

// The tree as the renderer wants it (plan §4: steps[].extra.tree). `expanded` = the variable
// nodes whose production has been applied so far; the rest are still waiting (dashed).
export function treeForView(tree, expanded = null, fresh = null) {
  const walk = (nd, parentFresh) => {
    if (!nd.children) return { label: nd.sym, kind: nd.sym === EPS ? 'eps' : 'term', fresh: parentFresh };
    if (expanded && !expanded.has(nd)) return { label: nd.sym, kind: 'var', pending: true, fresh: parentFresh };
    return { label: nd.sym, kind: 'var', fresh: parentFresh, active: nd === fresh, children: nd.children.map(c => walk(c, nd === fresh)) };
  };
  return walk(tree, false);
}

// ---------- right-linear grammar → NFA (S17, Theorem 1 read backwards) ----------
// Each variable is a state ("what may still be produced"), A → aB is an arrow, A → a goes to
// the accepting END state, A → ε makes A accepting. Returns the tutor's machine shape.
export function rightLinearToNfa(g) {
  const END = freshName(g.variables, 'END');
  const states = [...g.variables];
  const final = [];
  const delta = {};
  const edge = (from, a, to) => {
    delta[from] = delta[from] || {};
    (delta[from][a] = delta[from][a] || []).includes(to) || delta[from][a].push(to);
  };
  const add = s => states.includes(s) || states.push(s);
  let usesEnd = false;
  g.rules.forEach(r => {
    const hasVar = r.rhs.length && isVar(g, r.rhs[r.rhs.length - 1]);
    const word = hasVar ? r.rhs.slice(0, -1) : r.rhs;
    const target = hasVar ? r.rhs[r.rhs.length - 1] : null;
    if (!word.length) {
      if (target) edge(r.lhs, EPS, target);
      else final.includes(r.lhs) || final.push(r.lhs);
      return;
    }
    let cur = r.lhs;
    word.forEach((a, i) => {
      const last = i === word.length - 1;
      const rest = [...word.slice(i + 1), ...(target ? [target] : [])].join('');
      const to = last ? target || END : `[${rest}]`; // an in-between state remembers what is still owed
      if (last && !target) usesEnd = true;
      add(to);
      edge(cur, a, to);
      cur = to;
    });
  });
  if (usesEnd) final.push(END);
  const alphabet = [...g.terminals, ...(states.some(q => delta[q]?.[EPS]) ? [EPS] : [])];
  states.forEach(q => {
    delta[q] = delta[q] || {};
    alphabet.forEach(a => (delta[q][a] = delta[q][a] || []));
  });
  return { states, alphabet, start: g.start, final, delta };
}
