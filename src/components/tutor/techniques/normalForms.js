// S19 · Chomsky normal form (the five steps of the S19 relay) and Greibach normal form.
// CNF: 1 new start symbol → 2 ε-productions → 3 unit productions → 4a one variable per
// terminal → 4b break the long right-hand sides. The course uses Sipser's version
// (S0 → ε allowed, the start symbol on no right-hand side); pass { linz: true } to skip
// step 1 when ε ∉ L(G), as last year's examples do.

import {
  isVar, rhsStr, ruleStr, rulesOf, sameRule, setStr, tupleStr, grammarLines, withRules, freshName, dropDead, nullable, normalForms,
  removeNonGenerating, removeUnreachable, removeEpsilon, removeUnits, shortestTree, derivation, derivationText, members, affordableLength
} from '../grammar.js';
import { grammarDiff, grammarTable, oneLine, variableFacts, defaultTests, languageLine, languageCheck, epsilonLines, unitLines, show } from './grammarCommon.js';

const SYMBOL_NAMES = { '+': 'Cp', '*': 'Cx', '×': 'Cx', '(': 'Cl', ')': 'Cr', '[': 'Cl', ']': 'Cr', '-': 'Cm', '/': 'Cd', '&': 'Cn', '=': 'Ce', ',': 'Cc', '#': 'Ch', '$': 'Cs' };
const terminalVar = (t, taken) => freshName(taken, /^[a-z0-9]$/.test(t) ? `C${t}` : SYMBOL_NAMES[t] || 'Ck');
const whyNotCnf = (g, r) =>
  r.rhs.length === 0 ? 'an ε-production' : r.rhs.length === 1 ? 'a unit production' : r.rhs.length > 2 ? `${r.rhs.length} symbols on the right` : 'a terminal next to another symbol';

// A member of L(G) to demonstrate the "exactly 2n − 1 steps" / "exactly n steps" fact on.
function demoString(g) {
  const N = Math.min(6, Math.max(2, affordableLength(g, 2500)));
  const all = members(g, N).filter(w => w.length >= 1);
  return all.find(w => w.length >= 3) || all[all.length - 1];
}

