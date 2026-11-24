// Tests for Module 5 (S17–S21: grammars and pushdown automata).  Run:  npm run test:grammar
// Every expected value below is a model answer from the session slides (walkthroughs,
// activities and practice questions), so a failure means the tutor would mark a student wrong.

import { parseGrammar, grammarText, grammarLines, classify, countTrees, shortestTree, derivation, derivationText, members, derives, normalForms, ruleStr } from '../src/components/tutor/grammar.js';
import { parsePda, search, determinism, idStr, pdaAccepts } from '../src/components/tutor/pdaMachine.js';
import { parseTransitionTable } from '../src/components/tutor/machine.js';
import { validateContract } from '../src/components/tutor/checks.js';
import { solveCfg, solveGrammarDesign, solveMachineToGrammar } from '../src/components/tutor/techniques/cfgDerivation.js';
import { solveAmbiguity } from '../src/components/tutor/techniques/ambiguity.js';
import { solveSimplify } from '../src/components/tutor/techniques/simplify.js';
import { solveCnf, solveGnf, formVerdict } from '../src/components/tutor/techniques/normalForms.js';
import { solvePda } from '../src/components/tutor/techniques/pdaTrace.js';
import { solveCfgToPda } from '../src/components/tutor/techniques/cfgToPda.js';
import { GRAMMAR_PRESETS, PDA_PRESETS, presetGrammar, presetPda, grammarNotes, pdaNotes } from '../src/components/tutor/grammarPresets.js';
import { respondGrammar, grammarFromAi, stringsFromWords } from '../src/components/chat/grammarBrain.js';
import { respond, READY } from '../src/components/chat/brain.js';
import { FOLLOW_UPS, READY_ANSWERS } from '../src/components/chat/suggestions.js';

let passed = 0;
const failures = [];
const section = name => console.log(`\n${name}`);
function check(name, got, want) {
  const ok = want === undefined ? Boolean(got) : JSON.stringify(got) === JSON.stringify(want);
  if (ok) passed++;
  else failures.push(name);
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`}`);
}
const G = id => parseGrammar(presetGrammar(id).text);
const P = id => parsePda(presetPda(id).text).pda;
const norm = s => s.replace(/\s+/g, ' ').trim();
const same = (g, text) => norm(grammarText(g)) === norm(text);
const all = (alphabet, n) => {
  let layer = [''];
  const out = [''];
  for (let i = 0; i < n; i++) out.push(...(layer = layer.flatMap(w => alphabet.map(a => w + a))));
  return out;
};
const count = (w, ch) => [...w].filter(c => c === ch).length;
const languageIs = (g, alphabet, n, pred) => all(alphabet, n).find(w => derives(g, w) !== pred(w));
const sound = out => out.checks.every(c => c.ok !== false) && !validateContract(out.solution).some(e => e.startsWith('Missing') || e.includes('must be'));

// ---------------------------------------------------------------- parsing
section('Reading grammars and PDAs');
check('arrows, | and ε', grammarText(parseGrammar('S → aSb | ε')), 'S → aSb | ε');
check('-> and a lone e as ε', grammarText(parseGrammar('S -> aB | bA | e\nA -> a\nB -> b')), 'S → aB | bA | ε\nA → a\nB → b');
check('several rules on one line', grammarText(parseGrammar('S → XY, X → a, Y → Z | b, Z → a')), 'S → XY\nX → a\nY → Z | b\nZ → a');
check('P = { … } and the 4-tuple', parseGrammar('G = ( {S, X}, {a, b, c}, P, S )\nP = { S → XX , X → a | b }').terminals, ['a', 'b', 'c']);
check('P inside the tuple', grammarText(parseGrammar('G = ( {S}, {a,b}, { S → aSb | ε }, S )')), 'S → aSb | ε');
check('a continuation line starting with |', grammarText(parseGrammar('S → aSa | bSb\n   | a | b | ε')), 'S → aSa | bSb | a | b | ε');
check('two-character variables (Ca, D1, S0)', parseGrammar('S0 → Ca D1 | SS\nS → CaCb\nCa → a\nCb → b\nD1 → S Cb').variables, ['S0', 'S', 'Ca', 'Cb', 'D1']);
check('digits as terminals next to variables', grammarText(parseGrammar('S → 1A | 0B\nA → 1AA | 0S | 0\nB → 0BB | 1')), 'S → 1A | 0B\nA → 1AA | 0S | 0\nB → 0BB | 1');
check('PDA: δ-notation, tuple, defaults', [P('pda-anbn').start, P('pda-anbn').bottom, P('pda-anbn').accept, P('pda-anbn').transitions.length], ['q0', 'Z', 'final', 5]);
check('PDA: several targets in one line', parsePda('δ(q, ε, S) = { (q, aSb), (q, bSa), (q, ε) }\nbottom: S').pda.transitions.length, 3);
check('PDA: short form and "accept by empty stack"', parsePda('q0, a, Z -> q0, AZ\nq0, ε, Z -> q0, ε\naccept by empty stack').pda.accept, 'empty');

