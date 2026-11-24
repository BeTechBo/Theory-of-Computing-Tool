// S18 · Simplifying a context-free grammar, in the course's fixed order:
//   1a non-generating → 1b unreachable → 2 ε-productions → 3 unit productions → 4 useless again.
// Every step runs on the output of the step before it and writes the whole grammar out again,
// even when nothing changes ("a step that changes nothing is not a step you may skip").

import { tupleStr, grammarLines, setStr } from '../grammar.js';
import { grammarDiff, grammarTable, oneLine, variableFacts, defaultTests, languageLine, languageCheck, uselessLines, epsilonLines, unitLines, propertyLine } from './grammarCommon.js';

export function solveSimplify(g0, notes = {}) {
  const steps = [];
  const push = (title, explain, lines, before, after, quiz = null) =>
    steps.push({ title, explain, lines, highlight: [], extra: { diff: grammarDiff(before, after) }, ...(quiz ? { quiz } : {}) });

  steps.push({
    title: 'The grammar we start from',
    explain:
      'Simplifying removes everything the grammar does not need, in a fixed order: 1a non-generating variables, 1b unreachable symbols, 2 ε-productions, 3 unit productions, 4 useless symbols again. ' +
      'Each step works on the output of the step before it, never on the original.',
    lines: [tupleStr(g0), ...grammarLines(g0).map(l => `P: ${l}`), `${g0.rules.length} productions, ${g0.variables.length} variables`],
    table: grammarTable(g0),
    highlight: [],
    extra: {}
  });

  // ---------- Step 1: useless symbols ----------
  const s1 = uselessLines(g0);
  const genLines = s1.lines.filter(l => /generating/.test(l));
  const reachLines = s1.lines.filter(l => !/generating/.test(l));
  push(
    'Step 1a · Variables that generate nothing',
    'Work bottom-up: a variable is generating if one of its productions has only terminals and generating variables on the right. ε counts as a terminal string, so A → ε makes A generating.',
    genLines,
    g0,
    s1.afterGen,
    {
        question: 'Step 1a: which variables can never produce a terminal string?',
        answer: s1.nonGenerating.length ? s1.nonGenerating.join(', ') : 'none',
        options: [...new Set([s1.nonGenerating.length ? s1.nonGenerating.join(', ') : 'none', 'none', g0.variables[g0.variables.length - 1], g0.variables.slice(1, 3).join(', ') || g0.start])].filter(Boolean),
        why: s1.nonGenerating.length ? `${s1.nonGenerating.join(', ')} never ${s1.nonGenerating.length === 1 ? 'reaches' : 'reach'} a right-hand side made of terminals and generating variables only.` : 'Every variable reaches a terminal string, so nothing is removed. The check still has to be written.'
    }
  );
  push(
    `Step 1b · Symbols unreachable from ${g0.start}`,
    `Work top-down from ${g0.start}: a symbol is reachable if it appears on the right of a production of a reachable variable. 1a must come first, because deleting a non-generating variable can cut the only path to another symbol.`,
    reachLines,
    s1.afterGen,
    s1.grammar
  );

  // ---------- Step 2: ε-productions ----------
  const s2 = epsilonLines(s1.grammar);
  push(
    'Step 2 · Remove the ε-productions',
    'Find the nullable variables (those that can derive ε). Then rewrite every production with each nullable symbol present or absent, in every combination except "all absent", and delete the ε-productions.',
    s2.lines,
    s1.grammar,
    s2.grammar,
    s2.nullable.length
      ? {
            question: 'Step 2: which variables are nullable?',
            answer: setStr(s2.nullable),
            options: [...new Set([setStr(s2.nullable), setStr(s2.nullable.slice(0, 1)), setStr(s1.grammar.variables), setStr(s1.grammar.variables.filter(A => !s2.nullable.includes(A)).slice(0, 2))])],
            why: 'A variable is nullable if it has A → ε, or a production whose right-hand side is made of nullable variables only. Follow the chains to the end.'
        }
      : null
  );

  // ---------- Step 3: unit productions ----------
  const s3 = unitLines(s2.grammar, s2.madeUnits);
  push(
    'Step 3 · Remove the unit productions',
    'Re-read the CURRENT grammar for productions A → B (step 2 may have created some). Follow every chain to its end: if A ⇒ … ⇒ B by unit productions, A receives all of B\'s non-unit productions.',
    s3.lines,
    s2.grammar,
    s3.grammar
  );

  // ---------- Step 4: useless again ----------
  const s4 = uselessLines(s3.grammar);
  push(
    'Step 4 · Useless symbols again',
    'Steps 2 and 3 can orphan symbols: deleting a unit production may remove the only arrow into a variable. So run 1a and 1b once more on the current grammar.',
    s4.lines,
    s3.grammar,
    s4.grammar
  );
  const final = s4.grammar;

  // ---------- the check ----------
  const lang = languageCheck(g0, final, { minusEps: s2.epsInLanguage, what: 'The simplified grammar' });
  const props = propertyLine(final);
  steps.push({
    title: 'Check: same language, smaller grammar',
    explain: 'Finish by writing the final grammar in full, naming the three properties it now has, and checking the language on short strings. It catches the commonest slip: dropping a production that was doing real work.',
    lines: [
      `before: ${oneLine(g0)}`,
      `after:  ${oneLine(final)}`,
      tupleStr(final, "G′"),
      props.line,
      `productions: ${g0.rules.length} → ${final.rules.length}   ·   variables: ${g0.variables.length} → ${final.variables.length}`,
      lang.line
    ],
    table: grammarTable(final),
    highlight: [],
    extra: { diff: grammarDiff(g0, final), grammar: final }
  });

  const checks = [{ ok: lang.ok, text: lang.text }];
  if (!props.ok) checks.push({ ok: false, text: `The result is not fully simplified: ${props.line}.` });

  const nothing = !s1.changed && !s2.changed && !s3.changed && !s4.changed;
  return {
    grammar: final,
    checks,
    solution: {
      technique: 'simplification',
      session: 'S18',
      input_summary: `CFG with ${g0.rules.length} productions over ${setStr(g0.terminals)}, start ${g0.start}`,
      facts: variableFacts(g0, notes),
      facts_title: 'What each variable generates',
      formal: tupleStr(g0),
      steps,
      tests: defaultTests(final),
      test_labels: ['generated', 'not generated'],
      language: languageLine(final, notes) + (s2.epsInLanguage ? '  (ε ∈ L(G) was removed on purpose: the simplified grammar generates L(G) − {ε}.)' : ''),
      conclusion: nothing
        ? 'The grammar was already simplified: all four steps were checked and none changed anything.'
        : `Simplified: ${g0.rules.length} → ${final.rules.length} productions and ${g0.variables.length} → ${final.variables.length} variables, with no useless symbols, no ε-productions and no unit productions. ${lang.ok ? `The language is unchanged${s2.epsInLanguage ? ' apart from ε' : ''} (checked up to length ${lang.N}).` : ''}`
    }
  };
}
