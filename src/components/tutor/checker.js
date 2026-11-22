// "Check my answer": compare a student's attempt (read by the AI, copied exactly as
// written) with the correct solution computed by code. Finds the FIRST wrong step,
// explains it with the course's traps, and estimates marks like the model answers do.

import { EPS, EMPTY, setName, sortStates, epsClosure, accepts, reachableStates, isDfa, normalizeMachine } from './machine.js';
import { solveSubsetConstruction } from './techniques/subsetConstruction.js';
import { solveMooreMealy } from './techniques/mooreMealy.js';
import { checkRegex } from './checks.js';

// ---------- helpers ----------
const toArr = x => {
  if (Array.isArray(x)) return x.map(s => String(s).trim()).filter(s => s && s !== EMPTY && s !== '∅');
  const s = String(x ?? '').trim();
  if (!s || s === EMPTY || /^\{\s*\}$/.test(s) || /^(phi|empty|none)$/i.test(s)) return [];
  return s.replace(/^\{|\}$/g, '').split(',').map(t => t.trim()).filter(Boolean);
};
const nm = (x, order) => setName(sortStates(new Set(toArr(x)), order));
const half = x => Math.round(x * 2) / 2;
const show = w => (w === '' ? 'ε' : w);

function result(total, parts, mistakes, right, notChecked = []) {
  const score = half(parts.reduce((s, p) => s + p.got, 0));
  return { score, total, breakdown: parts, firstMistake: mistakes[0] || null, otherMistakes: mistakes.length - 1, right, notChecked };
}

// ---------- S04 subset construction ----------
// Marked with FOLLOW-THROUGH (error carried forward), like a human marker: each of the
// student's rows is judged on the student's own subset, so one early slip costs one entry,
// not every row that grew from it.
function checkSubset(m, st) {
  const order = m.states;
  const S = m.alphabet;
  const union = (set, a) => nm(set.flatMap(q => m.delta[q]?.[a] || []), order);
  const rows = (st.rows || []).map(r => ({ name: nm(r.subset, order), set: toArr(r.subset), moves: Object.fromEntries(S.map(a => [a, nm(r.moves?.[a], order)])) }));
  const mistakes = [];
  const right = [];
  let cells = 0;
  let good = 0;
  const start = setName([m.start]);
  if (!rows.some(r => r.name === start)) mistakes.push({ where: 'Start', yours: rows[0]?.name || 'no rows', correct: start, why: `The construction starts from the subset holding only the start state, ${start}.` });
  rows.forEach(r => S.forEach(a => {
    cells++;
    const correct = union(r.set, a);
    if (r.moves[a] === correct) return good++;
    mistakes.push({
      where: `${r.name} on ${a}`,
      yours: r.moves[a],
      correct,
      why: r.set.length ? `Take the union of every member's move: ${r.set.map(q => `δ(${q}, ${a}) = ${nm(m.delta[q]?.[a], order)}`).join(', ')}. Together that is ${correct}.` : '∅ has no states to move from, so it stays ∅.'
    });
  }));
  // every subset that appears must get its own row; rows nothing reaches should not be there
  const names = new Set(rows.map(r => r.name));
  const targets = new Set(rows.flatMap(r => S.map(a => r.moves[a])));
  const missing = [...targets].filter(t => !names.has(t));
  const reached = new Set([start]);
  for (let changed = true; changed; ) {
    changed = false;
    rows.forEach(r => reached.has(r.name) && S.forEach(a => !reached.has(r.moves[a]) && (reached.add(r.moves[a]), (changed = true))));
  }
  const extra = rows.map(r => r.name).filter(n => !reached.has(n));
  if (missing.length) mistakes.push({ where: 'Missing rows', yours: `no row for ${missing.join(', ')}`, correct: 'one row per subset that appears', why: `${missing.join(', ')} ${missing.length === 1 ? 'appears' : 'appear'} in your table, so ${missing.length === 1 ? 'it needs' : 'they need'} a row too.${missing.includes(EMPTY) ? ' ∅ is a real dead state.' : ''} Stop only when no new subset appears.` });
  if (extra.length) mistakes.push({ where: 'Extra rows', yours: extra.join(', '), correct: 'reachable subsets only', why: `Nothing in your table reaches ${extra.join(', ')} from ${start}. Build outward from the start only.` });
  if (!missing.length && !extra.length) right.push('Your table is complete and has reachable subsets only.');
  if (cells && good === cells) right.push(`Every one of your ${cells} table entries is correct.`);
  // accepting: judged on the student's own subsets
  const shouldAcc = rows.filter(r => r.set.some(q => m.final.includes(q))).map(r => r.name).sort().join(' ');
  const saidAcc = [...new Set((st.accepting || []).map(x => nm(x, order)))].sort().join(' ');
  const accOk = shouldAcc === saidAcc;
  if (accOk) right.push('Accepting subsets are marked correctly.');
  else mistakes.push({ where: 'Accepting subsets', yours: saidAcc || 'none', correct: shouldAcc || 'none', why: `A subset is accepting when it contains an NFA accepting state (F = ${setName(m.final)}).` });
  // did the slip change the final DFA? say so (marks already follow through)
  const dfa = solveSubsetConstruction(m).steps.at(-1).extra.machine;
  const sameTable = dfa.states.length === rows.length && dfa.states.every(n => rows.some(r => r.name === n));
  const notChecked = [];
  if (!sameTable && mistakes.length) notChecked.push(`Your later rows were marked on your own subsets (follow-through). The correct DFA has ${dfa.states.length} states: ${dfa.states.join(', ')}`);
  // order: the first mistake in the student's own order of work comes first
  return result(10, [
    { part: 'Subset table', max: 6, got: cells ? half((6 * good) / cells) : 0 },
    { part: 'Accepting subsets', max: 2, got: accOk ? 2 : 0 },
    { part: 'Complete, reachable subsets only', max: 2, got: missing.length || extra.length ? 0 : 2 }
  ], mistakes, right, notChecked);
}