export function solveCnf(g0, notes = {}, opts = {}) {
  const steps = [];
  const push = (title, explain, lines, before, after, quiz = null) =>
    steps.push({ title, explain, lines, highlight: [], extra: { diff: grammarDiff(before, after) }, ...(quiz ? { quiz } : {}) });

  const epsIn = nullable(g0).set.has(g0.start);
  const onRight = g0.rules.filter(r => r.rhs.includes(g0.start));
  const bad = g0.rules.filter(r => !normalForms(g0).cnfOk(r));
  steps.push({
    title: 'The grammar, and is ε in the language?',
    explain: 'Chomsky normal form allows only two shapes: A → BC (two variables) and A → a (one terminal). Before anything else, decide whether ε ∈ L(G): it settles which version of CNF you convert to.',
    lines: [
      tupleStr(g0),
      ...grammarLines(g0).map(l => `P: ${l}`),
      epsIn ? `${g0.start} is nullable, so ε ∈ L(G): ε has to come back at the very end, as a production of the start symbol only` : `${g0.start} is not nullable, so ε ∉ L(G)`,
      "this course uses Sipser's version: the start symbol may have → ε, and it may not appear on any right-hand side",
      bad.length ? `not yet in CNF (${bad.length} of ${g0.rules.length}): ${bad.slice(0, 6).map(r => `${ruleStr(r)} (${whyNotCnf(g0, r)})`).join(',  ')}${bad.length > 6 ? ', …' : ''}` : 'every production already has a CNF shape'
    ],
    table: grammarTable(g0),
    highlight: [],
    extra: {}
  });

  // ---------- Step 1: new start symbol ----------
  let g = g0;
  const skipStart = !onRight.length || (opts.linz && !epsIn);
  if (!skipStart) {
    const S0 = freshName(g0.variables, `${g0.start.replace(/[0-9₀-₉'′]+$/, '')}0`);
    g = { variables: [S0, ...g0.variables], terminals: g0.terminals, start: S0, rules: [{ lhs: S0, rhs: [g0.start] }, ...g0.rules] };
  }
  push(
    'Step 1 · A new start symbol?',
    'The start symbol must not appear on any right-hand side (so that ε, if it is in the language, can be produced by the start symbol and by nothing else). If it does appear, add S0 → S and make S0 the start.',
    skipStart
      ? onRight.length
        ? [`${g0.start} occurs on the right of ${onRight.map(ruleStr).join(', ')}`, `but ε ∉ L(G), so the plain (Linz) form is enough and step 1 is skipped. Say in your answer that you are using the Linz form`]
        : [`${g0.start} appears on no right-hand side, so no new start symbol is needed`]
      : [
          `${g0.start} occurs on the right of ${onRight.map(ruleStr).join(', ')}`,
          `add ${g.start} → ${g0.start} and make ${g.start} the start symbol`,
          ...(epsIn ? [] : [`(ε ∉ L(G), so the Linz form, which skips this step, is accepted too. Say which version you use.)`])
        ],
    g0,
    g,
    {
      question: `Step 1: does ${g0.start} need a new start symbol ${g0.start.replace(/[0-9]+$/, '')}0 above it?`,
      answer: skipStart ? 'no' : 'yes',
      options: ['yes', 'no'],
      why: onRight.length ? `${g0.start} appears on a right-hand side (${ruleStr(onRight[0])}), and Sipser's version forbids that.${skipStart ? ' Here the Linz form was asked for, so it is skipped.' : ''}` : `${g0.start} never appears on a right-hand side.`
    }
  );
  const afterStart = g;

  // ---------- Step 2: ε-productions ----------
  const s2 = epsilonLines(g);
  const dd = dropDead(s2.grammar);
  if (dd.dead.length) s2.lines.push(`${dd.dead.join(', ')} could only produce ε and now ${dd.dead.length === 1 ? 'has' : 'have'} no production left, so every right-hand side that still mentions ${dd.dead.length === 1 ? 'it' : 'them'} is deleted too`);
  if (s2.epsInLanguage) s2.lines.push(`remember: ${g.start} → ε goes back at the very end`);
  push('Step 2 · Remove the ε-productions', 'Exactly Session 18\'s step 2: find the nullable variables, write every combination with them present or absent (never all absent), delete the ε-productions.', s2.lines, g, dd.grammar);
  g = dd.grammar;

  // ---------- Step 3: unit productions ----------
  const s3 = unitLines(g, s2.madeUnits);
  push('Step 3 · Remove the unit productions', 'Exactly Session 18\'s step 3, on the CURRENT grammar: it includes the unit productions that steps 1 and 2 have just created.', s3.lines, g, s3.grammar);
  g = s3.grammar;

  // ---------- Step 4a: one variable per terminal ----------
  const inside = [...new Set(g.rules.filter(r => r.rhs.length >= 2).flatMap(r => r.rhs.filter(x => !isVar(g, x))))];
  const names = {};
  inside.forEach(t => (names[t] = terminalVar(t, [...g.variables, ...Object.values(names)])));
  const a4 = [];
  const g4a = {
    variables: [...g.variables, ...inside.map(t => names[t])],
    terminals: g.terminals,
    start: g.start,
    rules: [
      ...g.rules.map(r => {
        if (r.rhs.length < 2 || !r.rhs.some(x => names[x])) return r;
        const nr = { lhs: r.lhs, rhs: r.rhs.map(x => names[x] || x) };
        a4.push(`${ruleStr(r)} becomes ${ruleStr(nr)}`);
        return nr;
      }),
      ...inside.map(t => ({ lhs: names[t], rhs: [t] }))
    ]
  };
  const lone = g.rules.filter(r => r.rhs.length === 1);
  push(
    'Step 4a · One new variable per terminal',
    'In every right-hand side of length ≥ 2, replace each terminal a by a new variable Ca and add Ca → a. A terminal ANYWHERE in a long right-hand side is promoted, not only a leading one.',
    inside.length
      ? [
          `terminals sitting inside long right-hand sides: ${inside.join(', ')}`,
          ...inside.map(t => `add ${names[t]} → ${t}`),
          ...a4,
          ...(lone.length ? [`${lone.slice(0, 4).map(ruleStr).join(', ')}${lone.length > 4 ? ', …' : ''} keep their bare terminal: a right-hand side of length 1 is already in CNF`] : [])
        ]
      : ['no terminal sits inside a right-hand side of length ≥ 2, so nothing changes'],
    g,
    withRules(g4a, g4a.rules),
    lone.length && inside.length
      ? {
          question: `Step 4a: what happens to ${ruleStr(lone[0])}?`,
          answer: 'it stays as it is',
          options: ['it stays as it is', `${lone[0].lhs} → ${names[lone[0].rhs[0]] || `C${lone[0].rhs[0]}`}`],
          why: `A single terminal on the right is already a CNF production. Replacing it would create the unit production ${lone[0].lhs} → C${lone[0].rhs[0]}, which step 3 just removed.`
        }
      : null
  );
  g = withRules(g4a, g4a.rules);

  // ---------- Step 4b: break the long right-hand sides ----------
  const tails = new Map(); // "B2 B3" → D-variable
  const dRules = [];
  const b4 = [];
  let vars = [...g.variables];
  const dFor = tail => {
    const key = tail.join(' ');
    if (tails.has(key)) return { name: tails.get(key), reused: true };
    let n = tails.size + 1;
    while (vars.includes(`D${n}`)) n++;
    const name = `D${n}`;
    vars.push(name);
    tails.set(key, name);
    if (tail.length === 2) dRules.push({ lhs: name, rhs: tail });
    else dRules.push({ lhs: name, rhs: [tail[0], dFor(tail.slice(1)).name] });
    return { name, reused: false };
  };
  const long = g.rules.filter(r => r.rhs.length > 2);
  const broken = g.rules.map(r => {
    if (r.rhs.length <= 2) return r;
    const before = dRules.length;
    const d = dFor(r.rhs.slice(1));
    const nr = { lhs: r.lhs, rhs: [r.rhs[0], d.name] };
    const made = dRules.slice(before).map(ruleStr);
    b4.push(`${ruleStr(r)}  (${r.rhs.length} symbols)  ⇒  ${ruleStr(nr)}${made.length ? `,  ${made.join(',  ')}` : `   (reuses ${d.name}: the tail ${rhsStr(r.rhs.slice(1))} is the same)`}`);
    return nr;
  });
  const g4b = withRules({ variables: vars, terminals: g.terminals, start: g.start }, [...broken, ...dRules]);
  push(
    'Step 4b · Break the right-hand sides longer than two',
    'A → B1 B2 … Bm becomes A → B1 D1, D1 → B2 D2, …: a right-hand side of length m needs m − 2 new variables. Identical tails may share one variable.',
    long.length ? [...b4, `${tails.size} new ${tails.size === 1 ? 'variable' : 'variables'}: ${[...tails.values()].join(', ')}`] : ['every right-hand side already has length 1 or 2, so nothing changes'],
    g,
    g4b,
    long.length
      ? {
          question: `Step 4b: how many new variables does ${ruleStr(long[0])} need on its own?`,
          answer: String(long[0].rhs.length - 2),
          options: [...new Set([long[0].rhs.length - 2, long[0].rhs.length - 1, long[0].rhs.length].map(String))],
          why: `A right-hand side of length m needs m − 2 new variables: ${long[0].rhs.length} − 2 = ${long[0].rhs.length - 2}.`
        }
      : null
  );
  g = g4b;

  // ---------- the result ----------
  const before5 = g;
  if (s2.epsInLanguage) g = withRules(g, [{ lhs: g.start, rhs: [] }, ...g.rules]);
  const nf = normalForms(g);
  const linzForm = skipStart && onRight.length > 0;
  const shapeOk = linzForm ? g.rules.every(r => (r.rhs.length === 2 && r.rhs.every(x => isVar(g, x))) || (r.rhs.length === 1 && !isVar(g, r.rhs[0]))) : !nf.cnfBreak;
  const lang = languageCheck(g0, g, { what: 'The CNF grammar' });
  const w = demoString(g);
  const tree = w ? shortestTree(g, w) : null;
  const dv = tree ? derivation(tree) : null;
  const countOk = !dv || dv.length - 1 === 2 * w.length - 1;
  steps.push({
    title: 'The grammar in Chomsky normal form',
    explain: 'Write the final grammar out and run the checks: look at every production and ask whether it is two variables or one terminal. Anything else means the conversion is not finished.',
    lines: [
      ...(s2.epsInLanguage ? [`ε ∈ L(G), so ${g.start} → ε goes back now (the start symbol is on no right-hand side, so nothing else can use it)`] : []),
      ...grammarLines(g),
      `every production is A → BC or A → a${s2.epsInLanguage ? ` (or the single ${g.start} → ε)` : ''} ${shapeOk ? '✓' : '✗'}`,
      linzForm ? `Linz form: ε ∉ L(G), so ${g.start} may stay on right-hand sides` : `the start symbol ${g.start} appears on no right-hand side ${g.rules.some(r => r.rhs.includes(g.start)) ? '✗' : '✓'}`,
      `variables: ${g0.variables.length} → ${g.variables.length}   ·   productions: ${g0.rules.length} → ${g.rules.length}`,
      lang.line,
      ...(dv ? [`payoff: |${w}| = ${w.length}, so its derivation has exactly 2n − 1 = ${2 * w.length - 1} steps: ${derivationText(dv)}`] : [])
    ],
    table: grammarTable(g),
    highlight: [],
    extra: { diff: grammarDiff(g0, g), grammar: g }
  });
  if (s2.epsInLanguage) steps[steps.length - 1].extra.diff = grammarDiff(before5, g, 'compared with the grammar after step 4b');
  else steps[steps.length - 1].extra.diff = grammarDiff(g0, g, 'compared with the original grammar');

  const checks = [{ ok: lang.ok, text: lang.text }];
  if (!shapeOk) checks.push({ ok: false, text: `Not every production is in CNF: ${nf.cnfBreak ? ruleStr(nf.cnfBreak) : ''}.` });
  if (!countOk) checks.push({ ok: false, text: `The derivation of ${w} should take exactly ${2 * w.length - 1} steps in CNF, but took ${dv.length - 1}.` });

  return {
    grammar: g,
    checks,
    stages: { start: afterStart, eps: dd.grammar, unit: s3.grammar, terminals: withRules(g4a, g4a.rules), final: g },
    solution: {
      technique: 'cnf_gnf',
      session: 'S19',
      input_summary: `CFG with ${g0.rules.length} productions over ${setStr(g0.terminals)}, start ${g0.start} → Chomsky normal form`,
      facts: variableFacts(g0, notes),
      facts_title: 'What each variable generates',
      formal: tupleStr(g0),
      steps,
      tests: defaultTests(g),
      test_labels: ['generated', 'not generated'],
      language: languageLine(g0, notes),
      conclusion: `Chomsky normal form (${linzForm ? 'Linz form' : "Sipser's version"}): ${g.variables.length} variables and ${g.rules.length} productions, every one A → BC or A → a${s2.epsInLanguage ? ` plus ${g.start} → ε` : ''}. ${lang.ok ? `The language is unchanged (checked up to length ${lang.N}).` : ''} A string of length n now takes exactly 2n − 1 steps.`
    }
  };
}

