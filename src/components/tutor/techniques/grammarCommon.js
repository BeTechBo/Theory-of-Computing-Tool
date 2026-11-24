// Pieces shared by the S17–S19 grammar techniques: the grammar diff (the renderer colours it),
// tables, test strings, "what each variable generates", and the worked lines of the three
// clean-up steps that S18 and S19 both use.

import {
  EPS, isVar, rhsStr, ruleStr, rulesOf, sameRule, setStr, grammarLines, isUnit,
  generating, reachable, removeNonGenerating, removeUnreachable, removeEpsilon, removeUnits,
  languageUpTo, affordableLength, members, allStrings, sameLanguage, derives, shortestTree, derivation, derivationText
} from '../grammar.js';

export const show = w => (w === '' ? EPS : w);
export const oneLine = g => grammarLines(g).join('   ') || '(no productions)';
export const grammarTable = g => [['variable', 'productions'], ...g.variables.filter(A => rulesOf(g, A).length).map(A => [`${A === g.start ? '→ ' : ''}${A}`, rulesOf(g, A).map(r => rhsStr(r.rhs)).join(' | ')])];

// extra.diff: one row per variable; every alternative is "same", "removed" or "added".
export function grammarDiff(before, after, note = '') {
  const order = [...after.variables];
  before.variables.forEach((v, i) => {
    if (!order.includes(v)) order.splice(i ? order.indexOf(before.variables[i - 1]) + 1 : 0, 0, v);
  });
  const rows = order
    .map(A => {
      const b = rulesOf(before, A);
      const a = rulesOf(after, A);
      const alts = [
        ...b.map(r => ({ text: rhsStr(r.rhs), status: a.some(x => sameRule(x, r)) ? 'same' : 'removed' })),
        ...a.filter(r => !b.some(x => sameRule(x, r))).map(r => ({ text: rhsStr(r.rhs), status: 'added' }))
      ];
      return alts.length ? { lhs: A, alts, status: !after.variables.includes(A) ? 'removed' : !before.variables.includes(A) ? 'added' : 'same' } : null;
    })
    .filter(Boolean);
  return { rows, before: before.rules.length, after: after.rules.length, changed: rows.some(r => r.alts.some(a => a.status !== 'same')), note };
}

// "What each variable generates": the shortest strings each one derives (code can list them;
// the plain-English meaning comes from the preset notes or the AI).
export function variableFacts(g, notes = {}) {
  if (notes.facts) return notes.facts;
  const N = Math.min(6, Math.max(2, affordableLength(g, 2500)));
  const L = languageUpTo(g, N, 30000);
  return g.variables.map(A => {
    const all = [...L[A]].sort((x, y) => x.length - y.length || x.localeCompare(y));
    return { item: A, meaning: all.length ? `derives ${all.slice(0, 5).map(show).join(', ')}${all.length > 5 ? ', …' : ''}` : 'derives no terminal string at all (useless)' };
  });
}

// Short members and non-members of L(G), for the tests at the end.
export function sampleStrings(g, want = 3) {
  const N = Math.min(8, Math.max(2, affordableLength(g, 3000)));
  const all = members(g, N);
  const set = new Set(all);
  const inL = all.slice(0, want);
  const longer = all.find(w => w.length >= 4 && !inL.includes(w));
  if (longer) inL.push(longer);
  const outL = allStrings(g.terminals, Math.min(N, 4), 600).filter(w => !set.has(w)).slice(0, 2);
  return { inL, outL, all, N };
}

export function testsFor(g, strings) {
  return strings.map(w => {
    const tree = [...w].every(ch => g.terminals.includes(ch)) ? shortestTree(g, w) : null;
    if (!tree) return { input: w, path: derives(g, w) ? 'derivable' : 'no derivation tree has this yield', accepted: derives(g, w) };
    const text = derivationText(derivation(tree));
    return { input: w, path: text.length > 90 ? `${text.slice(0, 88)}…` : text, accepted: true };
  });
}
export function defaultTests(g) {
  const s = sampleStrings(g);
  return testsFor(g, [...s.inL, ...s.outL]);
}
export const languageLine = (g, notes = {}) => {
  if (notes.language) return notes.language;
  const s = sampleStrings(g, 6);
  return s.all.length ? `The shortest strings of L(G) are ${s.all.slice(0, 7).map(show).join(', ')}${s.all.length > 7 ? ', …' : ''}` : 'L(G) = ∅: the grammar derives no terminal string.';
};