// ---------- S03 minimisation ----------
// Table filling with witnesses, on the complete, reachable part of the DFA.
function equivalence(m) {
  const R = reachableStates(m);
  const S = m.alphabet;
  const t = (q, a) => m.delta[q][a]?.[0];
  const key = (p, q) => [p, q].sort().join('|');
  const wit = {};
  R.forEach((p, i) => R.slice(i + 1).forEach(q => {
    if (m.final.includes(p) !== m.final.includes(q)) wit[key(p, q)] = '';
  }));
  for (let changed = true; changed; ) {
    changed = false;
    R.forEach((p, i) => R.slice(i + 1).forEach(q => {
      if (key(p, q) in wit) return;
      for (const a of S) {
        const p2 = t(p, a);
        const q2 = t(q, a);
        if (p2 && q2 && p2 !== q2 && key(p2, q2) in wit) {
          wit[key(p, q)] = a + wit[key(p2, q2)];
          changed = true;
          return;
        }
        if (!p2 !== !q2) {
          wit[key(p, q)] = a;
          changed = true;
          return;
        }
      }
    }));
  }
  return { R, witness: (p, q) => wit[key(p, q)] };
}
const runFrom = (m, q, w) => {
  let cur = q;
  for (const ch of w) {
    cur = m.delta[cur]?.[ch]?.[0];
    if (!cur) return false;
  }
  return m.final.includes(cur);
};

function checkMinimise(m, st) {
  const { R, witness } = equivalence(m);
  const unreachable = m.states.filter(q => !R.includes(q));
  const classes = (st.classes || []).map(c => toArr(c));
  const where = {};
  classes.forEach((c, i) => c.forEach(q => (where[q] = i)));
  const mistakes = [];
  const right = [];
  const includedUnreach = unreachable.filter(q => q in where);
  if (includedUnreach.length) {
    mistakes.push({ where: 'Before the algorithm', yours: `kept ${includedUnreach.join(', ')}`, correct: `delete ${includedUnreach.join(', ')}`, why: `${includedUnreach.join(', ')} ${includedUnreach.length === 1 ? 'is' : 'are'} unreachable from ${m.start}. Remove unreachable states first, or the result may not be minimal.` });
  } else right.push(unreachable.length ? `You removed the unreachable state${unreachable.length > 1 ? 's' : ''} ${unreachable.join(', ')}.` : 'Reachability is fine (there were no unreachable states).');
  const missing = R.filter(q => !(q in where));
  if (missing.length) mistakes.push({ where: 'Your classes', yours: `${missing.join(', ')} missing`, correct: 'every reachable state in some class', why: 'Every reachable state must end up in exactly one block.' });
  let pairs = 0;
  let good = 0;
  R.forEach((p, i) => R.slice(i + 1).forEach(q => {
    if (!(p in where) || !(q in where)) return;
    pairs++;
    const w = witness(p, q);
    const together = where[p] === where[q];
    if (w === undefined && together) good++;
    else if (w !== undefined && !together) good++;
    else if (together) {
      mistakes.push({ where: `Merging ${p} and ${q}`, yours: 'same class', correct: 'different classes', why: `The string "${show(w)}" tells them apart: from ${p} it is ${runFrom(m, p, w) ? 'accepted' : 'rejected'}, from ${q} it is ${runFrom(m, q, w) ? 'accepted' : 'rejected'}.` });
    } else {
      mistakes.push({ where: `${p} and ${q}`, yours: 'different classes', correct: 'merged', why: `No string tells ${p} and ${q} apart: they lead to the same blocks on every symbol, so they are equivalent and must be merged.` });
    }
  }));
  if (pairs && good === pairs) right.push('Your classes are exactly the minimal ones.');
  return result(10, [
    { part: 'Classes (which states merge)', max: 8, got: pairs ? half((8 * good) / pairs) : 0 },
    { part: 'Unreachable states removed first', max: 2, got: includedUnreach.length ? 0 : 2 }
  ], mistakes, right);
}

