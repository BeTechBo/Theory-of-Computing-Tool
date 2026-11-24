// S20 · Pushdown automata: the seven-tuple, the two determinism rules, and the trace as
// IDs (state, unread input, stack with the top on the LEFT), one ⊢ per line with the
// transition that justifies it. For a nondeterministic machine: the branch that accepts and
// one that gets STUCK. Being stuck is rejection, not an error.

import { EPS, stackStr, transStr, idStr, setStr, tupleStr, effect, pdaToDot, startConfig, search, failingBranch, determinism, frameOf } from '../pdaMachine.js';

const show = w => (w === '' ? EPS : w);
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// "2 pushes, 2 pops, 1 ε-move"
function moveCount(path) {
  const via = path.slice(1).map(x => x.via);
  const eps = via.filter(t => t.read === '').length;
  const push = via.filter(t => t.read !== '' && t.push.length > 1).length;
  const pop = via.filter(t => t.read !== '' && t.push.length === 0).length;
  const other = via.length - eps - push - pop;
  return [push && plural(push, 'push', 'pushes'), pop && plural(pop, 'pop'), other && plural(other, 'other reading move'), eps && plural(eps, 'ε-move')].filter(Boolean).join(', ');
}

const idTable = (path, w) => [['#', 'ID (state, unread input, stack)', 'transition used'], ...path.map((x, i) => [i === 0 ? 'start' : `⊢ ${i}`, idStr(x.c, w), x.via ? transStr(x.via) : ''])];
const idLines = (path, w) => path.map((x, i) => (i === 0 ? `   ${idStr(x.c, w)}` : `⊢ ${idStr(x.c, w)}   by ${transStr(x.via)}`));
const frames = (path, w, lastNote = '') => path.map((x, i) => frameOf(x.c, w, x.via, i === path.length - 1 ? lastNote : ''));
export const stackExtra = (p, path, w, note = '') => ({ input: w, frames: frames(path, w, note), current: path.length - 1, bottom: p.bottom });