// ---------------------------------------------------------------- S17
section('S17 · grammars, types, derivations');
check('aⁿbⁿ: the language is exactly { aⁿbⁿ }', languageIs(G('anbn'), ['a', 'b'], 8, w => /^a*b*$/.test(w) && count(w, 'a') === count(w, 'b')) === undefined);
check('EQUAL: exactly the strings with #a = #b', languageIs(G('equal'), ['a', 'b'], 8, w => count(w, 'a') === count(w, 'b')) === undefined);
check('aᵐbⁿ with m ≠ n (practice Q2a)', languageIs(parseGrammar('S → aSb | A | B\nA → aA | a\nB → bB | b'), ['a', 'b'], 8, w => /^a*b*$/.test(w) && count(w, 'a') !== count(w, 'b')) === undefined);
check('even length (practice Q2b)', languageIs(parseGrammar('S → XXS | ε\nX → a | b'), ['a', 'b'], 7, w => w.length % 2 === 0) === undefined);
check('Q3(a) S → aS | bS | ε is Type 3', classify(parseGrammar('S → aS | bS | ε')).chomsky, 3);
check('Q3(b) S → AB, … is Type 2 only', classify(parseGrammar('S → AB\nA → aA | ε\nB → bB | ε')).type, 'context-free');
check('Q3(c) S → aSb | ε is linear, not Type 3', classify(G('anbn')).type, 'linear');
check('Q3(d) mixing right- and left-linear is only linear', classify(parseGrammar('S → aB\nB → Sb | b')).type, 'linear');
check('left-linear S → Sba | a is Type 3', classify(parseGrammar('S → Sba | a')).type, 'left-linear');
const order = solveCfg(G('order'), ['lcwh&o'], grammarNotes(G('order')));
check('order grammar: lcwh&o in eight named steps', derivationText(derivation(shortestTree(G('order'), 'lcwh&o'))), 'O ⇒ ZDX ⇒ lDX ⇒ lcX ⇒ lcwE ⇒ lcwA&E ⇒ lcwh&E ⇒ lcwh&A ⇒ lcwh&o');
check('order grammar: one step per production, tree in each', order.solution.steps.filter(s => s.extra?.tree).length, 8);
check('order grammar over-generates wh&h (as the slide says)', derives(G('order'), 'scwh&h'), true);
check('EQUAL: abba in four steps', derivationText(derivation(shortestTree(G('equal'), 'abba'))), 'S ⇒ aB ⇒ abS ⇒ abbA ⇒ abba');
check('solveCfg output is a sound contract answer', sound(order));
const dfa = parseTransitionTable('state | a | b\n→ A | B | C\n* B | C | A\nC | C | C');
const m2g = solveMachineToGrammar(dfa);
check('DFA for a(ba)* → A → aB | a, B → bA (Theorem 1)', grammarText(m2g.grammar), 'A → aB | a\nB → bA');
check('…and machine and grammar agree', sound(m2g));
check('accepting start state gets a fresh S → q0 | ε', grammarLines(solveMachineToGrammar(parseTransitionTable('state | a\n→ * p | q\nq | p')).grammar)[0], 'S0 → S | ε');
const design = solveGrammarDesign({ description: 'aᵐbⁿ, m ≠ n', grammar: parseGrammar('S → aSb | A | B\nA → aA | ε\nB → bB | b'), members: ['a', 'aab'], non_members: ['ab', 'ba'] });
check('design check catches over-generation (A → aA | ε lets ab in)', design.checks.some(c => c.ok === false && /Over-generation.*ab/.test(c.text)));