// ---------- S05 / S06 ----------
function closuresOf(m) {
  return Object.fromEntries(m.states.map(q => [q, sortStates(epsClosure(m, [q]), m.states)]));
}
function checkClosures(m, st, mistakes, right) {
  const cl = closuresOf(m);
  let good = 0;
  m.states.forEach(q => {
    const yours = nm(st.closures?.[q], m.states);
    const correct = setName(cl[q]);
    if (yours === correct) return good++;
    const y = toArr(st.closures?.[q]);
    const why = !y.includes(q)
      ? `ε-CL(${q}) always contains ${q} itself (zero ε-moves).`
      : `Follow the ε-arrows from ${q} to the end of every chain: ${correct}.`;
    mistakes.push({ where: `ε-CL(${q})`, yours, correct, why });
  });
  if (good === m.states.length) right.push('All closures are correct.');
  return { good, total: m.states.length, cl };
}

function checkEpsClosure(m, st) {
  const mistakes = [];
  const right = [];
  const { good, total } = checkClosures(m, st, mistakes, right);
  return result(10, [{ part: 'Closure table', max: 10, got: half((10 * good) / total) }], mistakes, right);
}

function checkEpsRemoval(m, st) {
  const mistakes = [];
  const right = [];
  const S = m.alphabet.filter(a => a !== EPS);
  const c = checkClosures(m, st, mistakes, right);
  const cl = c.cl;
  const close = set => sortStates(new Set(set.flatMap(q => cl[q])), m.states);
  const move = (set, a) => sortStates(new Set(set.flatMap(q => m.delta[q][a] || [])), m.states);
  let good = 0;
  let total = 0;
  m.states.forEach(q => S.forEach(a => {
    total++;
    const mv = move(cl[q], a);
    const correct = setName(close(mv));
    const yours = nm(st.delta?.[q]?.[a], m.states);
    if (yours === correct) return good++;
    const why =
      yours === setName(mv)
        ? `You forgot to close AFTER the move: δ′(${q},${a}) = ε-CL(δ(${setName(cl[q])}, ${a})) = ε-CL(${setName(mv)}) = ${correct}.`
        : yours === setName(close(move([q], a)))
        ? `You forgot to close BEFORE the move: start from ε-CL(${q}) = ${setName(cl[q])}, not just ${q}.`
        : `Close, move, close: ε-CL(δ(${setName(cl[q])}, ${a})) = ε-CL(${setName(mv)}) = ${correct}.`;
    mistakes.push({ where: `δ′(${q},${a})`, yours, correct, why });
  }));
  if (good === total) right.push(`All ${total} δ′ entries are correct.`);
  const hit = cl[m.start].some(q => m.final.includes(q));
  const Fp = setName(sortStates(new Set([...m.final, ...(hit ? [m.start] : [])]), m.states));
  const yourF = nm(st.final, m.states);
  const fOk = yourF === Fp;
  if (fOk) right.push(`F′ = ${Fp} is right${hit && !m.final.includes(m.start) ? ', including the q0 patch' : ''}.`);
  else {
    const y = toArr(st.final);
    const why =
      hit && !y.includes(m.start)
        ? `ε-CL(${m.start}) = ${setName(cl[m.start])} contains an accepting state, so ${m.start} must join F′. Without it the machines disagree on ε.`
        : y.some(q => q !== m.start && !m.final.includes(q))
        ? `Only ${m.start} can be added to F (and only when its closure meets F). δ′ already closes after every move, so no other state needs adding.`
        : `F′ = F, plus ${m.start} if ε-CL(${m.start}) contains an accepting state.`;
    mistakes.push({ where: 'F′', yours: yourF, correct: Fp, why });
  }
  return result(10, [
    { part: 'Closure table', max: 3, got: half((3 * c.good) / c.total) },
    { part: 'δ′ entries', max: 5, got: half((5 * good) / total) },
    { part: 'F′', max: 2, got: fOk ? 2 : 0 }
  ], mistakes, right);
}