export function solvePda(p, strings = [], notes = {}) {
  const steps = [];
  const byFinal = p.accept !== 'empty';
  const det = determinism(p);

  // ---------- the machine ----------
  steps.push({
    title: 'The machine as a seven-tuple',
    explain: 'A PDA is a finite automaton with a stack. One move reads an input symbol (or nothing: an ε-move), looks at the TOP of the stack only, and replaces that top symbol by a string. The stack is written top first.',
    lines: [
      tupleStr(p),
      `start state ${p.start}; the stack starts as ${p.bottom} and nothing else (${p.bottom} marks the bottom)`,
      byFinal ? `acceptance by FINAL STATE: the input must be finished in a state of F = ${setStr(p.final)}; the stack may hold anything` : 'acceptance by EMPTY STACK: the input must be finished with the stack empty (bottom marker included); the state does not matter, so F = ∅',
      `δ has ${plural(p.transitions.length, 'transition')}: each one reads a symbol (or ε), looks at the top of the stack, and replaces it`
    ],
    table: [['transition', 'reads', 'top', 'what it does'], ...p.transitions.map(t => [transStr(t), t.read || EPS, t.pop, effect(t)])],
    graph: pdaToDot(p),
    highlight: [p.start],
    extra: {}
  });

  // ---------- determinism ----------
  const epsMoves = p.transitions.filter(t => t.read === '');
  steps.push({
    title: det.deterministic ? 'Deterministic: both rules hold' : 'Nondeterministic: a rule is broken',
    explain: 'Rule 1: at most one move for each (state, input symbol or ε, top of stack). Rule 2: if an ε-move is available at (state, top), there must be no reading move at that same (state, top). Rule 2 is the one people forget.',
    lines: [
      det.rule1.length
        ? `rule 1 ✗  ${det.rule1.map(ts => `δ(${ts[0].from}, ${ts[0].read || EPS}, ${ts[0].pop}) has ${ts.length} choices: ${ts.map(t => `(${t.to}, ${stackStr(t.push)})`).join(', ')}`).join(';  ')}`
        : 'rule 1 ✓  every δ(q, a, Z) has at most one element',
      det.rule2.length
        ? `rule 2 ✗  ${det.rule2.map(x => `${transStr(x.eps)} is an ε-move, but ${x.clash.map(transStr).join(' and ')} can also fire with ${x.eps.pop} on top`).join(';  ')}`
        : epsMoves.length
        ? `rule 2 ✓  where an ε-move exists, at ${[...new Set(epsMoves.map(t => `(${t.from}, ${t.pop})`))].join(', ')}, no reading move is defined`
        : 'rule 2 ✓  there are no ε-moves at all',
      det.deterministic ? 'so the machine never has a choice: every string has exactly one run' : 'so some configurations offer a choice. The machine accepts if SOME branch accepts'
    ],
    highlight: [],
    quiz: {
      question: 'Is this PDA deterministic?',
      answer: det.deterministic ? 'yes' : 'no',
      options: ['yes', 'no'],
      why: det.deterministic ? 'Both determinism rules hold.' : det.rule1.length ? 'Rule 1 fails: some δ(q, a, Z) has two elements.' : 'Rule 2 fails: an ε-move and a reading move are both possible on the same (state, top).'
    },
    extra: {}
  });

  // ---------- traces ----------
  const words = strings.length ? strings : defaultWords(p);
  const results = words.map(w => ({ w, res: search(p, w) }));
  const starIdx = results.findIndex(r => r.res.accepted && r.res.path.length > 1 && r.res.path.length - 1 <= 14);
  const tests = [];
  const checks = [];

  results.forEach(({ w, res }, wi) => {
    if (res.truncated && !res.accepted) checks.push({ ok: null, text: `The search for "${show(w)}" hit its size limit, so "rejected" is not certain.` });
    if (res.accepted) {
      const path = res.path;
      const n = path.length - 1;
      const summary = `${plural(n, 'move')} for ${plural(w.length, 'input symbol')}${n ? `: ${moveCount(path)}` : ''}`;
      const verdict = byFinal ? `input finished ✓   ${path[n].c.state} ∈ F ✓   →   ACCEPT` : 'input finished ✓   stack empty ✓   →   ACCEPT';
      if (wi === starIdx) {
        // one step per move: the stack column changes as you press Next
        path.forEach((x, k) => {
          if (k === 0) {
            steps.push({
              title: `Trace "${show(w)}": the start ID`,
              explain: `An ID is a complete snapshot: (state, unread input, stack). The run starts in ${p.start} with the whole input unread and only ${p.bottom} on the stack.`,
              lines: idLines(path.slice(0, 1), w),
              table: idTable(path.slice(0, 1), w),
              highlight_cells: [0, 1, 2].map(c => [1, c]),
              graph: pdaToDot(p),
              highlight: [x.c.state],
              quiz: {
                question: `How many moves will accepting "${show(w)}" take?`,
                answer: String(n),
                options: [...new Set([w.length, n - 1, n, n + 1].filter(v => v > 0).map(String))].sort((a, b) => a - b),
                why: `${summary}. The ε-moves are the ones people forget to count.`
              },
              extra: { stack: stackExtra(p, path.slice(0, 1), w) }
            });
            return;
          }
          const t = x.via;
          const prev = path[k - 1].c;
          const last = k === n;
          const closing = last && t.read === '';
          steps.push({
            title: `Move ${k}: ${t.read ? `read ${t.read}` : 'ε-move'}, ${effect(t)}`,
            explain:
              `In ${prev.state} with ${prev.stack[0]} on top${t.read ? ` and ${t.read} next in the input` : ', reading nothing'}: ${transStr(t)}. ` +
              (closing
                ? `This last ε-move is the acceptance test: it can only fire when the stack is back down to ${t.pop}. Leave it out and nothing is ever accepted.`
                : t.push.length === 0
                ? `The top symbol ${t.pop} is removed.`
                : t.push.length > 1
                ? 'The new symbols go on top, written to the LEFT of what was already there.'
                : ''),
            lines: [...idLines(path.slice(0, k + 1), w).slice(-2), ...(last ? [verdict, summary] : [])],
            table: idTable(path.slice(0, k + 1), w),
            highlight_cells: [0, 1, 2].map(c => [k + 1, c]),
            graph: pdaToDot(p),
            highlight: [x.c.state],
            extra: { stack: stackExtra(p, path.slice(0, k + 1), w, last ? 'ACCEPT' : '') }
          });
        });
      } else {
        steps.push({
          title: `Trace "${show(w)}": accepted`,
          explain: 'Every line is one move, justified by the transition written beside it.',
          lines: [...idLines(path, w), verdict, summary],
          table: idTable(path, w),
          highlight: [],
          quiz: { question: `Before you look: is "${show(w)}" accepted?`, answer: 'accepted', options: ['accepted', 'rejected'], why: verdict },
          extra: { stack: stackExtra(p, path, w, 'ACCEPT') }
        });
      }
      // a nondeterministic machine: also show a branch that dies
      const fb = det.deterministic ? null : failingBranch(p, w, path);
      if (fb) {
        steps.push({
          title: `"${show(w)}": a branch that gets STUCK`,
          explain: `At ${idStr(path[fb.at].c, w)} the machine has a choice. The accepting run takes ${transStr(fb.taken)}; this branch takes ${transStr(fb.alt)} instead, and dies. One surviving branch is enough to accept.`,
          lines: [...idLines(fb.path, w), `STUCK: ${fb.reason}`, 'this branch rejects, but the string is still accepted because another branch survives'],
          table: idTable(fb.path, w),
          highlight: [],
          extra: { stack: stackExtra(p, fb.path, w, 'STUCK') }
        });
      }
      tests.push({ input: w, path: `${idStr(path[0].c, w)} ⊢* ${idStr(path[n].c, w)}  (${plural(n, 'move')})`, accepted: true });
    } else {
      const path = res.stuck ? res.stuck.path : [{ c: startConfig(p), via: null }];
      const reason = res.stuck ? res.stuck.reason : 'no branch ever reaches an accepting configuration';
      steps.push({
        title: `Trace "${show(w)}": rejected`,
        explain: det.deterministic
          ? 'The machine has exactly one run on this string, and it does not end in an accepting configuration. A PDA need not have a move for every situation: missing transitions are how it rejects.'
          : 'Every branch fails; this is the one that gets furthest. Rejection by a nondeterministic machine means NO branch survives.',
        lines: [...idLines(path, w), `STUCK: ${reason}`, '→   REJECT'],
        table: idTable(path, w),
        highlight: [],
        quiz: { question: `Before you look: is "${show(w)}" accepted?`, answer: 'rejected', options: ['accepted', 'rejected'], why: `It gets stuck: ${reason}.` },
        extra: { stack: stackExtra(p, path, w, 'STUCK') }
      });
      tests.push({ input: w, path: `stuck at ${idStr(path[path.length - 1].c, w)}`, accepted: false });
    }
  });

  // The contract wants at least one rejected test: add the shortest one.
  if (!tests.some(t => !t.accepted)) {
    const rej = shortStrings(p.input, 5).find(w => !words.includes(w) && !search(p, w, { maxConfigs: 3000 }).accepted);
    if (rej !== undefined) {
      const r = search(p, rej);
      tests.push({ input: rej, path: r.stuck ? `stuck at ${idStr(r.stuck.path[r.stuck.path.length - 1].c, rej)}` : 'no accepting branch', accepted: false });
    }
  }

  const acc = tests.filter(t => t.accepted).map(t => show(t.input));
  const rej = tests.filter(t => !t.accepted).map(t => show(t.input));
  return {
    pda: p,
    checks,
    solution: {
      technique: 'pda',
      session: 'S20',
      input_summary: `PDA with ${plural(p.states.length, 'state')} and ${plural(p.transitions.length, 'transition')}, accepting by ${byFinal ? 'final state' : 'empty stack'}`,
      facts: notes.facts || autoFacts(p),
      facts_title: 'What each state and stack symbol means',
      formal: tupleStr(p),
      steps,
      tests,
      language: notes.language || '',
      conclusion: `${det.deterministic ? 'A deterministic' : 'A nondeterministic'} PDA accepting by ${byFinal ? 'final state' : 'empty stack'}. Accepted: ${acc.join(', ') || 'none'}. Rejected: ${rej.join(', ') || 'none'}.`
    }
  };
}