// ---------------------------------------------------------------- S18 trees and ambiguity
section('S18 · derivation trees and ambiguity');
const expr = G('expr');
check('tree counts: a+a 1, a+a×a 2, a+a+a 2, a×a×a 2', ['a', 'a+a', 'a+a×a', 'a+a+a', 'a×a×a'].map(w => countTrees(expr, w, 9)), [1, 1, 2, 2, 2]);
check('S → aS | Sa | a: aⁿ has 2ⁿ⁻¹ trees', ['a', 'aa', 'aaa', 'aaaa', 'aaaaa'].map(w => countTrees(parseGrammar('S → aS | Sa | a'), w, 40)), [1, 2, 4, 8, 16]);
const amb = solveAmbiguity(expr, grammarNotes(expr));
check('shortest witness has five symbols', amb.witness.length, 5);
check('repair: E → E+T | T, T → T×F | F, F → a', grammarText(amb.grammar), 'E → E+T | T\nT → T×F | F\nF → a');
check('repair verified: same language, one tree per string', sound(amb));
check('two trees are drawn side by side', amb.solution.steps.find(s => s.extra?.trees)?.extra.trees.length, 2);
const inh = parseGrammar('S → X | Y\nX → AB\nA → aAb | ab\nB → cBd | cd\nY → aYd | aCd\nC → bCc | bc');
check('inherently ambiguous language: abcd 2, aabbccdd 2, aabbcd 1, abbccd 1', ['abcd', 'aabbccdd', 'aabbcd', 'abbccd'].map(w => countTrees(inh, w, 9)), [2, 2, 1, 1]);
check('S → aS | Sa | a repaired to S → aS | a', grammarText(solveAmbiguity(parseGrammar('S → aS | Sa | a')).grammar), 'S → aS | a');
check('unambiguous grammar: no witness reported', solveAmbiguity(G('anbn')).ambiguous, false);
check('a loop (S → S | a) counts as two trees', countTrees(parseGrammar('S → S | a'), 'a'), 2);

// ---------------------------------------------------------------- S18 simplification
section('S18 · simplification (1a, 1b, 2, 3, 4)');
for (const id of ['s18-walk', 's18-q1', 's18-q2']) {
  const p = presetGrammar(id);
  const out = solveSimplify(parseGrammar(p.text));
  check(`${p.name}: final grammar`, same(out.grammar, p.expect.simplified) || grammarText(out.grammar), true);
  check(`${p.name}: language unchanged, contract sound`, sound(out));
}
check('Q1: the useless terminal c leaves T', solveSimplify(G('s18-q1')).grammar.terminals, ['a', 'b']);
check('order matters: S → AB | a, A → a gives S → a', grammarText(solveSimplify(parseGrammar('S → AB | a\nA → a')).grammar), 'S → a');
check('sibling example: C, D, E orphaned by step 3', grammarText(solveSimplify(parseGrammar('S → AB\nA → a\nB → C | b\nC → D\nD → E\nE → a')).grammar), 'S → AB\nA → a\nB → b | a');
check('unit cycle S → A → B → S', new Set(solveSimplify(parseGrammar('S → A | bb\nA → B | b\nB → S | a')).grammar.rules.map(ruleStr)), new Set(['S → bb', 'S → b', 'S → a']));
check('Q2 step 2 expands S → ASA into four', solveSimplify(G('s18-q2')).solution.steps[3].lines.some(l => l.includes('S → ASA gives S → ASA | SA | AS | S')));
check('Q2 step 3 flags the unit production step 2 created', solveSimplify(G('s18-q2')).solution.steps[4].lines[0].includes('S → S (created by step 2)'));