// ---------- S01 traces ----------
function checkTrace(m, st) {
  const traces = st.traces || [];
  const mistakes = [];
  const right = [];
  let good = 0;
  traces.forEach(t => {
    const w = String(t.input ?? '').replace(/^ε$/, '');
    const ok = accepts(m, w);
    if (Boolean(t.accepted) === ok) return good++;
    mistakes.push({ where: `"${show(w)}"`, yours: t.accepted ? 'accepted' : 'rejected', correct: ok ? 'accepted' : 'rejected', why: w === '' ? `ε makes zero moves, so it is accepted exactly when ${m.start} ∈ F.` : `Trace it one move per line; acceptance is decided only after the whole string is read.` });
  });
  if (traces.length && good === traces.length) right.push('Every verdict is correct.');
  return result(10, [{ part: 'Verdicts', max: 10, got: traces.length ? half((10 * good) / traces.length) : 0 }], mistakes, right);
}

// ---------- S02 design ----------
function checkDesign(st, languageRegex) {
  const mistakes = [];
  const right = [];
  let m;
  try {
    m = normalizeMachine(st.machine);
  } catch (e) {
    return result(10, [], [{ where: 'Your machine', yours: 'unreadable', correct: 'a complete DFA', why: e.message }], []);
  }
  const missing = m.states.flatMap(q => m.alphabet.filter(a => !(m.delta[q][a] || []).length).map(a => `δ(${q}, ${a})`));
  if (missing.length) mistakes.push({ where: 'Completeness', yours: `${missing.join(', ')} missing`, correct: `|Q|×|Σ| = ${m.states.length * m.alphabet.length} arrows`, why: 'A DFA needs exactly one arrow per state per symbol. Send missing arrows to a dead state.' });
  else right.push(`Complete: |Q|×|Σ| = ${m.states.length}×${m.alphabet.length} = ${m.states.length * m.alphabet.length} arrows.`);
  const det = isDfa(m);
  if (!det) mistakes.push({ where: 'Determinism', yours: 'two arrows on one symbol', correct: 'exactly one', why: 'In a DFA every state has exactly one arrow per symbol.' });
  else right.push('Deterministic.');
  const rc = languageRegex ? checkRegex(String(languageRegex), m) : null;
  const notChecked = [];
  if (!rc) notChecked.push('whether the machine recognises exactly the language (I could not read the language precisely)');
  else if (rc.ok) right.push('It recognises exactly the language asked for.');
  else mistakes.unshift({ where: 'The language', yours: 'your machine', correct: 'the language in the question', why: rc.text.replace(/^The regex .*? is wrong on/, 'They disagree on').replace('but the regex does not match it', 'but it is NOT in the language').replace('but the regex matches it', 'but it IS in the language') });
  return result(10, [
    { part: 'Recognises the right language', max: 6, got: rc ? (rc.ok ? 6 : 0) : 0 },
    { part: 'Complete', max: 2, got: missing.length ? 0 : 2 },
    { part: 'Deterministic', max: 2, got: det ? 2 : 0 }
  ], mistakes, right, notChecked);
}

// ---------- S07 ----------
function checkMoore(M, st) {
  const runs = st.runs || [];
  const mistakes = [];
  const right = [];
  let good = 0;
  runs.forEach(r => {
    const w = String(r.input ?? '');
    const sol = solveMooreMealy(M, [w]);
    const correct = (M.type === 'moore' ? sol.tests[0].path.replace('Moore: ', '') : sol.tests[0].output.replace('Mealy: ', '')).replace(/\s+/g, '');
    const yours = String(r.output ?? '').replace(/\s+/g, '');
    if (yours === correct) return good++;
    mistakes.push({
      where: `Output on "${show(w)}"`,
      yours,
      correct,
      why: M.type === 'moore' && yours.length === w.length ? `A Moore machine prints λ(${M.start}) before reading anything, so the output has |w| + 1 = ${w.length + 1} symbols.` : 'Write one move per line and print the output of each state (Moore) or arrow (Mealy).'
    });
  });
  if (runs.length && good === runs.length) right.push('Every output is correct.');
  return result(10, [{ part: 'Outputs', max: 10, got: runs.length ? half((10 * good) / runs.length) : 0 }], mistakes, right);
}

// ---------- entry point ----------
export function checkStudent({ technique, machine, transducer, student, languageRegex }) {
  const st = student || {};
  if (technique === 'subset_construction') return checkSubset(machine, st);
  if (technique && technique.startsWith('min')) return checkMinimise(machine, st);
  if (technique === 'eps_closure') return checkEpsClosure(machine, st);
  if (technique === 'eps_removal') return checkEpsRemoval(machine, st);
  if (technique === 'dfa_trace') return checkTrace(machine, st);
  if (technique === 'dfa_design') return checkDesign(st, languageRegex);
  if (technique === 'moore_mealy') return checkMoore(transducer, st);
  throw new Error("I can't check that kind of answer yet.");
}
