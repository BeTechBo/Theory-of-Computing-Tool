// How Stately answers messages about grammars and pushdown automata (S17–S21, Noor).
// Same idea as brain.js: CODE solves, the AI only reads free text and writes the meanings.
//   1. a PDA typed as transitions            → trace it (S20)
//   2. a grammar typed as productions        → derive / ambiguity / simplify / CNF / GNF / PDA,
//                                               chosen from the student's own words
//   3. a command about the grammar or PDA already in the chat ("simplify it", "now CNF",
//      "test aabb", "is it ambiguous?")
//   4. the AI analyzer hands back a grammar or a PDA (free text, a picture, "design a …")
// Returns null when the message is not about a grammar or a PDA, so brain.js carries on.

import { parseGrammar, hasProductions, firstRuleAt, grammarText, derives, nullable, VAR } from '../tutor/grammar.js';
import { parsePda, looksLikePda, normalizePda, wordList, pdaText, search } from '../tutor/pdaMachine.js';
import { solveCfg, solveGrammarDesign, solveMachineToGrammar } from '../tutor/techniques/cfgDerivation.js';
import { solveAmbiguity } from '../tutor/techniques/ambiguity.js';
import { solveSimplify } from '../tutor/techniques/simplify.js';
import { solveCnf, solveGnf } from '../tutor/techniques/normalForms.js';
import { solvePda } from '../tutor/techniques/pdaTrace.js';
import { solveCfgToPda } from '../tutor/techniques/cfgToPda.js';
import { sampleStrings } from '../tutor/techniques/grammarCommon.js';
import { grammarNotes, pdaNotes } from '../tutor/grammarPresets.js';
import { GRAMMAR_READY_ANSWERS } from './suggestionsGrammar.js';

export const GRAMMAR_TECHNIQUES = ['cfg', 'ambiguity', 'simplification', 'cnf_gnf', 'pda', 'cfg_to_pda'];

const bot = (text, extra = {}) => ({ role: 'bot', kind: 'text', text, mood: 'idle', ...extra });
const show = w => (w === '' ? 'ε' : w);
const GRAMMAR_FORMAT = 'S → aSb | ε\nA → aA | a';
const PDA_FORMAT = 'δ(q0, a, Z) = (q0, XZ)\nδ(q0, b, X) = (q1, ε)\nδ(q1, ε, Z) = (q2, Z)\nfinal: q2\nstrings: aabb, abab';

const INTRO = {
  cfg: "Here's the grammar as a **four-tuple**, its type, and the **leftmost derivation** with the production named at every step. Press **Next** to watch the tree grow.",
  ambiguity: "Let's look for the **shortest string with two different trees**, draw both, and then repair the grammar.",
  simplification: "Here's the **simplification**, in the course's fixed order: 1a, 1b, 2, 3, 4. The grammar is written out again after every step.",
  cnf: "Here's the conversion to **Chomsky normal form**, one step at a time: new start symbol, ε-productions, unit productions, 4a terminals, 4b long right-hand sides.",
  gnf: "Here's the conversion to **Greibach normal form**: clean up, order the variables, remove left recursion, back-substitute.",
  pda: "Here's the PDA as a **seven-tuple**, then the trace as IDs, one ⊢ per line. Press **Next** and watch the stack.",
  cfg_to_pda: "Here's the **three-rule construction** (start, expand, match, accept), then the machine run with the sentential form beside every ID.",
  machine_grammar: "Here's **Theorem 1**, five steps: states become variables, arrows become productions, and arrows into accepting states also stop."
};