// ---------------------------------------------------------------- S19
section('S19 · Chomsky and Greibach normal forms');
const relay = solveCnf(G('s19-relay'));
check('relay: S0 → AD1 | SA | AS | CaB | a, …, D1 → SA', same(relay.grammar, presetGrammar('s19-relay').expect.cnf) || grammarText(relay.grammar), true);
check('relay: one D1 serves all three tails', relay.grammar.variables.filter(v => /^D/.test(v)), ['D1']);
check('relay: sound', sound(relay));
const q2 = solveCnf(G('s19-q2'));
check('Q2 (ε ∈ L): S0 → CaD1 | CaCb | CbD2 | CbCa | SS | ε, …', same(q2.grammar, presetGrammar('s19-q2').expect.cnf) || grammarText(q2.grammar), true);
check('Q2: sound, and ε is still generated', sound(q2) && derives(q2.grammar, ''));
const ex1 = solveCnf(G('s19-ex1'), {}, { linz: true });
check('Example 1 (Linz form): 7 variables, D1 → AA, D2 → BB', same(ex1.grammar, presetGrammar('s19-ex1').expect.cnfLinz) || grammarText(ex1.grammar), true);
check('Example 1 in Sipser\'s version adds S0', solveCnf(G('s19-ex1')).grammar.start, 'S0');
check('Q1 (0/1 grammar, Linz): eleven productions', solveCnf(parseGrammar('S → 1A | 0B\nA → 1AA | 0S | 0\nB → 0BB | 1'), {}, { linz: true }).grammar.rules.length, 11);
check('2n − 1 steps: |w| = 2, 4, 6 take 3, 7, 11', ['ab', 'abab', 'aabbab'].map(w => derivation(shortestTree(ex1.grammar, w)).length - 1), [3, 7, 11]);
check('every CNF result has only A → BC | A → a', [relay, q2, ex1].every(o => o.grammar.rules.every(r => r.rhs.length === 2 || r.rhs.length === 1 || r.lhs === o.grammar.start)));
check('Q3(b): CNF only / GNF only / GNF only / neither', ['S → AB\nA → a\nB → b', 'S → aSB | b\nB → b', 'S → aS | a', 'S → AB\nA → aA\nB → b'].map(t => formVerdict(parseGrammar(t)).text), ['CNF only', 'GNF only', 'GNF only', 'neither']);
const lr = solveGnf(parseGrammar('S → Sa | b'));
check('left recursion: S → Sa | b becomes S → bS′ | b, S′ → aS′ | a', grammarText(lr.grammar), 'S → b S′ | b\nS′ → a S′ | a');
for (const t of ['S → Sa | b', 'E → E+T | T\nT → T*F | F\nF → (E) | a', 'S → AB\nA → BS | b\nB → SA | a', 'S → aSa | bSb | a | b | ε']) {
  const out = solveGnf(parseGrammar(t));
  check(`GNF of ${t.split('\n')[0]} …: every production A → aα, language kept`, sound(out) && !normalForms(out.grammar).gnfBreak);
}
check('a grammar already in GNF is recognised', solveGnf(G('s19-ex1')).solution.conclusion.includes('already in Greibach'));

// ---------------------------------------------------------------- S20
section('S20 · pushdown automata');
const anbn = P('pda-anbn');
const ids = (p, w) => search(p, w).path.map(x => idStr(x.c, w));
check('aabb: the five-move trace of the walkthrough', ids(anbn, 'aabb'), ['(q0, aabb, Z)', '(q0, abb, XZ)', '(q0, bb, XXZ)', '(q1, b, XZ)', '(q1, ε, Z)', '(q2, ε, Z)']);
check('aaabbb: eight IDs, seven moves', ids(anbn, 'aaabbb').length, 8);
check('aab is stuck in (q1, ε, XZ)', idStr(search(anbn, 'aab').stuck.path.at(-1).c, 'aab'), '(q1, ε, XZ)');
check('abab is rejected', pdaAccepts(anbn, 'abab'), false);
check('aⁿbⁿ machine accepts exactly { aⁿbⁿ : n ≥ 1 }', all(['a', 'b'], 8).find(w => pdaAccepts(anbn, w) !== (/^a+b+$/.test(w) && count(w, 'a') === count(w, 'b'))) === undefined);
check('aⁿbⁿ machine is deterministic', determinism(anbn).deterministic, true);
const a2n = parsePda('δ(q0, a, Z) = { (q0, XXZ) }\nδ(q0, a, X) = { (q0, XXX) }\nδ(q0, b, X) = { (q1, ε) }\nδ(q1, b, X) = { (q1, ε) }\nδ(q1, ε, Z) = { (q2, Z) }\nfinal: q2').pda;
check('aⁿb²ⁿ: aabbbb in seven moves', ids(a2n, 'aabbbb'), ['(q0, aabbbb, Z)', '(q0, abbbb, XXZ)', '(q0, bbbb, XXXXZ)', '(q1, bbb, XXXZ)', '(q1, bb, XXZ)', '(q1, b, XZ)', '(q1, ε, Z)', '(q2, ε, Z)']);
const eq = P('pda-equal');
check('#a = #b (empty stack): the trace of abba', ids(eq, 'abba'), ['(q0, abba, Z)', '(q0, bba, PZ)', '(q0, ba, Z)', '(q0, a, NZ)', '(q0, ε, Z)', '(q0, ε, ε)']);
check('#a = #b: rule 1 holds, rule 2 fails', [determinism(eq).rule1.length, determinism(eq).rule2.length > 0], [0, true]);
check('#a = #b machine accepts exactly EQUAL', all(['a', 'b'], 8).find(w => pdaAccepts(eq, w) !== (count(w, 'a') === count(w, 'b'))) === undefined);
const wwr = P('pda-wwr');
check('wwᴿ accepts exactly the even palindromes', all(['a', 'b'], 8).find(w => pdaAccepts(wwr, w) !== (w.length % 2 === 0 && w === [...w].reverse().join(''))) === undefined);
const tr = solvePda(wwr, ['abba', 'abab'], pdaNotes(wwr));
check('wwᴿ on abba: an accepting branch AND a STUCK branch', tr.solution.steps.some(s => /STUCK/.test(s.title)) && tr.solution.tests[0].accepted);
check('wwᴿ rejects abab', tr.solution.tests[1].accepted, false);
const t1 = solvePda(anbn, ['aabb', 'aab'], pdaNotes(anbn));
check('trace is animated: one step (and one stack frame more) per move', t1.solution.steps.filter(s => s.extra?.stack).map(s => s.extra.stack.frames.length).slice(0, 6), [1, 2, 3, 4, 5, 6]);
check('the move count names the forgotten ε-move', t1.solution.steps.some(s => s.lines.includes('5 moves for 4 input symbols: 2 pushes, 2 pops, 1 ε-move')));
check('solvePda output is a sound contract answer', sound(t1) && sound(tr));

