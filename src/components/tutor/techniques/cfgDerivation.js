// S17 · Grammars: G = (V, T, P, S), the Chomsky type read off the shape of the productions,
// what each variable generates, and derivations with the production named at every step
// ("it is where the marks are"). The derivation tree grows one production per step.
// Also: the machine that matches a right-linear grammar, and a DFA turned into a grammar
// (Theorem 1's five steps).

import {
  EPS, isVar, rhsStr, ruleStr, rulesOf, setStr, tupleStr, grammarLines, classify, derives, shortestTree, derivation, derivationText, formStr,
  treeForView, rightLinearToNfa, members, affordableLength, removeNonGenerating, removeUnreachable, parseGrammar
} from '../grammar.js';
import { machineToDot, accepts, stringsUpTo, setName, reachableStates, isDfa } from '../machine.js';
import { variableFacts, sampleStrings, testsFor, languageLine, show, grammarTable, grammarDiff } from './grammarCommon.js';

const SHAPE_WORDS = {
  terminal: 'terminals only (fits right- and left-linear)',
  unit: 'a single variable (fits right- and left-linear)',
  right: 'one variable, at the RIGHT end → right-linear',
  left: 'one variable, at the LEFT end → left-linear',
  middle: 'one variable, in the MIDDLE → linear only',
  cf: 'two or more variables → context-free only'
};

