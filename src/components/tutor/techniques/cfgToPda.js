// S21 · CFG → PDA by the three-rule construction: START pushes S above a fresh marker,
// EXPAND has one loop per production, MATCH one loop per terminal, ACCEPT fires when the
// marker surfaces. Three states whatever the grammar, and |P| + |T| + 2 transitions.
// The trace keeps the sentential form beside every ID: read that column downwards and you
// have the leftmost derivation.

import { EPS, isVar, rhsStr, ruleStr, setStr, tupleStr as grammarTuple, grammarLines, derives, shortestTree, derivation, derivationText, allStrings, normalForms } from '../grammar.js';
import { transStr, labelStr, idStr, tupleStr, pdaToDot, startConfig, applyMove, search, frameOf, setStr as pdaSet } from '../pdaMachine.js';
import { variableFacts, sampleStrings, languageLine } from './grammarCommon.js';

const show = w => (w === '' ? EPS : w);
const QS = 'q_s';
const QL = 'q_loop';
const QF = 'q_f';

export function buildPda(g) {
  const marker = ['$', '⊥', '#', 'Z0'].find(m => !g.terminals.includes(m) && !g.variables.includes(m));
  const start = { from: QS, read: '', pop: marker, to: QL, push: [g.start, marker], kind: 'START' };
  const expand = g.rules.map(r => ({ from: QL, read: '', pop: r.lhs, to: QL, push: [...r.rhs], kind: 'EXPAND', rule: r }));
  const match = g.terminals.map(a => ({ from: QL, read: a, pop: a, to: QL, push: [], kind: 'MATCH' }));
  const accept = { from: QL, read: '', pop: marker, to: QF, push: [], kind: 'ACCEPT' };
  const pda = { states: [QS, QL, QF], input: [...g.terminals], stack: [...g.variables, ...g.terminals, marker], start: QS, bottom: marker, final: [QF], accept: 'final', transitions: [start, ...expand, ...match, accept] };
  return { pda, marker, start, expand, match, accept };
}

// The accepting run that follows a leftmost derivation: no search needed.
function runFor(g, built, w, tree) {
  const rules = derivation(tree).slice(1).map(s => s.rule);
  let c = startConfig(built.pda);
  const path = [{ c, via: null }];
  const step = t => {
    c = applyMove(c, t);
    path.push({ c, via: t });
  };
  step(built.start);
  let k = 0;
  for (let guard = 0; guard < 2000; guard++) {
    const top = c.stack[0];
    if (top === built.marker) {
      step(built.accept);
      break;
    }
    if (isVar(g, top)) {
      const rule = rules[k++];
      step(built.expand.find(t => t.rule === rule));
    } else step(built.match.find(t => t.read === top));
  }
  return path;
}

const formOf = (c, w, marker, i) => (i === 0 ? '(nothing yet)' : rhsStr([...w.slice(0, c.pos), ...c.stack.filter(x => x !== marker)]));
const kindWord = t => (t.kind === 'EXPAND' ? `EXPAND with ${ruleStr(t.rule)}` : t.kind === 'MATCH' ? `MATCH ${t.read}` : t.kind);
const traceTable = (path, w, marker) => [['#', 'ID (state, unread input, stack)', 'transition', 'rule', 'sentential form'], ...path.map((x, i) => [i === 0 ? 'start' : `⊢ ${i}`, idStr(x.c, w), x.via ? labelStr(x.via) : '', x.via ? x.via.kind : '', formOf(x.c, w, marker, i)])];
const traceLines = (path, w) => path.map((x, i) => (i === 0 ? `   ${idStr(x.c, w)}` : `⊢ ${idStr(x.c, w)}   by ${labelStr(x.via)}   (${kindWord(x.via)})`));
const stackOf = (p, path, w, marker, note = '') => ({ input: w, bottom: p.bottom, current: path.length - 1, frames: path.map((x, i) => ({ ...frameOf(x.c, w, x.via, i === path.length - 1 ? note : ''), form: formOf(x.c, w, marker, i) })) });