// ---------------------------------------------------------------- S21
section('S21 · CFG → PDA');
const walk = solveCfgToPda(G('s21-walk'), ['aabc']);
check('walkthrough: nine transitions, three states', [walk.pda.transitions.length, walk.pda.states.length], [9, 3]);
const run = walk.solution.steps.filter(s => s.extra?.stack).at(-1).extra.stack.frames;
check('aabc: the trace of the slides, ID by ID', run.map(f => `${f.rest || 'ε'}|${f.stack.join('')}`), ['aabc|$', 'aabc|S$', 'aabc|aBc$', 'abc|Bc$', 'abc|SBc$', 'abc|abBc$', 'bc|bBc$', 'c|Bc$', 'c|c$', 'ε|$', 'ε|']);
check('…and its sentential forms spell the derivation', [...new Set(run.map(f => f.form))].slice(1), ['S', 'aBc', 'aSBc', 'aabBc', 'aabc']);
const act = solveCfgToPda(G('anbn'), ['aabb']);
check('S → aSb | ε: six transitions; aabb accepted', [act.pda.transitions.length, act.solution.tests[0].accepted], [6, true]);
const q1 = solveCfgToPda(G('s21-q1'), ['abba']);
check('Q1: seven transitions', q1.pda.transitions.length, 7);
check('Q1: abba is NOT in L(G); all three branches get stuck', [q1.solution.tests[0].accepted, q1.solution.steps.at(-1).lines.filter(l => /^BRANCH/.test(l)).length], [false, 3]);
check('the ε-production is an EXPAND transition (a pop)', q1.pda.transitions.some(t => t.kind === 'EXPAND' && t.push.length === 0));
check('a GNF grammar also gets the one-state machine', solveCfgToPda(parseGrammar('S → aSB | aB\nB → b'), ['aabb']).solution.steps.some(s => /ONE state/.test(s.title) && s.lines.some(l => l.includes('exactly n = 4 moves'))));
check('machine = grammar on every short string', [walk, act, q1].every(sound));

// ---------------------------------------------------------------- presets
section('Presets and follow-ups');
check('every grammar preset solves cleanly in its own technique', GRAMMAR_PRESETS.every(p => sound(solveCfg(parseGrammar(p.text), [], p.notes))));
check('every PDA preset traces cleanly', PDA_PRESETS.every(p => sound(solvePda(parsePda(p.text).pda, [], p.notes))));
check('relay language = strings containing an a', languageIs(G('s19-relay'), ['a', 'b'], 7, w => w.includes('a')) === undefined);
check('S18 walkthrough language = a*ba*', languageIs(G('s18-walk'), ['a', 'b'], 7, w => /^a*ba*$/.test(w)) === undefined);
check('all six techniques are marked ready', ['cfg', 'ambiguity', 'simplification', 'cnf_gnf', 'pda', 'cfg_to_pda'].every(t => READY.has(t)));
check('every follow-up question has a ready answer', ['cfg', 'ambiguity', 'simplification', 'cnf_gnf', 'pda', 'cfg_to_pda'].every(t => FOLLOW_UPS[t].length >= 2 && FOLLOW_UPS[t].every(q => READY_ANSWERS[q])));