// ---------- what the student asked for, from their own words (works without the AI) ----------
export function grammarTechnique(words) {
  const t = ` ${String(words || '').toLowerCase()} `;
  if (/greibach|\bgnf\b|left[- ]recursi/.test(t)) return 'gnf';
  if (/chomsky|\bcnf\b|normal form/.test(t)) return 'cnf';
  if (/\bpda\b|pushdown|push-down|stack machine|\bautomaton\b|\bmachine\b/.test(t)) return 'cfg_to_pda';
  if (/ambigu|two (different |distinct )?(parse |derivation )?trees|precedence/.test(t)) return 'ambiguity';
  if (/simplif|clean ?up|useless|unit[- ]production|nullable|(ε|eps|epsilon|lambda)[- ]production|(remove|eliminate|get rid of) (the |all )?(ε|eps|epsilon|unit|useless)|\breduce\b/.test(t)) return 'simplification';
  if (/deriv|leftmost|rightmost|parse|\btree\b|generat|\btype\b|linear|regular|\btrace\b|\btest\b|member|\bin l\b|∈/.test(t)) return 'cfg';
  return null;
}
const wantsLinz = words => /linz|no (new )?s0|without (a |the )?(new )?start|skip step 1/i.test(words || '');
const wantsGrammar = words => /grammar|right[- ]linear|productions?\b/i.test(words || '');

// ---------- reading the message ----------
const STRINGS_LINE = /^\s*(strings?|tests?|inputs?|words?|derive|trace)\s*[:=]\s*(.*)$/i;
const DECL_LINE = new RegExp(`^\\s*(G\\d*['′]?\\s*=\\s*\\(|[VNTΣ]\\s*=\\s*\\{|start(?: symbol)?\\s*[:=]\\s*${VAR}\\s*$)`, 'i');
const INLINE_P = new RegExp(`\\{\\s*${VAR}\\s*(?:→|⟶|-->|->|::=)[^{}]*\\}`);

// Split a message into the productions, the words around them, and any test strings.
function splitGrammarInput(text) {
  const words = [];
  const rules = [];
  const strings = [];
  text.split('\n').forEach(line => {
    const sm = line.match(STRINGS_LINE);
    if (sm) {
      strings.push(...wordList(sm[2]));
      words.push(sm[1]);
      return;
    }
    if (DECL_LINE.test(line) || INLINE_P.test(line) || (/^\s*\|/.test(line) && rules.length)) return void rules.push(line);
    const at = firstRuleAt(line);
    if (at < 0) return void words.push(line);
    words.push(line.slice(0, at));
    // words after the last production ("… to CNF", "…, derive aabb") are not part of it
    let rule = line.slice(at);
    const tail = rule.match(/\s+(?:to|into|in|using|by|for|then|please|with|as|from)\s+[^|→]*[a-zA-Z]{3,}[^|→]*$|[,;.]\s*(?=[a-z]{3,}\b)[^|→]*$/);
    if (tail && !new RegExp(`${VAR}\\s*(?:→|->|::=)`).test(tail[0])) {
      words.push(tail[0]);
      rule = rule.slice(0, tail.index);
    }
    rules.push(rule);
  });
  return { words: words.join(' ').replace(/\s+/g, ' ').trim(), rules: rules.join('\n'), strings };
}

