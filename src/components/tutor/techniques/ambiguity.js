// S18 · Ambiguity: find the SHORTEST string with two different derivation trees (two
// derivations of one tree do not count), draw both, then repair the grammar.
// Repairs known to code: one variable per precedence level (E → E + T | T, T → T × F | F, …),
// or dropping a redundant production. Every repair is checked: same language, one tree per string.
// There is no general algorithm (ambiguity is undecidable), so anything else is left open.

import { isVar, rhsStr, ruleStr, setStr, tupleStr, grammarLines, members, affordableLength, countTrees, twoTrees, shortestTree, derivation, derivationText, treeForView, treeYield, sameLanguage, sameRule, allStrings, derives } from '../grammar.js';
import { variableFacts, languageLine, show, grammarTable, grammarDiff } from './grammarCommon.js';

const PRECEDENCE = { '+': 1, '-': 1, '|': 1, '∪': 1, '*': 2, '×': 2, '·': 2, '/': 2, '.': 2, '^': 3 };

// The grouping a tree gives its string, read off the root: a + (a × a).
const grouping = tree => (tree.children || []).map(c => (c.children && treeYield(c).length > 1 ? `(${treeYield(c)})` : treeYield(c))).join('');

// Is every string of L(G) up to the bound derived by exactly one tree?
function unambiguousUpTo(g, N) {
  return members(g, N).find(w => countTrees(g, w, 2) > 1);
}

// E → E op E | atoms  ⇒  one variable per precedence level.
function precedenceRepair(g) {
  if (g.variables.length !== 1) return null;
  const V = g.start;
  const binary = g.rules.filter(r => r.rhs.length === 3 && r.rhs[0] === V && r.rhs[2] === V && !isVar(g, r.rhs[1]));
  const atoms = g.rules.filter(r => !binary.includes(r));
  if (!binary.length || !atoms.length || atoms.some(r => !r.rhs.length || r.rhs[0] === V || r.rhs[r.rhs.length - 1] === V)) return null;
  const ops = binary.map(r => r.rhs[1]);
  const levels = [...new Set(ops.map(o => PRECEDENCE[o] ?? 0))].sort((a, b) => a - b).map(l => ops.filter(o => (PRECEDENCE[o] ?? 0) === l));
  const names = [V, ...['T', 'F', 'P', 'Q', 'R', 'E'].filter(n => n !== V)].slice(0, levels.length + 1);
  const rules = [];
  levels.forEach((lv, i) => {
    lv.forEach(op => rules.push({ lhs: names[i], rhs: [names[i], op, names[i + 1]] }));
    rules.push({ lhs: names[i], rhs: [names[i + 1]] });
  });
  atoms.forEach(r => rules.push({ lhs: names[levels.length], rhs: r.rhs }));
  return {
    grammar: { variables: names, terminals: g.terminals, start: V, rules },
    kind: 'precedence',
    lines: [
      `operators, loosest first: ${levels.map(lv => lv.join(' ')).join('   <   ')}${levels.length > 1 ? '   (the usual precedence; swap the levels to swap it)' : ''}`,
      ...levels.map((lv, i) => `level ${i + 1}: ${names[i]} → ${lv.map(op => `${names[i]}${op}${names[i + 1]}`).join(' | ')} | ${names[i + 1]}     (${lv.join(', ')} group to the left; anything tighter sits below, in ${names[i + 1]})`),
      `atoms: ${names[levels.length]} → ${atoms.map(r => rhsStr(r.rhs)).join(' | ')}`
    ],
    names
  };
}

// Dropping one of the two competing productions, when the language survives.
function dropRepair(g, r1, r2, N) {
  for (const r of [r2, r1]) {
    const smaller = { ...g, rules: g.rules.filter(x => !sameRule(x, r)) };
    if (sameLanguage(g, smaller).ok && unambiguousUpTo(smaller, N) === undefined) {
      return { grammar: smaller, kind: 'drop', lines: [`${ruleStr(r1)} and ${ruleStr(r2)} compete: nothing ever forces the choice between them`, `delete ${ruleStr(r)}: every string it helped to build can still be built without it`] };
    }
  }
  return null;
}