// ---------------------------------------------------------------- the chat router
section('Chat routing (no AI)');
const tech = r => r?.msgs?.[0]?.solution?.technique ?? r?.msgs?.[0]?.kind ?? null;
const say = (text, extra = {}) => respondGrammar({ text, ...extra });
check('a bare grammar → S17 derivation', tech(say('S → aSb | ε')), 'cfg');
const cnf = say('Convert to Chomsky normal form:\nS → ASA | aB\nA → B | S\nB → b | ε');
check('"Convert to Chomsky normal form: …" → CNF', [tech(cnf), cnf.subject.grammar.start], ['cnf_gnf', 'S0']);
check('one line, ASCII arrows, e for ε', grammarText(say('Simplify S -> AB | b, A -> aA | e, B -> bC | b, C -> A').subject.grammar), 'S → AB | b | bC\nA → aA | a\nB → bC | b\nC → aA | a');
check('"Is this grammar ambiguous?" → ambiguity', tech(say('Is this grammar ambiguous?\nE → E+E | E×E | a')), 'ambiguity');
const pdaMsg = say('Turn S → aSb | ε into a PDA and trace aabb');
check('words after the production are not part of it', [tech(pdaMsg), grammarText(pdaMsg.subject.grammar), pdaMsg.msgs[0].solution.tests[0].input], ['cfg_to_pda', 'S → aSb | ε', 'aabb']);
check('Greibach is recognised', say('Greibach normal form of S → Sa | b').msgs[0].solution.input_summary.includes('Greibach'));
check('derive with strings: line', say('S → aB | bA | ε\nA → aS | bAA | a\nB → bS | aBB | b\nstrings: abba, aab').msgs[0].solution.tests.slice(0, 2).map(t => t.accepted), [true, false]);
const pdaChat = say(`${presetPda('pda-anbn').text}\nstrings: aabb, abab`);
check('a PDA → S20 trace, with its preset meanings', [tech(pdaChat), pdaChat.subject.kind, pdaChat.msgs[0].solution.facts[0].meaning.includes('still reading')], ['pda', 'pda', true]);
const subject = say('S → AB | b\nA → aA | ε\nB → bC | b\nC → A').subject;
check('follow-up "Simplify it"', tech(say('Simplify it', { subject })), 'simplification');
check('follow-up "Convert it to Chomsky normal form"', tech(say('Convert it to Chomsky normal form', { subject })), 'cnf_gnf');
check('follow-up "Is it ambiguous?"', tech(say('Is it ambiguous?', { subject })), 'ambiguity');
check('follow-up "Convert it to a PDA"', tech(say('Convert it to a PDA', { subject })), 'cfg_to_pda');
check('follow-up "test aab, b"', say('test aab, b', { subject }).msgs[0].solution.tests.slice(0, 2).map(t => t.input), ['aab', 'b']);
check('follow-up on a PDA: "test aaabbb"', say('test aaabbb', { subject: pdaChat.subject }).msgs[0].solution.tests[0].accepted, true);
check('a question about the grammar goes to the AI, not to code', say('Why is A nullable?', { subject }), null);
check('not grammars: "NFA → DFA", a table, a concept question', [say('Give me a practice question on NFA → DFA'), say('state | a | b\n→ q0 | {q0, q1} | {q0}\n* q1 | ∅ | ∅'), say('Why can every NFA be turned into a DFA?')], [null, null, null]);
check('strings from words', [stringsFromWords('derive aabb and ab', ['a', 'b']), stringsFromWords('Show the derivation of lcwh&o', [...'smlctwho&']), stringsFromWords('derive a string', ['a', 'b']), stringsFromWords('is abba in L(G)?', ['a', 'b'])], [['aabb', 'ab'], ['lcwh&o'], [], ['abba']]);