export function solveCfg(g, strings = [], notes = {}) {
  const steps = [];
  const checks = [];
  const bad = strings.flatMap(w => [...w].filter(ch => !g.terminals.includes(ch)).map(ch => ({ w, ch })));

  // ---------- the four-tuple ----------
  steps.push({
    title: 'The grammar G = (V, T, P, S)',
    explain: 'A grammar generates strings: start from S and rewrite until only terminals are left. Give all four parts: a list of productions alone is not a grammar.',
    lines: [tupleStr(g), `V = ${setStr(g.variables)}  (variables)`, `T = ${setStr(g.terminals)}  (terminals)`, `S = ${g.start}  (start symbol)`, `P has ${g.rules.length} productions: ${grammarLines(g).join('   ')}`, ...(g.notes || [])],
    table: [['#', 'production'], ...g.rules.map((r, i) => [`P${i + 1}`, ruleStr(r)])],
    highlight: [],
    extra: {}
  });

  // ---------- the type ----------
  const cls = classify(g);
  const typeLine =
    cls.chomsky === 3
      ? `Type 3 (${cls.type}): ${cls.why}. So L(G) is regular.`
      : `Type 2 (${cls.type === 'context-free' ? 'context-free' : 'linear, so context-free'}) and not Type 3: ${cls.why}.`;
  steps.push({
    title: 'What type of grammar is it?',
    explain: 'The type is decided by the SHAPE of the productions and nothing else. A Type 3 grammar must be ALL right-linear or ALL left-linear.',
    lines: [
      ...cls.shapes.map(s => `${ruleStr(s.rule)} : ${SHAPE_WORDS[s.shape]}`),
      typeLine,
      ...(cls.chomsky === 3 ? [] : ['careful: this is the type of the GRAMMAR. Whether the LANGUAGE is regular is a separate question (a Type 2 grammar can generate a regular language)'])
    ],
    highlight: [],
    quiz: {
      question: 'What is the most restrictive Chomsky type this grammar satisfies?',
      answer: cls.chomsky === 3 ? 'Type 3 (regular)' : 'Type 2 (context-free)',
      options: ['Type 3 (regular)', 'Type 2 (context-free)'],
      why: `${cls.why[0].toUpperCase()}${cls.why.slice(1)}.`
    },
    extra: {}
  });

  // ---------- right-linear: the matching machine ----------
  if (cls.type === 'right-linear') {
    const nfa = rightLinearToNfa(g);
    const pool = stringsUpTo(nfa.alphabet, Math.min(7, Math.max(3, affordableLength(g, 2500))));
    const diff = pool.find(w => accepts(nfa, w) !== derives(g, w));
    checks.push(diff === undefined ? { ok: true, text: `The grammar and its machine agree on all ${pool.length} strings of length ≤ ${pool[pool.length - 1].length}.` } : { ok: false, text: `The grammar and the machine built from it disagree on "${show(diff)}".` });
    steps.push({
      title: 'The machine behind a right-linear grammar',
      explain: 'Read Theorem 1 backwards: every variable is a state ("what may still be produced from here"), A → aB is an arrow A —a→ B, and a production with no variable lets the derivation stop, so it leads to an accepting state.',
      lines: [
        ...g.rules.map(r => {
          const last = r.rhs[r.rhs.length - 1];
          const hasVar = r.rhs.length > 0 && isVar(g, last);
          const word = rhsStr(hasVar ? r.rhs.slice(0, -1) : r.rhs);
          if (!r.rhs.length) return `${ruleStr(r)} : ${r.lhs} is an accepting state (the derivation may stop here)`;
          if (hasVar && r.rhs.length === 1) return `${ruleStr(r)} : an ε-arrow ${r.lhs} → ${last}`;
          return `${ruleStr(r)} : read ${word} from ${r.lhs} and ${hasVar ? `continue in ${last}` : 'stop in the accepting state END'}`;
        }),
        'a sentential form is "terminals read so far, then ONE variable": that variable is the current state, written down'
      ],
      graph: machineToDot(nfa),
      highlight: [g.start],
      extra: {}
    });
  }

  // ---------- facts ----------
  const facts = variableFacts(g, notes);
  steps.push({
    title: 'What each variable generates',
    explain: 'Before deriving anything, say what each variable stands for: the set of terminal strings it can turn into. These are the grammar\'s "facts", and the grammar is correct exactly when they are.',
    lines: facts.map(f => `${f.item}: ${f.meaning}`),
    table: [['variable', 'generates'], ...facts.map(f => [f.item, f.meaning])],
    highlight: [],
    extra: {}
  });

  // ---------- derivations ----------
  const sample = sampleStrings(g);
  // no string given: derive one member of the language, preferably of length ≥ 4
  const list = strings.length ? strings : sample.inL.slice(-1);
  let animated = false;
  list.forEach(w => {
    const badCh = bad.find(b => b.w === w);
    const tree = badCh ? null : shortestTree(g, w);
    if (!tree) {
      const same = sample.all.filter(x => x.length === w.length).slice(0, 4);
      steps.push({
        title: `"${show(w)}" is not in L(G)`,
        explain: 'A string is in L(G) only if some derivation tree has it as its yield. Every way of building one was tried, and none works.',
        lines: [
          badCh ? `${badCh.ch} is not a terminal of G: T = ${setStr(g.terminals)}` : `no derivation ${g.start} ⇒* ${show(w)} exists`,
          same.length ? `strings of length ${w.length} that ARE in L(G): ${same.map(show).join(', ')}` : `L(G) has no string of length ${w.length} at all`
        ],
        highlight: [],
        quiz: { question: `Before you look: is "${show(w)}" in L(G)?`, answer: 'no', options: ['yes', 'no'], why: badCh ? `${badCh.ch} is not a terminal of the grammar.` : 'No derivation tree has this yield.' },
        extra: {}
      });
      return;
    }
    const dv = derivation(tree);
    const n = dv.length - 1;
    const allLines = dv.map((s, k) => (k === 0 ? `${formStr(s.form)}` : `⇒ ${formStr(s.form)}        using ${ruleStr(s.rule)}`));
    const right = derivationText(derivation(tree, false));
    const closing = [`${n} ${n === 1 ? 'step' : 'steps'}, ${n} named ${n === 1 ? 'production' : 'productions'}: ${show(w)} ∈ L(G) ✓`, ...(right !== derivationText(dv) ? [`rightmost derivation of the SAME tree: ${right}`] : [])];
    if (!animated && n <= 10) {
      animated = true;
      const expanded = new Set();
      dv.slice(1).forEach((s, k) => {
        expanded.add(s.node);
        const prevForm = dv[k].form;
        const last = k === n - 1;
        steps.push({
          title: `Derive "${show(w)}" · step ${k + 1} of ${n}: ${ruleStr(s.rule)}`,
          explain: `The leftmost variable of ${formStr(prevForm)} is ${s.rule.lhs}. Replace it by ${rhsStr(s.rule.rhs)}${s.rule.rhs.length ? '' : ' (it disappears)'}. In the tree, ${s.rule.lhs} gets ${s.rule.rhs.length || 1} ${(s.rule.rhs.length || 1) === 1 ? 'child' : 'children'}, in the same left-to-right order.`,
          lines: [...allLines.slice(0, k + 2), ...(last ? closing : [])],
          highlight: [],
          quiz:
            rulesOf(g, s.rule.lhs).length > 1
              ? {
                  question: `${formStr(prevForm)}: which production of ${s.rule.lhs} comes next, to reach ${show(w)}?`,
                  answer: ruleStr(s.rule),
                  options: rulesOf(g, s.rule.lhs).slice(0, 4).map(ruleStr).concat(rulesOf(g, s.rule.lhs).slice(0, 4).some(r => r === s.rule) ? [] : [ruleStr(s.rule)]),
                  why: `It gives ${formStr(s.form)}, which can still become ${show(w)}.`
                }
              : undefined,
          extra: { tree: treeForView(tree, new Set(expanded), s.node), tree_caption: last ? `yield (leaves, left to right): ${show(w)}` : `sentential form: ${formStr(s.form)}` }
        });
      });
    } else {
      steps.push({
        title: `Derive "${show(w)}"`,
        explain: 'A leftmost derivation: at every step the leftmost variable is replaced, and the production used is named.',
        lines: [...allLines, ...closing],
        highlight: [],
        extra: { tree: treeForView(tree), tree_caption: `yield (leaves, left to right): ${show(w)}` }
      });
    }
  });

  const testStrings = [...new Set([...list, ...sample.inL.slice(0, 2), ...sample.outL])];
  const tests = testsFor(g, testStrings);
  const inL = tests.filter(t => t.accepted).map(t => show(t.input));
  const outL = tests.filter(t => !t.accepted).map(t => show(t.input));
  return {
    grammar: g,
    checks,
    solution: {
      technique: 'cfg',
      session: 'S17',
      input_summary: `Grammar with ${g.rules.length} productions over ${setStr(g.terminals)}, start ${g.start}`,
      facts,
      facts_title: 'What each variable generates',
      formal: tupleStr(g),
      steps,
      tests,
      test_labels: ['generated', 'not generated'],
      language: languageLine(g, notes),
      conclusion: `${cls.chomsky === 3 ? `A ${cls.type} (Type 3) grammar` : `A Type 2 (${cls.type}) grammar`}. In L(G): ${inL.join(', ') || 'none of the tests'}. Not in L(G): ${outL.join(', ') || 'none of the tests'}.`
    }
  };
}