// ---------- Greibach normal form ----------
// Every production A → aα (one terminal, then variables only). Method: clean the grammar,
// order the variables, make every Ai → Aj… point forward (j > i) by substitution, remove the
// left recursion this exposes (A → Aα | β  becomes  A → βA′ | β, A′ → αA′ | α), back-substitute.
const LIMIT = 90;
const tooBig = () => new Error('This grammar grows past 90 productions during the Greibach conversion, so I stopped. (The full GNF conversion is not examinable in this course; try a smaller grammar.)');

export function solveGnf(g0, notes = {}) {
  const steps = [];
  const push = (title, explain, lines, before, after) => steps.push({ title, explain, lines, highlight: [], extra: { diff: grammarDiff(before, after) } });

  const nf0 = normalForms(g0);
  const verdict = r => (nf0.gnfOk(r) ? '✓ a terminal, then variables only' : r.rhs.length === 0 ? '✗ ε-production' : isVar(g0, r.rhs[0]) ? '✗ starts with a variable' : '✗ a terminal after the first symbol');
  steps.push({
    title: 'The grammar, and what Greibach normal form asks for',
    explain: 'In Greibach normal form every production is A → aα: exactly one terminal first, then variables only. Each derivation step then emits one terminal, so a string of length n takes exactly n steps.',
    lines: [tupleStr(g0), ...g0.rules.map(r => `${ruleStr(r)}   ${verdict(r)}`), nf0.gnfBreak ? `not in GNF yet: ${ruleStr(nf0.gnfBreak)} breaks the shape (one bad production is enough)` : 'every production already has the shape A → aα: the grammar IS in Greibach normal form'],
    table: grammarTable(g0),
    highlight: [],
    extra: {}
  });

  let g = g0;
  const epsIn = nullable(g0).set.has(g0.start);
  if (nf0.gnfBreak) {
    // ---------- clean up ----------
    const clean = removeUnreachable(removeNonGenerating(removeUnits(removeEpsilon(removeUnreachable(removeNonGenerating(g0).grammar).grammar).grammar).grammar).grammar).grammar;
    const lines = [];
    const epsRules = g0.rules.filter(r => !r.rhs.length);
    const unitRules = g0.rules.filter(r => r.rhs.length === 1 && isVar(g0, r.rhs[0]));
    lines.push(epsRules.length ? `ε-productions removed (Session 18, step 2): ${epsRules.map(ruleStr).join(', ')}` : 'no ε-productions ✓');
    lines.push(unitRules.length ? `unit productions removed (Session 18, step 3): ${unitRules.map(ruleStr).join(', ')}` : 'no unit productions ✓');
    const lostVars = g0.variables.filter(A => !clean.variables.includes(A));
    if (lostVars.length) lines.push(`useless variables removed: ${lostVars.join(', ')}`);
    if (epsIn) lines.push(`ε ∈ L(G), and no GNF grammar can produce ε: the result generates L(G) − {ε}`);
    // terminals that are not in first position get their own variable (CNF step 4a)
    const later = [...new Set(clean.rules.flatMap(r => r.rhs.slice(1).filter(x => !isVar(clean, x))))];
    const names = {};
    later.forEach(t => (names[t] = terminalVar(t, [...clean.variables, ...Object.values(names)])));
    const promoted = withRules({ variables: [...clean.variables, ...later.map(t => names[t])], terminals: clean.terminals, start: clean.start }, [
      ...clean.rules.map(r => ({ lhs: r.lhs, rhs: r.rhs.map((x, i) => (i > 0 && names[x] ? names[x] : x)) })),
      ...later.map(t => ({ lhs: names[t], rhs: [t] }))
    ]);
    lines.push(later.length ? `terminals after the first position get a variable (CNF step 4a): ${later.map(t => `${names[t]} → ${t}`).join(', ')}` : 'no terminal sits after the first position ✓');
    push('Clean up first', 'The method needs a grammar with no ε-productions, no unit productions and no useless symbols, and with terminals only in first position. (CNF\'s splitting step 4b is not needed for GNF.)', lines, g0, promoted);
    g = promoted;
    if (!g.rules.length) throw new Error('After the clean-up the grammar has no productions left (L(G) is empty or {ε}), so there is nothing to put in Greibach normal form.');

    // ---------- order + forward pass ----------
    const order = [...g.variables];
    const idx = A => order.indexOf(A);
    let rules = g.rules.map(r => ({ ...r }));
    const primes = [];
    const snapshot = () => withRules({ variables: [...order, ...primes], terminals: g.terminals, start: g.start }, rules);
    let prev = snapshot();
    steps.push({
      title: 'Order the variables',
      explain: 'Number the variables. The goal of the next pass: every production Ai → Aj… must point FORWARD (j > i). Then the last variable can only start with a terminal, and we can substitute backwards.',
      lines: [order.map((A, i) => `A${i + 1} = ${A}`).join('   '), ...order.map(A => rulesOf(prev, A).filter(r => isVar(prev, r.rhs[0]) && idx(r.rhs[0]) <= idx(A)).map(r => `${ruleStr(r)} points ${r.rhs[0] === A ? 'at itself (left recursion)' : 'backward'}`)).flat()].filter(Boolean),
      table: grammarTable(prev),
      highlight: [],
      extra: {}
    });
    if (steps[steps.length - 1].lines.length === 1) steps[steps.length - 1].lines.push('every production already points forward or starts with a terminal');

    order.forEach(A => {
      const lines2 = [];
      // substitute until no production of A starts with an earlier variable
      for (let guard = 0; guard < 200; guard++) {
        const r = rules.find(x => x.lhs === A && isVar(g, x.rhs[0]) && idx(x.rhs[0]) < idx(A) && idx(x.rhs[0]) >= 0);
        if (!r) break;
        const B = r.rhs[0];
        const repl = rules.filter(x => x.lhs === B).map(x => ({ lhs: A, rhs: [...x.rhs, ...r.rhs.slice(1)] }));
        lines2.push(`${ruleStr(r)}: ${B} comes before ${A}, so substitute ${B}'s productions  →  ${A} → ${repl.map(x => rhsStr(x.rhs)).join(' | ')}`);
        rules = rules.flatMap(x => (x === r ? repl : [x])).filter((x, i, arr) => arr.findIndex(o => sameRule(o, x)) === i);
        if (rules.length > LIMIT) throw tooBig();
      }
      // immediate left recursion
      const rec = rules.filter(x => x.lhs === A && x.rhs[0] === A);
      if (rec.length) {
        const rest = rules.filter(x => x.lhs === A && x.rhs[0] !== A);
        const P = freshName([...order, ...primes, ...g.variables], `${A}′`);
        primes.push(P);
        lines2.push(`left recursion: ${rec.map(ruleStr).join(', ')}   (α = ${rec.map(x => rhsStr(x.rhs.slice(1))).join(', ')};  β = ${rest.map(x => rhsStr(x.rhs)).join(', ') || 'none'})`);
        const newA = rest.flatMap(x => [{ lhs: A, rhs: [...x.rhs, P] }, x]);
        const newP = rec.flatMap(x => [{ lhs: P, rhs: [...x.rhs.slice(1), P] }, { lhs: P, rhs: x.rhs.slice(1) }]);
        lines2.push(`A → Aα | β  becomes  A → βA′ | β  and  A′ → αA′ | α:`);
        lines2.push(`${A} → ${newA.map(x => rhsStr(x.rhs)).join(' | ') || '(nothing: no β to start from)'}`);
        lines2.push(`${P} → ${newP.map(x => rhsStr(x.rhs)).join(' | ')}`);
        rules = [...rules.filter(x => x.lhs !== A), ...newA, ...newP];
        if (rules.length > LIMIT) throw tooBig();
      }
      if (lines2.length) {
        const now = snapshot();
        push(`Forward pass: ${A}`, `Make every production of ${A} start with a terminal or a LATER variable. Substituting an earlier variable can expose left recursion (${A} → ${A}…), which a substitution can never remove: it needs a new variable.`, lines2, prev, now);
        prev = now;
      }
    });

    // ---------- back-substitution ----------
    const back = [];
    [...order].reverse().forEach(A => {
      for (let guard = 0; guard < 400; guard++) {
        const r = rules.find(x => x.lhs === A && isVar(g, x.rhs[0]) && order.includes(x.rhs[0]));
        if (!r) break;
        const B = r.rhs[0];
        const repl = rules.filter(x => x.lhs === B).map(x => ({ lhs: A, rhs: [...x.rhs, ...r.rhs.slice(1)] }));
        back.push(`${ruleStr(r)}: ${B}'s productions all start with a terminal now  →  ${A} → ${repl.map(x => rhsStr(x.rhs)).join(' | ')}`);
        rules = rules.flatMap(x => (x === r ? repl : [x])).filter((x, i, arr) => arr.findIndex(o => sameRule(o, x)) === i);
        if (rules.length > LIMIT) throw tooBig();
      }
    });
    primes.forEach(P => {
      for (let guard = 0; guard < 400; guard++) {
        const r = rules.find(x => x.lhs === P && (order.includes(x.rhs[0]) || primes.includes(x.rhs[0])));
        if (!r) break;
        const B = r.rhs[0];
        const repl = rules.filter(x => x.lhs === B).map(x => ({ lhs: P, rhs: [...x.rhs, ...r.rhs.slice(1)] }));
        back.push(`${ruleStr(r)}: substitute ${B}  →  ${P} → ${repl.map(x => rhsStr(x.rhs)).join(' | ')}`);
        rules = rules.flatMap(x => (x === r ? repl : [x])).filter((x, i, arr) => arr.findIndex(o => sameRule(o, x)) === i);
        if (rules.length > LIMIT) throw tooBig();
      }
    });
    let now = snapshot();
    const tidy = removeUnreachable(now);
    if (tidy.removed.length) back.push(`${tidy.removed.join(', ')} ${tidy.removed.length === 1 ? 'is' : 'are'} no longer reachable from ${g.start}, so ${tidy.removed.length === 1 ? 'it goes' : 'they go'} (Session 18, step 4)`);
    now = tidy.grammar;
    push('Back-substitution', 'Go through the variables from the last to the first: wherever a production still starts with a variable, replace that variable by its productions (which already start with a terminal). Finish with the new primed variables.', back.length ? back : ['nothing to substitute: every production already starts with a terminal'], prev, now);
    g = now;
  }

  const nf = normalForms(g);
  const lang = languageCheck(g0, g, { minusEps: epsIn && Boolean(nf0.gnfBreak), what: 'The GNF grammar' });
  const w = demoString(g);
  const tree = w ? shortestTree(g, w) : null;
  const dv = tree ? derivation(tree) : null;
  steps.push({
    title: 'The grammar in Greibach normal form',
    explain: 'Check every production against the shape A → aα, then the language. A grammar is in a normal form only if EVERY production satisfies the condition.',
    lines: [
      ...grammarLines(g),
      `every production is one terminal followed by variables only ${nf.gnfBreak ? `✗ (${ruleStr(nf.gnfBreak)})` : '✓'}`,
      `productions: ${g0.rules.length} → ${g.rules.length}`,
      lang.line,
      ...(dv ? [`payoff: |${w}| = ${w.length}, and its derivation has exactly n = ${dv.length - 1} steps, one terminal per step: ${derivationText(dv)}`] : [])
    ],
    table: grammarTable(g),
    highlight: [],
    extra: { diff: grammarDiff(g0, g, 'compared with the original grammar'), grammar: g }
  });

  const checks = [{ ok: lang.ok, text: lang.text }];
  if (nf.gnfBreak) checks.push({ ok: false, text: `Not every production is in GNF: ${ruleStr(nf.gnfBreak)}.` });
  if (dv && dv.length - 1 !== w.length) checks.push({ ok: false, text: `The derivation of ${w} should take exactly ${w.length} steps in GNF, but took ${dv.length - 1}.` });

  return {
    grammar: g,
    checks,
    solution: {
      technique: 'cnf_gnf',
      session: 'S19',
      input_summary: `CFG with ${g0.rules.length} productions over ${setStr(g0.terminals)}, start ${g0.start} → Greibach normal form`,
      facts: variableFacts(g0, notes),
      facts_title: 'What each variable generates',
      formal: tupleStr(g0),
      steps,
      tests: defaultTests(g),
      test_labels: ['generated', 'not generated'],
      language: languageLine(g0, notes) + (epsIn && nf0.gnfBreak ? '  (GNF cannot produce ε, so the result generates L(G) − {ε}.)' : ''),
      conclusion: nf0.gnfBreak
        ? `Greibach normal form: ${g.rules.length} productions, each one a terminal followed by variables. ${lang.ok ? `The language is unchanged${epsIn ? ' apart from ε' : ''} (checked up to length ${lang.N}).` : ''} A string of length n now takes exactly n steps.`
        : 'The grammar is already in Greibach normal form: every production is one terminal followed by variables only.'
    }
  };
}

// S19 practice Q3(b): for one grammar, say whether it is in CNF, GNF, both or neither.
export function formVerdict(g) {
  const nf = normalForms(g);
  return { cnf: !nf.cnfBreak, gnf: !nf.gnfBreak, cnfBreak: nf.cnfBreak, gnfBreak: nf.gnfBreak, text: !nf.cnfBreak && !nf.gnfBreak ? 'both' : !nf.cnfBreak ? 'CNF only' : !nf.gnfBreak ? 'GNF only' : 'neither', show };
}