// Test strings mentioned in a sentence: "derive aabb", "test ab, ba and ε", "is abba in L(G)?"
export function stringsFromWords(words, alphabet) {
  const ok = tok => tok === 'ε' || /^(eps|epsilon|lambda|λ)$/i.test(tok) || (tok.length > 0 && [...tok].every(ch => alphabet.includes(ch)));
  const clean = tok => tok.replace(/^["'“(]+|["'”).?!]+$/g, '');
  const out = [];
  const toks = words.split(/[\s,;]+/).filter(Boolean);
  const KEY = /^(derive|derives|deriving|derivation|derivations|test|trace|run|try|check|parse|generate|generates|string|strings|accept|accepts|tree|trees|input|on)$/i;
  const FILL = /^(of|for|the|string|strings|and|or|leftmost|rightmost|derivation|tree|parse|word|words|input|inputs)$/i;
  for (let i = 0; i < toks.length; i++) {
    if (!KEY.test(clean(toks[i]))) continue;
    for (let j = i + 1; j < toks.length; j++) {
      const t = clean(toks[j]);
      if (!t) continue;
      if (/^(a|an)$/i.test(t)) {
        // "derive a" is the string a; "derive a string" is the article
        const nx = clean(toks[j + 1] || '');
        if (ok(t) && (!nx || /^(and|or)$/i.test(nx) || ok(nx))) out.push(t);
        continue;
      }
      if (FILL.test(t)) continue;
      if (!ok(t)) break;
      out.push(t);
    }
  }
  const member = words.match(/\bis\s+(\S+)\s+(?:in\b|∈|generated|derivable|accepted|a member)/i);
  if (member && ok(clean(member[1]))) out.push(clean(member[1]));
  return [...new Set(out.map(t => (t === 'ε' || /^(eps|epsilon|lambda|λ)$/i.test(t) ? '' : t)))];
}

// ---------- building the chat messages ----------
const CHIPS = {
  ambiguous: { label: '🌳 Is it ambiguous?', say: 'Is it ambiguous?' },
  simplify: { label: '🧹 Simplify it', say: 'Simplify it' },
  cnf: { label: '📐 Convert to CNF', say: 'Convert it to Chomsky normal form' },
  gnf: { label: '📏 Greibach instead', say: 'Convert it to Greibach normal form' },
  linz: { label: '↩️ Linz form (no S0)', say: 'Convert it to CNF in the Linz form' },
  pda: { label: '🥞 Turn it into a PDA', say: 'Convert it to a PDA' },
  derive: { label: '✍️ Derive a string', say: 'Derive a string' }
};

function solutionMessage(technique, out, intro, next = [], explainKind = null) {
  const allGood = out.checks.every(c => c.ok !== false);
  const msg = { role: 'bot', kind: 'solution', text: intro, solution: out.solution, checks: out.checks, mood: allGood ? 'happy' : 'sad', celebrate: allGood, technique, next };
  if (explainKind) Object.assign(msg, { needsExplain: true, explainKind, explainData: explainData(explainKind, out) });
  return msg;
}

// What the AI explainer gets: the object as text, the names it must describe, and strings
// that code knows to be in / out of the language.
function explainData(kind, out) {
  if (kind === 'pda') {
    const p = out.pda;
    return { subject: 'pda', text: pdaText(p), items: [...p.states, ...p.stack], accepted: out.solution.tests.filter(t => t.accepted).map(t => t.input), rejected: out.solution.tests.filter(t => !t.accepted).map(t => t.input) };
  }
  const g = out.source || out.grammar;
  const s = sampleStrings(g, 8);
  return { subject: 'grammar', text: grammarText(g), items: g.variables, accepted: s.all.slice(0, 12), rejected: s.outL };
}

// Run one technique on a grammar. Returns { msgs, subject }.
export function solveGrammar(tech, g, { strings = [], words = '', notes = null, original = null, readBack = '', proposal = null } = {}) {
  const n = notes || grammarNotes(g);
  const explain = Object.keys(n).length ? null : 'grammar';
  const subject = (grammar, last) => ({ kind: 'grammar', grammar, last, original: original || g });
  const wrap = (technique, out, intro, next, keep, ex = explain) => {
    out.source = g;
    return { msgs: [solutionMessage(technique, out, `${readBack}${intro}`, next, ex)], subject: subject(keep, technique === 'cfg_to_pda' ? 'cfg_to_pda' : 'cfg') };
  };
  if (tech === 'cfg') return wrap('cfg', solveCfg(g, strings, n), INTRO.cfg, [CHIPS.ambiguous, CHIPS.simplify, CHIPS.cnf, CHIPS.pda], g);
  if (tech === 'ambiguity') {
    const out = solveAmbiguity(g, n, proposal);
    return wrap('ambiguity', out, INTRO.ambiguity, [CHIPS.simplify, CHIPS.cnf, CHIPS.pda], out.grammar);
  }
  if (tech === 'simplification') {
    const out = solveSimplify(g, n);
    return wrap('simplification', out, INTRO.simplification, [CHIPS.cnf, CHIPS.pda, CHIPS.derive], out.grammar);
  }
  if (tech === 'cnf') {
    const linz = wantsLinz(words);
    const out = solveCnf(g, n, { linz });
    const addedStart = out.grammar.start !== g.start;
    return wrap('cnf_gnf', out, INTRO.cnf, [CHIPS.pda, ...(addedStart && !nullable(g).set.has(g.start) ? [CHIPS.linz] : []), CHIPS.gnf], out.grammar);
  }
  if (tech === 'gnf') {
    const out = solveGnf(g, n);
    return wrap('cnf_gnf', out, INTRO.gnf, [CHIPS.pda, CHIPS.derive], out.grammar);
  }
  if (tech === 'cfg_to_pda') return wrap('cfg_to_pda', solveCfgToPda(g, strings, n), INTRO.cfg_to_pda, [CHIPS.ambiguous, CHIPS.cnf], g);
  return null;
}

export function solvePdaMessage(p, strings = [], { notes = null, readBack = '' } = {}) {
  const n = notes || pdaNotes(p);
  const out = solvePda(p, strings, n);
  return { msgs: [solutionMessage('pda', out, `${readBack}${INTRO.pda}`, [], Object.keys(n).length ? null : 'pda')], subject: { kind: 'pda', pda: p } };
}

export function machineToGrammar(m) {
  const out = solveMachineToGrammar(m);
  return { msgs: [solutionMessage('cfg', out, INTRO.machine_grammar, [CHIPS.derive, CHIPS.cnf, CHIPS.pda])], subject: { kind: 'grammar', grammar: out.grammar, last: 'cfg', original: out.grammar } };
}
export { wantsGrammar };

const sad = (what, e, format) => ({ msgs: [bot(`I couldn't read that ${what}: ${e.message}\n\nWrite it like this:\n\`\`\`\n${format}\n\`\`\``, { mood: 'sad' })] });

// ---------- the router (no AI needed) ----------
export function respondGrammar({ text, subject = null, machine = null, llmOn = false }) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return null; // pasted contract JSON: brain.js renders it
  // Without the AI, the follow-up questions of this module still have their ready-made answers.
  if (!llmOn && GRAMMAR_READY_ANSWERS[trimmed]) return { msgs: [bot(GRAMMAR_READY_ANSWERS[trimmed], { mood: 'wow' })] };

  // 1. A PDA written as transitions
  if (looksLikePda(trimmed)) {
    try {
      const { pda, strings } = parsePda(trimmed);
      const words = trimmed.split('\n').filter(l => !/[δ∂(]/.test(l) && !/[:=]/.test(l)).join(' ');
      return solvePdaMessage(pda, strings.length ? strings : stringsFromWords(words, pda.input));
    } catch (e) {
      return sad('PDA', e, PDA_FORMAT);
    }
  }

  // 2. A grammar written as productions
  if (hasProductions(trimmed)) {
    const { words, rules, strings } = splitGrammarInput(trimmed);
    let g;
    try {
      g = parseGrammar(rules);
    } catch (e) {
      return sad('grammar', e, GRAMMAR_FORMAT);
    }
    const all = [...new Set([...strings, ...stringsFromWords(words, g.terminals)])];
    const tech = grammarTechnique(words) || 'cfg';
    try {
      return solveGrammar(tech, g, { strings: all, words });
    } catch (e) {
      return { msgs: [bot(e.message, { mood: 'sad' })], subject: { kind: 'grammar', grammar: g, last: 'cfg', original: g } };
    }
  }

  // 3. A command about what is already in the chat
  const short = trimmed.length < 160 && !/\n/.test(trimmed);
  const question = /\?\s*$/.test(trimmed) && !/^(is|check (if|whether)|can you|could you|now|please)\b.{0,60}(ambiguous|cnf|gnf|normal form|pda|simplif|deriv)/i.test(trimmed);
  if (machine && short && !question && wantsGrammar(trimmed) && !/\b(what|why|how|explain|define|difference)\b/i.test(trimmed)) {
    try {
      return machineToGrammar(machine);
    } catch (e) {
      return { msgs: [bot(e.message, { mood: 'sad' })] };
    }
  }
  if (!subject || !short) return null;
  const cmd = trimmed.match(/^\s*(test|trace|run|check|try|derive|parse|generate)\b[\s:]*(.*)$/is);
  if (subject.kind === 'pda') {
    const ss = cmd ? wordList(cmd[2].replace(/\band\b/gi, ' ')) : [];
    if (cmd && ss.length && ss.every(w => [...w].every(ch => subject.pda.input.includes(ch)))) {
      try {
        return solvePdaMessage(subject.pda, ss);
      } catch (e) {
        return { msgs: [bot(e.message, { mood: 'sad' })] };
      }
    }
    return null;
  }
  if (subject.kind !== 'grammar' || question) return null;
  const g = subject.grammar;
  const strings = stringsFromWords(trimmed, g.terminals);
  const asked = grammarTechnique(trimmed);
  try {
    if (cmd && strings.length) return solveGrammar(subject.last === 'cfg_to_pda' && !/deriv|parse|generate/i.test(cmd[1]) ? 'cfg_to_pda' : 'cfg', g, { strings, original: subject.original });
    if (/^\s*derive a string\s*$/i.test(trimmed)) return solveGrammar('cfg', g, { original: subject.original });
    if (asked && asked !== 'cfg') return solveGrammar(asked, asked === 'cnf' && wantsLinz(trimmed) ? subject.original || g : g, { words: trimmed, strings, original: subject.original });
    if (asked === 'cfg' && /deriv|leftmost|rightmost|parse tree|derivation tree/i.test(trimmed) && !/\b(what|why|how|explain|define)\b/i.test(trimmed)) return solveGrammar('cfg', g, { strings, original: subject.original });
  } catch (e) {
    return { msgs: [bot(e.message, { mood: 'sad' })] };
  }
  return null;
}

// ---------- the AI analyzer handed something back ----------
// ai.grammar = { start, rules: ["S → aSb | ε", …] }   ai.pda = { start, bottom, final, accept, transitions: ["δ(q0, a, Z) = (q0, XZ)", …] }
// ai.cf_design = { description, facts: [{ item, meaning }], members: [...], non_members: [...] } for "design a grammar / PDA for …"
export function grammarFromAi(ai, { text = '', subject = null } = {}) {
  if (ai.intent !== 'solve' || !GRAMMAR_TECHNIQUES.includes(ai.technique)) return null;
  const strings = (ai.strings || []).map(String).map(w => (/^(ε|eps|epsilon)$/i.test(w) ? '' : w));
  const design = ai.cf_design && typeof ai.cf_design === 'object' ? ai.cf_design : null;
  const list = x => (Array.isArray(x) ? x.map(String).map(w => (/^(ε|eps|epsilon)$/i.test(w) ? '' : w)) : []);

  if (ai.technique === 'pda') {
    let p;
    try {
      p = ai.pda ? normalizePda(ai.pda) : subject?.kind === 'pda' ? subject.pda : null;
    } catch (e) {
      return { msgs: [bot(`I tried to read the PDA but something is off: ${e.message} Could you check it and send it again?`, { mood: 'sad' })] };
    }
    if (!p) return { msgs: [bot("Send me the PDA's transitions and I'll trace it:\n```\n" + PDA_FORMAT + '\n```', { mood: 'thinking' })] };
    const readBack = ai.pda ? `This is the PDA as I ${design ? 'designed' : 'read'} it${design ? '' : ' (tell me if I got something wrong)'}:\n\`\`\`\n${pdaText(p)}\n\`\`\`\n` : '';
    try {
      const members = list(design?.members);
      const outside = list(design?.non_members);
      const facts = Array.isArray(design?.facts) ? design.facts.filter(f => f && [...p.states, ...p.stack].includes(String(f.item))).map(f => ({ item: String(f.item), meaning: String(f.meaning || '') })) : [];
      const notes = design ? { ...(facts.length ? { facts } : {}), language: String(design.description || '') } : null;
      const res = solvePdaMessage(p, strings.length ? strings : [...members.slice(0, 2), ...outside.slice(0, 1)], { notes: notes && (notes.facts || notes.language) ? notes : null, readBack });
      // a designed machine must agree with the language on every sample string
      const wrongIn = members.filter(w => !search(p, w).accepted);
      const wrongOut = outside.filter(w => search(p, w).accepted);
      const msg = res.msgs[0];
      if (wrongIn.length) msg.checks.push({ ok: false, text: `The machine rejects ${wrongIn.map(show).join(', ')}, which should be in the language.` });
      if (wrongOut.length) msg.checks.push({ ok: false, text: `The machine accepts ${wrongOut.map(show).join(', ')}, which should NOT be in the language.` });
      if (wrongIn.length || wrongOut.length) Object.assign(msg, { mood: 'sad', celebrate: false });
      return res;
    } catch (e) {
      return { msgs: [bot(`${readBack}${e.message}`, { mood: 'sad' })], subject: { kind: 'pda', pda: p } };
    }
  }

  let g;
  try {
    const rules = Array.isArray(ai.grammar?.rules) ? ai.grammar.rules.map(String) : [];
    g = rules.length ? parseGrammar(`${rules.join('\n')}${ai.grammar.start ? `\nstart: ${ai.grammar.start}` : ''}`) : subject?.kind === 'grammar' ? subject.grammar : null;
  } catch (e) {
    return { msgs: [bot(`I tried to read the grammar but something is off: ${e.message} Could you check it and send it again?`, { mood: 'sad' })] };
  }
  if (!g) return { msgs: [bot("Send me the grammar's productions and I'll work on it:\n```\n" + GRAMMAR_FORMAT + '\n```', { mood: 'thinking' })] };
  const readBack = ai.grammar?.rules?.length ? `This is the grammar as I ${design ? 'designed' : 'read'} it${design ? '' : ' (tell me if I got something wrong)'}:\n\`\`\`\n${grammarText(g)}\n\`\`\`\n` : '';
  try {
    if (ai.technique === 'cfg' && design) {
      const out = solveGrammarDesign({ description: String(design.description || ''), grammar: g, facts: Array.isArray(design.facts) ? design.facts.map(f => ({ item: String(f.item), meaning: String(f.meaning || '') })) : [], members: list(design.members), non_members: list(design.non_members) });
      return { msgs: [solutionMessage('cfg', out, `${readBack}Here's the grammar, **checked against the language** (over- and under-generation), then a derivation.`, [CHIPS.ambiguous, CHIPS.cnf, CHIPS.pda])], subject: { kind: 'grammar', grammar: g, last: 'cfg', original: g } };
    }
    const fromWords = grammarTechnique(text);
    const tech = ai.technique === 'cnf_gnf' ? (ai.cf_method === 'gnf' || fromWords === 'gnf' ? 'gnf' : 'cnf') : ai.technique;
    const proposal = tech === 'ambiguity' && Array.isArray(ai.repair?.rules) && ai.repair.rules.length ? parseGrammar(ai.repair.rules.map(String).join('\n')) : null;
    return solveGrammar(tech, g, { strings, words: `${text} ${ai.cf_method || ''}`, readBack, proposal, original: subject?.original });
  } catch (e) {
    return { msgs: [bot(`${readBack}${e.message}`, { mood: 'sad' })], subject: { kind: 'grammar', grammar: g, last: 'cfg', original: g } };
  }
}

// What the AI should know about the object in the chat (sent as the "current machine").
export const subjectText = subject => (!subject ? null : subject.kind === 'pda' ? `(a pushdown automaton)\n${pdaText(subject.pda)}` : `(a context-free grammar)\n${grammarText(subject.grammar)}`);

// Does the student's string belong? Used for the tiny status line in a few replies.
export const inLanguage = (subject, w) => (subject?.kind === 'grammar' ? derives(subject.grammar, w) : subject?.kind === 'pda' ? search(subject.pda, w).accepted : null);