// The check every transformation ends with: both grammars on every string up to a bound.
export function languageCheck(before, after, { minusEps = false, what = 'The new grammar' } = {}) {
  const r = sameLanguage(before, after, { minusEps });
  const scope = `every string of length ≤ ${r.N} (${r.count} ${r.count === 1 ? 'string' : 'strings'} of the language)`;
  if (r.ok) return { ok: true, N: r.N, text: `${what} generates exactly ${minusEps ? 'L(G) − {ε}' : 'L(G)'}: compared on ${scope}.`, line: `L unchanged${minusEps ? ' except for ε' : ''}: compared on ${scope} ✓` };
  const w = r.onlyFirst !== undefined ? r.onlyFirst : r.onlySecond;
  const text = `${what} does NOT generate the same language: "${show(w)}" is ${r.onlyFirst !== undefined ? 'lost' : 'new'}.`;
  return { ok: false, N: r.N, text, line: `✗ ${text}` };
}

// ---------- worked lines for the clean-up steps ----------

// Steps 1a + 1b (and step 4): returns { grammar, lines, changed, gen, reach }.
export function uselessLines(g) {
  const lines = [];
  const a = removeNonGenerating(g);
  a.rounds.forEach((round, i) => lines.push(`generating, round ${i + 1}: ${round.map(x => `${x.v} (${ruleStr(x.rule)})`).join('   ')}`));
  lines.push(`generating, round ${a.rounds.length + 1}: nothing new → stop`);
  const lostRules = g.rules.filter(r => !a.grammar.rules.some(o => sameRule(o, r)));
  if (a.removed.length) lines.push(`not generating: ${a.removed.join(', ')}  →  delete ${a.removed.length === 1 ? 'it' : 'them'} and every production that mentions ${a.removed.length === 1 ? 'it' : 'them'}: ${lostRules.map(ruleStr).join(', ')}`);
  else lines.push(`not generating: none, so all ${g.variables.length} variables survive`);

  const b = removeUnreachable(a.grammar);
  lines.push(`reachable, round 0: ${a.grammar.start}`);
  b.rounds.forEach((round, i) => {
    const byRule = new Map();
    round.forEach(x => byRule.set(x.rule, [...(byRule.get(x.rule) || []), x.sym]));
    lines.push(`reachable, round ${i + 1}: ${[...byRule].map(([rule, syms]) => `${ruleStr(rule)} reaches ${syms.join(', ')}`).join('   ')}`);
  });
  if (b.removed.length) lines.push(`unreachable from ${g.start}: ${b.removed.join(', ')}  →  delete ${b.removed.length === 1 ? 'it' : 'them'} with ${b.removed.length === 1 ? 'its' : 'their'} productions`);
  else lines.push(`unreachable from ${g.start}: none`);
  if (b.removedTerminals.length) lines.push(`the terminal ${b.removedTerminals.join(', ')} appears in no surviving production (a useless terminal): T shrinks to ${setStr(b.grammar.terminals)}`);
  return { grammar: b.grammar, lines, changed: a.removed.length + b.removed.length + b.removedTerminals.length > 0, nonGenerating: a.removed, unreachable: b.removed, afterGen: a.grammar };
}