// ---------- S17 "write a grammar for L": the AI proposes, code checks and lays it out ----------
// design = { description, grammar, facts: [{ item, meaning }], members: [...], non_members: [...] }
export function solveGrammarDesign(design) {
  const g = design.grammar;
  const membersIn = (design.members || []).map(String).map(w => (w === EPS ? '' : w));
  const membersOut = (design.non_members || []).map(String).map(w => (w === EPS ? '' : w));
  const under = membersIn.filter(w => !derives(g, w));
  const over = membersOut.filter(w => derives(g, w));
  const notes = { facts: design.facts?.length ? design.facts.filter(f => g.variables.includes(f.item)) : undefined, language: design.description };
  if (notes.facts && !notes.facts.length) delete notes.facts;
  const demo = membersIn.filter(w => derives(g, w)).sort((a, b) => (b.length >= 4) - (a.length >= 4) || a.length - b.length)[0];
  const out = solveCfg(g, demo !== undefined ? [demo] : [], notes);
  out.solution.steps.splice(1, 0, {
    title: 'Check the grammar against the language',
    explain: 'A grammar can be wrong in two ways: it OVER-generates (makes a string that should not be in L) or it UNDER-generates (misses a string that should be). Test both with short strings.',
    lines: [
      ...membersIn.map(w => (derives(g, w) ? `${show(w)} ∈ L, and the grammar derives it ✓` : `✗ under-generation: ${show(w)} should be in L, but the grammar cannot derive it`)),
      ...membersOut.map(w => (derives(g, w) ? `✗ over-generation: the grammar derives ${show(w)}, which should NOT be in L` : `${show(w)} ∉ L, and the grammar cannot derive it ✓`))
    ],
    highlight: [],
    extra: {}
  });
  if (under.length) out.checks.push({ ok: false, text: `Under-generation: the grammar cannot derive ${under.map(show).join(', ')}, which should be in the language.` });
  if (over.length) out.checks.push({ ok: false, text: `Over-generation: the grammar derives ${over.map(show).join(', ')}, which should not be in the language.` });
  if (!under.length && !over.length && membersIn.length + membersOut.length) out.checks.push({ ok: true, text: `The grammar agrees with the language on all ${membersIn.length + membersOut.length} sample strings.` });
  out.solution.tests = testsFor(g, [...new Set([...membersIn, ...membersOut])]).concat(membersOut.length ? [] : out.solution.tests.filter(t => !t.accepted));
  out.solution.input_summary = design.description || out.solution.input_summary;
  return out;
}