export function solveCfgToPda(g, strings = [], notes = {}) {
  const steps = [];
  const built = buildPda(g);
  const { pda, marker } = built;
  const total = g.rules.length + g.terminals.length + 2;
  const partial = ts => pdaToDot({ ...pda, transitions: ts });
  const epsRule = g.rules.find(r => !r.rhs.length);

  steps.push({
    title: 'The grammar, and a prediction',
    explain: 'The machine will keep the current sentential form on its stack and rewrite it in place. Count the transitions before writing any: one per production, one per terminal, plus start and accept.',
    lines: [grammarTuple(g), ...grammarLines(g).map(l => `P: ${l}`), `|P| + |T| + 2 = ${g.rules.length} + ${g.terminals.length} + 2 = ${total} transitions`, 'and THREE states, whatever the grammar: q_s, q_loop, q_f'],
    highlight: [],
    quiz: { question: 'How many transitions will the machine have?', answer: String(total), options: [...new Set([g.rules.length + g.terminals.length, total - 1, total, total + 1].map(String))], why: `One per production (${g.rules.length}), one per terminal (${g.terminals.length}), plus start and accept: ${total}.` },
    extra: {}
  });

  steps.push({
    title: `Rule 1 · START: push ${g.start} above a fresh marker`,
    explain: `Put the start symbol on the stack, above a bottom marker ${marker} that the grammar never uses. The marker is what makes "fully matched" detectable.`,
    lines: [`q_s —— ε, ${marker} → ${g.start}${marker} ——▸ q_loop`, transStr(built.start), `the stack is now ${g.start}${marker}: the whole sentential form is ${g.start}, and ${marker} marks where it ends`],
    graph: partial([built.start]),
    highlight: [QS],
    extra: {}
  });

  steps.push({
    title: 'Rule 2 · EXPAND: one loop per production',
    explain: 'If the top of the stack is a variable, replace it by the right-hand side of one of its productions, without reading any input. The right-hand side is pushed as written: its first symbol becomes the new top.',
    lines: [
      ...built.expand.map(t => `${labelStr(t)}   (from ${ruleStr(t.rule)})${t.rule.rhs.length ? '' : '   ← the ε-production: the top is replaced by nothing, a pop. The one most often left out'}`),
      `${built.expand.length} productions, ${built.expand.length} loops at q_loop`,
      ...(epsRule ? [`without ${labelStr(built.expand.find(t => t.rule === epsRule))} no derivation could ever stop, and the machine would accept nothing`] : [])
    ],
    graph: partial([built.start, ...built.expand]),
    highlight: [QL],
    extra: {}
  });

  steps.push({
    title: 'Rule 3 · MATCH: one loop per terminal',
    explain: 'If the top of the stack is a terminal, read the same symbol from the input and cancel it. Without these loops the machine would expand for ever and never touch its input.',
    lines: [...built.match.map(t => labelStr(t)), `${built.match.length} terminals, ${built.match.length} loops at q_loop`],
    graph: partial([built.start, ...built.expand, ...built.match]),
    highlight: [QL],
    extra: {}
  });

  steps.push({
    title: 'Rule 4 · ACCEPT, and the whole machine',
    explain: `The marker ${marker} surfaces only when the whole sentential form has been matched against the input. Then one last ε-move pops it and enters the accepting state.`,
    lines: [
      `q_loop —— ε, ${marker} → ε ——▸ q_f`,
      tupleStr(pda),
      `Γ = ${pdaSet(pda.stack)} holds the variables AND the terminals, because the stack holds sentential forms`,
      'acceptance by FINAL STATE, F = {q_f}',
      `transitions: 1 start + ${built.expand.length} expand + ${built.match.length} match + 1 accept = ${pda.transitions.length}  ${pda.transitions.length === total ? '✓ as predicted' : '✗'}`
    ],
    table: [['rule', 'transition', 'as an arrow label'], ...pda.transitions.map(t => [t.kind, transStr(t), labelStr(t)])],
    graph: pdaToDot(pda),
    highlight: [QF],
    extra: { pda }
  });

  // ---------- run it ----------
  const sample = sampleStrings(g);
  const words = strings.length ? strings : [sample.inL.find(w => w.length >= 3) ?? sample.inL[sample.inL.length - 1], sample.outL.find(w => w.length >= 2) ?? sample.outL[0]].filter(w => w !== undefined);
  const tests = [];
  let animated = false;
  words.forEach(w => {
    const tree = [...w].every(ch => g.terminals.includes(ch)) ? shortestTree(g, w) : null;
    if (tree) {
      const path = runFor(g, built, w, tree);
      const n = path.length - 1;
      const ex = path.filter(x => x.via?.kind === 'EXPAND').length;
      const ma = path.filter(x => x.via?.kind === 'MATCH').length;
      const closing = [
        `input finished ✓   q_f ∈ F ✓   →   ACCEPT`,
        `${n} moves: 1 start + ${ex} expand + ${ma} match + 1 accept. Expand moves read nothing; match moves read one symbol each`,
        `the sentential-form column, read downwards without repeats: ${derivationText(derivation(tree))}`
      ];
      if (!animated && n <= 13) {
        animated = true;
        path.forEach((x, k) => {
          if (k === 0) return;
          const t = x.via;
          const prev = path[k - 1].c;
          const table = traceTable(path.slice(0, k + 1), w, marker);
          steps.push({
            title: `Run "${show(w)}" · move ${k}: ${kindWord(t)}`,
            explain:
              t.kind === 'START'
                ? `Start: push ${g.start} above the marker. The stack now holds the whole sentential form, ${g.start}.`
                : t.kind === 'EXPAND'
                ? `The top of the stack is the variable ${t.pop}. Guess a production for it: ${ruleStr(t.rule)}. No input is read. (Every other choice is another branch; this is the one that survives.)`
                : t.kind === 'MATCH'
                ? `The top of the stack is the terminal ${t.pop} and the next input symbol is ${t.read}: they cancel. The stack is always the part of the sentential form that is still unmatched.`
                : `The marker ${marker} is on top, so everything has been matched. Pop it and accept.`,
            lines: [...traceLines(path.slice(0, k + 1), w).slice(-2), ...(k === n ? closing : [])],
            table,
            highlight_cells: table[0].map((_, c) => [k + 1, c]),
            highlight: [],
            quiz:
              k > 1 && k < n
                ? { question: `The stack is ${rhsStr(prev.stack)} and the unread input is ${show(w.slice(prev.pos))}. EXPAND or MATCH?`, answer: t.kind, options: ['EXPAND', 'MATCH'], why: isVar(g, prev.stack[0]) ? `${prev.stack[0]} is a variable, so it is replaced by a right-hand side.` : `${prev.stack[0]} is a terminal, so it is matched against the input.` }
                : undefined,
            extra: { stack: stackOf(pda, path.slice(0, k + 1), w, marker, k === n ? 'ACCEPT' : '') }
          });
        });
      } else {
        const table = traceTable(path, w, marker);
        steps.push({
          title: `Run "${show(w)}": accepted`,
          explain: 'Expand steps do not consume input; match steps do. The stack is always the sentential form with its already-matched prefix removed.',
          lines: [...traceLines(path, w), ...closing],
          table,
          highlight: [],
          extra: { stack: stackOf(pda, path, w, marker, 'ACCEPT') }
        });
      }
      tests.push({ input: w, path: `${derivationText(derivation(tree))}  (${n} moves)`, accepted: true });
    } else {
      // every first choice of production, followed as far as it goes
      const afterStart = applyMove(startConfig(pda), built.start);
      const firsts = built.expand.filter(t => t.pop === g.start);
      const branches = firsts.slice(0, 4).map(t => {
        const res = search(pda, w, { from: applyMove(afterStart, t), maxConfigs: 3000 });
        const tail = res.stuck ? res.stuck.path.map((x, i) => (i === 0 ? { c: x.c, via: t } : x)) : [{ c: applyMove(afterStart, t), via: t }];
        return { t, path: [{ c: startConfig(pda), via: null }, { c: afterStart, via: built.start }, ...tail], reason: res.stuck ? res.stuck.reason : 'it never reaches the accepting state', accepted: res.accepted };
      });
      const lines = [];
      branches.forEach((b, i) => {
        lines.push(`BRANCH ${i + 1}: start with ${labelStr(b.t)}   (${ruleStr(b.t.rule)})`);
        b.path.slice(2).forEach(x => lines.push(`   ⊢ ${idStr(x.c, w)}   by ${labelStr(x.via)}`));
        lines.push(`   STUCK: ${b.reason}`);
      });
      lines.push(`every branch fails, so the machine rejects ${show(w)}: no special transition, just no branch surviving`);
      const shown = branches[0];
      steps.push({
        title: `Run "${show(w)}": every branch fails`,
        explain: `${show(w)} is not in L(G), so no sequence of guesses can work. The machine has ${firsts.length} ${firsts.length === 1 ? 'choice' : 'choices'} for its first expand move; each one is followed as far as it can go.`,
        lines,
        table: shown ? traceTable(shown.path, w, marker) : undefined,
        highlight: [],
        quiz: { question: `Before you look: does the machine accept "${show(w)}"?`, answer: 'no', options: ['yes', 'no'], why: `${show(w)} is not in L(G), and the machine accepts exactly L(G).` },
        extra: shown ? { stack: stackOf(pda, shown.path, w, marker, 'STUCK') } : {}
      });
      tests.push({ input: w, path: `not in L(G): all ${firsts.length} first choices get stuck`, accepted: false });
    }
  });

  // ---------- from a normal form: one state ----------
  const nf = normalForms(g);
  const noEps = !g.rules.some(r => !r.rhs.length);
  if (noEps && (!nf.gnfBreak || !nf.cnfBreak)) {
    const gnf = !nf.gnfBreak;
    const one = g.rules.map(r => (gnf ? { from: 'q', read: r.rhs[0], pop: r.lhs, to: 'q', push: r.rhs.slice(1) } : r.rhs.length === 2 ? { from: 'q', read: '', pop: r.lhs, to: 'q', push: [...r.rhs] } : { from: 'q', read: r.rhs[0], pop: r.lhs, to: 'q', push: [] }));
    const M1 = { states: ['q'], input: [...g.terminals], stack: [...g.variables], start: 'q', bottom: g.start, final: [], accept: 'empty', transitions: one };
    const w1 = words.find(w => derives(g, w) && w.length);
    steps.push({
      title: `Bonus: the grammar is in ${gnf ? 'Greibach' : 'Chomsky'} normal form, so ONE state is enough`,
      explain: gnf
        ? 'A Greibach production A → aα is already a PDA instruction: read a, pop A, push α. So the machine is a transcription, not a construction: one state, the stack starts as S, acceptance by empty stack.'
        : 'From CNF only two kinds of transition are needed: A → BC becomes an ε-move that rewrites the top, A → a becomes an input move that pops. One state, the stack starts as S, acceptance by empty stack.',
      lines: [
        ...g.rules.map((r, i) => `${labelStr(one[i])}   (from ${ruleStr(r)})`),
        tupleStr(M1, "M′"),
        `${one.length} transitions, one per production; Z0 = ${g.start}; accepts by EMPTY STACK`,
        ...(w1 ? [`on ${w1} this machine takes ${gnf ? `exactly n = ${w1.length} moves, one per input symbol` : `exactly 2n − 1 = ${2 * w1.length - 1} moves`}; the three-state machine took ${tests.find(t => t.input === w1)?.path.match(/\((\d+) moves\)/)?.[1] || 'more'}`] : [])
      ],
      graph: pdaToDot(M1),
      highlight: [],
      extra: {}
    });
  }

  // The contract wants a rejected test; also compare machine and grammar on every short string.
  if (!tests.some(t => !t.accepted) && sample.outL.length) tests.push({ input: sample.outL[0], path: 'not in L(G): every branch gets stuck', accepted: false });
  const checks = [];
  const pool = allStrings(g.terminals, g.terminals.length > 3 ? 3 : g.terminals.length > 2 ? 4 : 5, 250);
  let compared = 0;
  let wrong;
  const t0 = Date.now();
  for (const w of pool) {
    if (Date.now() - t0 > 600) break;
    const res = search(pda, w, { maxConfigs: 2500 });
    if (res.truncated && !res.accepted) continue;
    compared++;
    if (res.accepted !== derives(g, w)) {
      wrong = w;
      break;
    }
  }
  checks.push(wrong === undefined ? { ok: true, text: `The machine accepts exactly the strings the grammar derives (simulated on ${compared} strings).` } : { ok: false, text: `The machine and the grammar disagree on "${show(wrong)}".` });
  if (pda.transitions.length !== total) checks.push({ ok: false, text: `Expected ${total} transitions but built ${pda.transitions.length}.` });

  const acc = tests.filter(t => t.accepted).map(t => show(t.input));
  const rej = tests.filter(t => !t.accepted).map(t => show(t.input));
  return {
    grammar: g,
    pda,
    checks,
    solution: {
      technique: 'cfg_to_pda',
      session: 'S21',
      input_summary: `CFG with ${g.rules.length} productions over ${setStr(g.terminals)} → PDA with 3 states and ${total} transitions`,
      facts: [
        { item: QS, meaning: `nothing done yet: only the marker ${marker} is on the stack` },
        { item: QL, meaning: 'the stack holds the unmatched tail of the current sentential form (top on the left)' },
        { item: QF, meaning: 'the whole input was derived and matched' },
        ...variableFacts(g, notes)
      ],
      facts_title: 'What each state and variable means',
      formal: tupleStr(pda),
      steps,
      tests,
      language: languageLine(g, notes),
      conclusion: `Three states and ${g.rules.length} + ${g.terminals.length} + 2 = ${total} transitions, accepting by final state. Accepted: ${acc.join(', ') || 'none'}. Rejected: ${rej.join(', ') || 'none'}. The stack always holds the unmatched tail of the sentential form.`
    }
  };
}