// Step 2: nullable variables and the expansions. Returns { grammar, lines, changed, nullable, epsInLanguage, madeUnits }.
export function epsilonLines(g) {
  const res = removeEpsilon(g);
  const nul = [...res.set];
  const lines = [];
  if (!nul.length) {
    lines.push('nullable variables: none (no production has ε on the right), so nothing changes');
    return { grammar: g, lines, changed: false, nullable: nul, epsInLanguage: false, madeUnits: [] };
  }
  res.rounds.forEach((round, i) => lines.push(`nullable, round ${i + 1}: ${round.map(x => `${x.v} (${ruleStr(x.rule)})`).join('   ')}`));
  const not = g.variables.filter(A => !res.set.has(A));
  lines.push(`nullable = ${setStr(nul)}${not.length ? `   (not nullable: ${not.join(', ')})` : ''}`);
  res.detail.forEach(d => {
    if (d.deleted) lines.push(`${ruleStr(d.rule)} is deleted`);
    else if (d.nullableCount > 0 && d.variants.length > 1) {
      const k = d.nullableCount;
      const note = k < 2 ? '' : k === d.rule.rhs.length ? `   (all ${k} symbols are nullable: 2^${k} − 1 = ${2 ** k - 1} combinations, never all dropped)` : `   (${k} nullable symbols, each kept or dropped: 2^${k} = ${2 ** k} combinations)`;
      lines.push(`${ruleStr(d.rule)} gives ${d.rule.lhs} → ${d.variants.map(rhsStr).join(' | ')}${note}`);
    } else if (d.nullableCount > 0) lines.push(`${ruleStr(d.rule)} stays as it is: dropping its only symbol would create a new ε-production`);
  });
  const untouched = res.detail.filter(d => !d.deleted && d.nullableCount === 0).length;
  if (untouched) lines.push(`the other ${untouched} ${untouched === 1 ? 'production has' : 'productions have'} no nullable symbol and ${untouched === 1 ? 'stays' : 'stay'} unchanged`);
  lines.push(res.epsInLanguage ? `${g.start} is nullable, so ε ∈ L(G): from here on the grammar generates L(G) − {ε}` : `${g.start} is not nullable, so ε ∉ L(G): the language is unchanged`);
  const madeUnits = res.grammar.rules.filter(r => isUnit(res.grammar, r) && !g.rules.some(o => sameRule(o, r)));
  if (madeUnits.length) lines.push(`careful: this step CREATED the unit ${madeUnits.length === 1 ? 'production' : 'productions'} ${madeUnits.map(ruleStr).join(', ')}. Step 3 must re-read the whole grammar`);
  return { grammar: res.grammar, lines, changed: true, nullable: nul, epsInLanguage: res.epsInLanguage, madeUnits };
}

// Step 3: unit productions, with their chains. Returns { grammar, lines, changed, units }.
export function unitLines(g, madeBefore = []) {
  const res = removeUnits(g);
  const lines = [];
  if (!res.units.length) {
    lines.push('unit productions: none (no right-hand side is a single variable), so nothing changes');
    return { grammar: g, lines, changed: false, units: [] };
  }
  lines.push(`unit productions in the current grammar: ${res.units.map(r => `${ruleStr(r)}${madeBefore.some(o => sameRule(o, r)) ? ' (created by step 2)' : ''}`).join(',  ')}`);
  res.detail.forEach(d => {
    if (d.self) return void lines.push(`${d.A} → ${d.A} adds nothing new and simply disappears`);
    const chain = d.chain.join(' ⇒ ');
    const own = rulesOf(g, d.B).filter(r => !isUnit(g, r)).map(r => rhsStr(r.rhs));
    if (!own.length) lines.push(`chain ${chain}: ${d.B} has no non-unit production of its own, so nothing is copied from it`);
    else if (!d.fresh.length) lines.push(`chain ${chain}: ${d.B}'s non-unit productions are ${own.join(' | ')}, which ${d.A} already has`);
    else lines.push(`chain ${chain}: ${d.B}'s non-unit productions are ${own.join(' | ')}  →  add ${d.A} → ${d.fresh.map(r => rhsStr(r.rhs)).join(' | ')}`);
  });
  lines.push(`then delete the unit productions themselves`);
  return { grammar: res.grammar, lines, changed: true, units: res.units };
}

export const propertyLine = g => {
  const u = uselessLines(g);
  const eps = g.rules.filter(r => !r.rhs.length);
  const units = g.rules.filter(r => isUnit(g, r));
  return {
    ok: !u.changed && !eps.length && !units.length,
    line: `no useless symbols ${u.changed ? '✗' : '✓'} · no ε-productions ${eps.length ? '✗' : '✓'} · no unit productions ${units.length ? '✗' : '✓'}`
  };
};
export { generating, reachable, isVar };