const viaBrain = await respond({ text: 'Convert this DFA to a right-linear grammar\nstate | a | b\n→ A | B | C\n* B | C | A\nC | C | C', llmOn: false, history: [] });
check('through brain.js: a table + "grammar" → Theorem 1', [tech(viaBrain), viaBrain.machine, grammarText(viaBrain.subject.grammar)], ['cfg', null, 'A → aB | a\nB → bA']);
const table = await respond({ text: 'state | a | b\n→ m0 | {m0, m1} | {m0}\nm1 | {m1} | {m1, m2}\n* m2 | {m2} | {m2}', llmOn: false, history: [], subject });
check('through brain.js: a new machine replaces the grammar as "it"', [tech(table), table.subject, Boolean(table.machine)], ['subset_construction', null, true]);
const g2 = await respond({ text: 'S → aSb | ε', llmOn: false, history: [], machine: table.machine });
check('…and a new grammar replaces the machine', [tech(g2), g2.machine, g2.subject.kind], ['cfg', null, 'grammar']);
check('every message survives being saved to localStorage', [cnf, pdaChat, pdaMsg, viaBrain].every(r => JSON.stringify(JSON.parse(JSON.stringify(r.msgs[0].solution))) === JSON.stringify(r.msgs[0].solution)));

// ---------------------------------------------------------------- what the AI hands back (mocked)
section('AI hand-off (mocked analyzer output)');
const ai1 = grammarFromAi({ intent: 'solve', technique: 'cnf_gnf', cf_method: 'cnf', grammar: { start: 'S', rules: ['S → ASA | aB', 'A → B | S', 'B → b | ε'] }, strings: [] }, { text: 'put it in CNF' });
check('a grammar read by the AI is solved by code', [tech(ai1), ai1.msgs[0].text.includes('as I read it'), same(ai1.subject.grammar, presetGrammar('s19-relay').expect.cnf)], ['cnf_gnf', true, true]);
const ai2 = grammarFromAi({ intent: 'solve', technique: 'cfg', grammar: { rules: ['S → aSb | A | B', 'A → aA | ε', 'B → bB | b'] }, cf_design: { description: 'aᵐbⁿ with m ≠ n', facts: [{ item: 'A', meaning: 'a non-empty run of a’s' }], members: ['a', 'aab'], non_members: ['ab'] } }, {});
check('a grammar DESIGNED by the AI is tested: over-generation is flagged', ai2.msgs[0].checks.some(c => c.ok === false) && ai2.msgs[0].mood === 'sad');
const ai3 = grammarFromAi({ intent: 'solve', technique: 'pda', pda: { start: 'q0', bottom: 'Z', final: ['q2'], accept: 'final', transitions: ['δ(q0, a, Z) = (q0, XXZ)', 'δ(q0, a, X) = (q0, XXX)', 'δ(q0, b, X) = (q1, ε)', 'δ(q1, b, X) = (q1, ε)', 'δ(q1, ε, Z) = (q2, Z)'] }, cf_design: { description: 'aⁿb²ⁿ, n ≥ 1', facts: [{ item: 'X', meaning: 'one b still owed' }], members: ['abb', 'aabbbb'], non_members: ['ab', 'abbb', ''] } }, {});
check('a PDA designed by the AI is simulated on every sample string', [tech(ai3), ai3.msgs[0].checks.every(c => c.ok !== false), ai3.msgs[0].solution.facts[0].item], ['pda', true, 'X']);
const ai4 = grammarFromAi({ intent: 'solve', technique: 'pda', pda: { start: 'q0', bottom: 'Z', final: ['q1'], accept: 'final', transitions: ['δ(q0, a, Z) = (q1, Z)'] }, cf_design: { description: 'aⁿbⁿ', members: ['ab'], non_members: ['a'] } }, {});
check('…and a wrong design is caught', ai4.msgs[0].checks.filter(c => c.ok === false).length, 2);
check('a task on the grammar already in the chat reuses it', tech(grammarFromAi({ intent: 'solve', technique: 'simplification', grammar: null }, { subject })), 'simplification');
check('questions and automata are left to brain.js', [grammarFromAi({ intent: 'question', technique: 'cfg' }), grammarFromAi({ intent: 'solve', technique: 'subset_construction' })], [null, null]);

console.log(`\n${failures.length ? `✗ ${failures.length} FAILED` : '✓ all passed'}: ${passed} passed${failures.length ? `, ${failures.length} failed:\n  - ${failures.join('\n  - ')}` : ''}`);
process.exit(failures.length ? 1 : 0);