// What code can say about each state and stack symbol without understanding the language.
function autoFacts(p) {
  const uniq = arr => [...new Set(arr)].join(', ');
  const states = p.states.map(q => {
    const out = p.transitions.filter(t => t.from === q);
    const pushes = out.filter(t => t.push.length > 1).map(t => t.read || EPS);
    const pops = out.filter(t => t.push.length === 0).map(t => t.read || EPS);
    const parts = [pushes.length && `pushes on ${uniq(pushes)}`, pops.length && `pops on ${uniq(pops)}`].filter(Boolean);
    const role = q === p.start ? 'start state' : p.accept !== 'empty' && p.final.includes(q) ? 'accepting state' : 'state';
    return { item: q, meaning: `${role}${parts.length ? `: ${parts.join('; ')}` : out.length ? '' : ': no move leaves it'}` };
  });
  const symbols = p.stack.map(X => {
    const pushers = p.transitions.filter(t => (t.push[t.push.length - 1] === t.pop ? t.push.slice(0, -1) : t.push).includes(X)).map(t => t.read || EPS);
    return { item: X, meaning: X === p.bottom ? 'the bottom marker: seeing it on top means everything that was pushed has been matched' : `pushed on ${uniq(pushers) || 'no move'}, to be matched later` };
  });
  return [...states, ...symbols];
}

function shortStrings(alphabet, n) {
  const out = [''];
  let layer = [''];
  for (let len = 1; len <= n; len++) {
    layer = layer.flatMap(x => alphabet.map(a => x + a));
    out.push(...layer);
  }
  return out;
}

// No string given: a short accepted string (length ≥ 4 if there is one) and the shortest rejected one of length ≥ 2.
export function defaultWords(p) {
  const pool = shortStrings(p.input, p.input.length > 2 ? 4 : 6);
  const acc = pool.filter(w => search(p, w, { maxConfigs: 3000 }).accepted);
  const good = acc.find(w => w.length >= 4) ?? acc.find(w => w.length >= 2) ?? acc[0];
  const badW = pool.find(w => w.length >= 2 && !acc.includes(w)) ?? pool.find(w => !acc.includes(w));
  return [good, badW].filter(w => w !== undefined);
}