// ---------- S17 Theorem 1: a DFA (or NFA) turned into a right-linear grammar, five steps ----------
export function solveMachineToGrammar(m) {
  if (m.alphabet.includes(EPS)) throw new Error('This machine has ε-moves. Remove them first (ε-removal, S06), then I can turn it into a grammar.');
  const steps = [];
  const name = {};
  // States become variables: single capital letters stay; otherwise the start becomes S and the rest A, B, C, …
  if (m.states.every(q => /^[A-Z]$/.test(q))) m.states.forEach(q => (name[q] = q));
  else {
    const pool = 'ABCDEFGHIJKLMNOPQRTUVWXYZ'.split('');
    m.states.forEach(q => (name[q] = q === m.start ? 'S' : pool.shift() || `Q${m.states.indexOf(q)}`));
  }
  const renamed = m.states.some(q => name[q] !== q);
  steps.push({
    title: 'Step 1 · Every state becomes a variable',
    explain: 'The variable for a state q means "everything that can still be read, starting from q". The start state becomes the start symbol.',
    lines: [renamed ? m.states.map(q => `${q} ↦ ${name[q]}`).join('   ') : `V = ${setStr(m.states)}`, `start symbol: ${name[m.start]}`, `T = ${setStr(m.alphabet)}`],
    graph: machineToDot(m),
    highlight: [m.start],
    extra: {}
  });

  const edgeRules = [];
  const stopRules = [];
  const lines2 = [];
  const lines3 = [];
  m.states.forEach(q => m.alphabet.forEach(a => (m.delta[q][a] || []).forEach(p => {
    edgeRules.push({ lhs: name[q], rhs: [a, name[p]] });
    lines2.push(`δ(${q}, ${a}) = ${p}   gives   ${name[q]} → ${a}${name[p]}`);
    if (m.final.includes(p)) {
      stopRules.push({ lhs: name[q], rhs: [a] });
      lines3.push(`δ(${q}, ${a}) = ${p} and ${p} is accepting   →   also add ${name[q]} → ${a}`);
    }
  })));
  const mk = (rules, vars = m.states.map(q => name[q]), start = name[m.start]) => ({ variables: [start, ...vars.filter(v => v !== start)], terminals: [...m.alphabet], start, rules: [start, ...vars.filter(v => v !== start)].flatMap(A => rules.filter(r => r.lhs === A)) });
  const g2 = mk(edgeRules);
  steps.push({
    title: 'Step 2 · One production per arrow',
    explain: 'For every transition δ(q, a) = p add q → ap. Every production is a terminal followed by a variable, so the grammar is right-linear by construction.',
    lines: [...lines2, `${edgeRules.length} arrows, ${edgeRules.length} productions, no decisions taken`],
    table: grammarTable(g2),
    highlight: [],
    extra: {}
  });
  const g3 = mk([...edgeRules, ...stopRules]);
  steps.push({
    title: 'Step 3 · Arrows into an accepting state also stop',
    explain: 'Whenever the target of an arrow is accepting, the string may legitimately end there: ALSO add q → a. Without these, no derivation can ever get rid of its last variable and L(G) = ∅.',
    lines: lines3.length ? lines3 : ['no arrow leads into an accepting state'],
    highlight: [],
    quiz: { question: 'What does the grammar generate if step 3 is forgotten?', answer: 'nothing at all (∅)', options: ['nothing at all (∅)', 'the same language', 'only ε'], why: 'Every production would end in a variable, so no derivation could ever finish.' },
    extra: { diff: grammarDiff(g2, g3) }
  });
  let g4 = g3;
  const epsIn = m.final.includes(m.start);
  if (epsIn) {
    const S = ['S', 'S0', "S′"].find(v => !g3.variables.includes(v)) || 'Z';
    g4 = { variables: [S, ...g3.variables], terminals: g3.terminals, start: S, rules: [{ lhs: S, rhs: [g3.start] }, { lhs: S, rhs: [] }, ...g3.rules] };
  }
  steps.push({
    title: 'Step 4 · Is ε in the language?',
    explain: 'Only when the start state is accepting. Then add a FRESH start symbol with S → (old start) | ε. Writing ε directly on the old start variable would be wrong: it appears on right-hand sides and would delete itself mid-derivation.',
    lines: epsIn ? [`${m.start} is accepting, so ε ∈ L(M)`, `add the fresh start symbol ${g4.start} → ${g3.start} | ε`] : [`${m.start} is not accepting, so ε ∉ L(M): no fresh start symbol is needed`],
    highlight: [],
    extra: { diff: grammarDiff(g3, g4) }
  });
  const a = removeNonGenerating(g4);
  const b = removeUnreachable(a.grammar);
  const g5 = b.grammar;
  steps.push({
    title: 'Step 5 · Discard the useless variables',
    explain: 'A variable is useless if no terminal string can be derived from it (a dead state) or if the start symbol cannot reach it. Removing them does not change the language.',
    lines: [
      a.removed.length ? `${a.removed.join(', ')} can never reach a terminal string (every production leads back into ${a.removed.length === 1 ? 'itself' : 'them'}): useless` : 'every variable can reach a terminal string',
      b.removed.length ? `${b.removed.join(', ')} cannot be reached from ${g4.start}: useless` : `every remaining variable is reachable from ${g4.start}`,
      `productions: ${g4.rules.length} → ${g5.rules.length}`,
      ...grammarLines(g5)
    ],
    highlight: [],
    extra: { diff: grammarDiff(g4, g5), grammar: g5 }
  });

  // the check: a derivation beside a run
  const pool = stringsUpTo(m.alphabet, Math.min(7, Math.max(3, affordableLength(g5, 2500))));
  const diff = pool.find(w => accepts(m, w) !== derives(g5, w));
  const w = pool.find(x => x.length >= 3 && accepts(m, x)) || pool.find(x => x && accepts(m, x));
  const tree = w ? shortestTree(g5, w) : null;
  if (tree) {
    const dv = derivation(tree);
    steps.push({
      title: `Check: a derivation beside a run, on "${w}"`,
      explain: 'The two columns are the same object written twice: every accepting run is a derivation, and every derivation is an accepting run. That correspondence is the proof of Theorem 1.',
      lines: dv.map((s, k) => (k === 0 ? `${formStr(s.form)}` : `⇒ ${formStr(s.form)}        using ${ruleStr(s.rule)}`)),
      table: [['derivation in G', 'production', 'run of M'], ...dv.map((s, k) => [formStr(s.form), k ? ruleStr(s.rule) : '', k === 0 ? `in ${m.start}` : `read ${w[k - 1]}`])],
      graph: machineToDot(m),
      highlight: isDfa(m) ? reachableStates(m).filter(q => m.final.includes(q)) : [],
      extra: { tree: treeForView(tree), tree_caption: `yield: ${w}` }
    });
  }
  const checks = [diff === undefined ? { ok: true, text: `The machine and the grammar agree on all ${pool.length} strings of length ≤ ${pool[pool.length - 1].length}.` } : { ok: false, text: `The machine and the grammar disagree on "${show(diff)}".` }];
  const tests = testsFor(g5, [...new Set([...pool.filter(x => accepts(m, x)).slice(0, 3), ...pool.filter(x => !accepts(m, x)).slice(0, 2)])]);
  return {
    grammar: g5,
    checks,
    solution: {
      technique: 'cfg',
      session: 'S17',
      input_summary: `${isDfa(m) ? 'DFA' : 'NFA'} over ${setStr(m.alphabet)}, start ${m.start}, F = ${setName(m.final)} → right-linear grammar`,
      facts: g5.variables.map(A => ({ item: A, meaning: A === g4.start && epsIn ? 'the fresh start symbol (it only adds ε)' : `everything that can still be read from state ${Object.keys(name).find(q => name[q] === A) || A}` })),
      facts_title: 'What each variable generates',
      formal: tupleStr(g5),
      steps,
      tests,
      test_labels: ['generated', 'not generated'],
      language: languageLine(g5),
      conclusion: `A right-linear (Type 3) grammar with ${g5.rules.length} productions: states became variables, arrows became productions, and arrows into accepting states also stop.${a.removed.length + b.removed.length ? ` ${[...a.removed, ...b.removed].join(', ')} ${a.removed.length + b.removed.length === 1 ? 'was' : 'were'} useless and discarded.` : ''}`
    }
  };
}

export { parseGrammar, members };