export function solveAmbiguity(g, notes = {}, proposal = null) {
  const steps = [];
  const checks = [];
  const N = Math.min(8, Math.max(3, affordableLength(g, 1500)));
  const all = members(g, N);

  steps.push({
    title: 'The grammar, and what "ambiguous" means',
    explain: 'A grammar is ambiguous if some string has two DIFFERENT derivation trees (equivalently, two leftmost derivations). Two derivations of the same tree do not count: that is only leftmost versus rightmost.',
    lines: [tupleStr(g), ...grammarLines(g).map(l => `P: ${l}`), 'plan: list the strings of L(G) from the shortest, count the trees of each, stop at the first string with two'],
    table: grammarTable(g),
    highlight: [],
    extra: {}
  });

  // ---------- the search ----------
  const first = all.find(w => countTrees(g, w, 2) > 1);
  // Several shortest witnesses? Show the one that uses the most different symbols (a+a×a shows precedence, a+a+a does not).
  const shortest = first === undefined ? [] : all.filter(w => w.length === first.length && countTrees(g, w, 2) > 1);
  const witness = shortest.reduce((best, w) => (new Set(w).size > new Set(best).size ? w : best), first);
  const shorter = witness === undefined ? all : all.filter(w => w.length < witness.length);
  const listed = [...shorter.slice(-8), ...(witness === undefined ? [] : [witness])];
  const counts = listed.map(w => [w, countTrees(g, w, 30)]);
  const more = shortest.filter(w => w !== witness).slice(0, 3);
  steps.push({
    title: witness === undefined ? `Search: no string up to length ${N} has two trees` : `Search: "${show(witness)}" is the shortest string with two trees`,
    explain: 'Count derivation trees, not derivations: for each string, every way of choosing productions and splitting the string is tried.',
    lines: [
      ...counts.map(([w, c]) => `${show(w)}  (length ${w.length}): ${c >= 30 ? '30 or more' : c} ${c === 1 ? 'tree' : 'trees'}${w === witness ? '   ← first string with more than one' : ''}`),
      ...(shorter.length > 8 ? ['(the shorter strings not listed all have exactly 1 tree)'] : []),
      ...(more.length ? [`other strings of length ${witness.length} with two trees: ${more.map(show).join(', ')}`] : []),
      ...(witness === undefined ? [`every one of the ${all.length} strings of L(G) of length ≤ ${N} has exactly one tree`] : [])
    ],
    table: [['string', 'length', 'trees'], ...counts.map(([w, c]) => [show(w), String(w.length), c >= 30 ? '30+' : String(c)])],
    highlight_cells: witness === undefined ? [] : [[counts.length, 0], [counts.length, 2]],
    highlight: [],
    quiz:
      witness === undefined
        ? undefined
        : { question: 'How long is the shortest string with two derivation trees?', answer: String(witness.length), options: [...new Set([witness.length - 2, witness.length - 1, witness.length, witness.length + 2].filter(x => x > 0).map(String))], why: `Every shorter string has exactly one tree; ${show(witness)} has two.` },
    extra: {}
  });

  let repaired = null;
  if (witness !== undefined) {
    const [t1, t2] = twoTrees(g, witness);
    const d1 = derivation(t1);
    const d2 = derivation(t2);
    const at = d1.findIndex((s, k) => k > 0 && (!d2[k] || !sameRule(s.rule, d2[k].rule)));
    const g1 = grouping(t1);
    const g2 = grouping(t2);
    steps.push({
      title: `Two trees for "${show(witness)}"`,
      explain: 'Each tree has exactly one leftmost derivation, so two different leftmost derivations prove there are two different trees.',
      lines: [
        `tree 1, leftmost: ${derivationText(d1)}`,
        `tree 2, leftmost: ${derivationText(d2)}`,
        `they part at step ${at}: tree 1 uses ${ruleStr(d1[at].rule)}, tree 2 uses ${d2[at] ? ruleStr(d2[at].rule) : 'nothing'}`,
        ...(g1 !== g2 ? [`so the same string is grouped two ways: ${g1}  versus  ${g2}`] : [`the yield is the same, ${show(witness)}, but the structure is not`])
      ],
      highlight: [],
      extra: {
        trees: [
          { title: `Tree 1${g1 !== g2 ? `: ${g1}` : ''}`, tree: treeForView(t1) },
          { title: `Tree 2${g1 !== g2 ? `: ${g2}` : ''}`, tree: treeForView(t2) }
        ],
        tree_caption: `both trees have the yield ${show(witness)}`
      }
    });

    // ---------- the repair ----------
    const candidate =
      (proposal && { grammar: proposal, kind: 'proposal', lines: ['a repair proposed by the AI helper; the checks below are done by code'] }) || precedenceRepair(g) || dropRepair(g, d1[at].rule, d2[at]?.rule || d1[at].rule, N);
    if (candidate) {
      const same = sameLanguage(g, candidate.grammar);
      const stillAmb = unambiguousUpTo(candidate.grammar, Math.min(N, same.N));
      const ok = same.ok && stillAmb === undefined;
      const tree = shortestTree(candidate.grammar, witness);
      checks.push(
        ok
          ? { ok: true, text: `The repaired grammar generates the same language and gives exactly one tree to every string of length ≤ ${Math.min(N, same.N)}.` }
          : { ok: false, text: same.ok ? `The repaired grammar is still ambiguous: "${show(stillAmb)}" has two trees.` : `The repaired grammar changes the language: "${show(same.onlyFirst ?? same.onlySecond)}" is ${same.onlyFirst !== undefined ? 'lost' : 'new'}.` }
      );
      if (ok) repaired = candidate.grammar;
      steps.push({
        title: candidate.kind === 'precedence' ? 'Repair: one variable per precedence level' : candidate.kind === 'drop' ? 'Repair: remove the competing production' : 'Repair: an unambiguous grammar',
        explain:
          candidate.kind === 'precedence'
            ? 'Give each precedence level its own variable, nested so that the tighter operator sits deeper in the tree. The left recursion (E → E + T) makes each operator group to the left, so only one tree is left.'
            : 'Removing ambiguity means deciding the structure the grammar left open. There is no algorithm for it in general, so a repair always has to be checked.',
        lines: [
          ...candidate.lines,
          ...grammarLines(candidate.grammar).map(l => `P′: ${l}`),
          same.ok ? `same language: compared on every string of length ≤ ${same.N} ✓` : `✗ the language changed`,
          stillAmb === undefined ? `one tree per string: checked for every string of length ≤ ${Math.min(N, same.N)} ✓` : `✗ ${show(stillAmb)} still has two trees`,
          ...(tree ? [`${show(witness)} now has ONE tree: ${derivationText(derivation(tree))}`] : [])
        ],
        table: grammarTable(candidate.grammar),
        highlight: [],
        extra: { ...(tree ? { tree: treeForView(tree), tree_caption: `the only tree for ${show(witness)}${candidate.kind === 'precedence' ? `: ${grouping(tree)}` : ''}` } : {}), diff: grammarDiff(g, candidate.grammar), grammar: candidate.grammar }
      });
    } else {
      steps.push({
        title: 'Can it be repaired?',
        explain: 'There is no procedure that removes ambiguity, and no algorithm that even decides whether a grammar is ambiguous. You have to see which structural choice the grammar leaves open and add a variable that settles it.',
        lines: [
          `the open choice: ${ruleStr(d1[at].rule)}  versus  ${d2[at] ? ruleStr(d2[at].rule) : '…'}  at the same point of the derivation`,
          'usual cures: one variable per precedence level; make a list grow on one side only (A → aA, never also A → Aa); give each alternative of a union its own start',
          'if EVERY grammar for the language is ambiguous, the language is inherently ambiguous and no repair exists (the course example: { aⁿbⁿcᵐdᵐ } ∪ { aⁿbᵐcᵐdⁿ })'
        ],
        highlight: [],
        extra: {}
      });
    }
  }

  const tested = [...new Set([...(witness !== undefined ? [witness] : []), ...all.slice(0, 3)])];
  const outside = allStrings(g.terminals, Math.min(N, 4), 400).find(w => !derives(g, w));
  const tests = [
    ...tested.map(w => {
      const c = countTrees(g, w, 30);
      return { input: w, path: `${c >= 30 ? '30+' : c} ${c === 1 ? 'tree' : 'trees'}`, accepted: true };
    }),
    ...(outside !== undefined ? [{ input: outside, path: 'no tree at all', accepted: false }] : [])
  ];

  return {
    grammar: repaired || g,
    ambiguous: witness !== undefined,
    witness,
    checks,
    solution: {
      technique: 'ambiguity',
      session: 'S18',
      input_summary: `Grammar with ${g.rules.length} productions over ${setStr(g.terminals)}, start ${g.start}: is it ambiguous?`,
      facts: variableFacts(g, notes),
      facts_title: 'What each variable generates',
      formal: tupleStr(g),
      steps,
      tests,
      test_labels: ['in L(G)', 'not in L(G)'],
      language: languageLine(g, notes),
      conclusion:
        witness === undefined
          ? `No ambiguity found: every string of length ≤ ${N} has exactly one tree. That is strong evidence, not a proof (ambiguity is undecidable in general).`
          : `G is ambiguous: "${show(witness)}" (length ${witness.length}) is the shortest string with two derivation trees. ${repaired ? 'The repaired grammar generates the same language with one tree per string. ' : ''}Ambiguity is a property of the grammar, not of the language.`
    }
  };
}
