// Decides how Stately answers a message. Order of preference:
//   1. pasted JSON in the team contract  → render it (for testing prompts)
//   2. a table (finite automaton or Moore/Mealy) + optional instruction / "strings:" → solve with CODE
//   3. a command about the machine already in the chat ("test ab", "convert to a DFA",
//      "minimise it", "remove the ε-moves") → solve with CODE
//   4. anything else → the AI analyzer, which may hand a machine (or a design) back to code,
//      or answers a concept question
//   5. no AI key → a friendly explanation of what works offline

import { parseTransitionTable, normalizeMachine, machineToTable, isNfa, isDfa, EPS, stringsUpTo, accepts } from '../tutor/machine.js';
import { solveSubsetConstruction } from '../tutor/techniques/subsetConstruction.js';
import { solveTrace } from '../tutor/techniques/dfaTrace.js';
import { solveMinimise } from '../tutor/techniques/minimise.js';
import { solveEpsClosure, solveEpsRemoval } from '../tutor/techniques/epsilon.js';
import { looksLikeTransducer, parseTransducer, solveMooreMealy } from '../tutor/techniques/mooreMealy.js';
import { solveDesign } from '../tutor/techniques/dfaDesign.js';
import { solveThompson } from '../tutor/techniques/thompson.js';
import { solveStateElimination } from '../tutor/techniques/stateElimination.js';
import { solveProductConstruction, solveComplement } from '../tutor/techniques/productConstruction.js';
import { solveRegexIdentities } from '../tutor/techniques/regexIdentities.js';
import { solvePumpingLemma } from '../tutor/techniques/pumpingLemma.js';
import { validateContract, selfCheck } from '../tutor/checks.js';
import { SUBSET_PRESETS, TECHNIQUES } from '../tutor/presets.js';
import { analyze, readAttempt } from './llmClient.js';
import { makePractice, PRACTICE_TOPICS } from '../tutor/practice.js';
import { checkStudent } from '../tutor/checker.js';
import { transducerToTable } from '../tutor/techniques/mooreMealy.js';

const PRACTICE_RE = /\b(practi[cs]e|exercise|drill)\b|\bquiz me\b|\btest me\b|give me (a|an|another|one more) (question|problem|exercise)|^\s*(another|one more)( one| question| exercise)?\s*[.!]?\s*$/i;
const SHOW_RE = /show (me )?(the )?(full |correct )?(solution|answer|steps)|\breveal\b|solve it( for me)?|i give up/i;
const CHECK_RE = /did i (do|get|solve) (this|it|that)( \w+)? (right|correct|wrong)|where did i (go wrong|mess up)|(am i|is (this|that|it)) (right|correct)\?|check (my|this|the) (answer|solution|work|attempt|homework)|^check (it|mine)\s*[.!]?$|(grade|mark|correct) (my|this)|is (this|my answer|my solution) (right|correct)|^(here'?s|here is|this is) my (answer|solution|attempt|work)/i;

export const READY = new Set(TECHNIQUES.flatMap(g => g.items).filter(t => t.ready).map(t => t.id));
export const techniqueLabel = id => TECHNIQUES.flatMap(g => g.items).find(t => t.id === id)?.label || id;

const FORMAT = `state | a        | b\n→ q0  | {q0, q1} | {q0}\nq1    | ∅        | {q2}\n* q2  | ∅        | ∅`;

const bot = (text, extra = {}) => ({ role: 'bot', kind: 'text', text, mood: 'idle', ...extra });

const STRINGS_LINE = /^\s*(strings?|tests?|inputs?|words?)\s*[:=]\s*(.*)$/i;
const TEST_CMD = /^\s*(test|trace|run|check|try)\b[\s:]*(.*)$/is;

export function parseStrings(s) {
  return [
    ...new Set(
      s
        .split(/[,\s]+/)
        .map(x => x.trim().replace(/^["'](.*)["']$/, '$1'))
        .filter(x => x !== '')
        .map(x => (['ε', 'eps', 'epsilon', 'λ', '""', "''", 'empty'].includes(x.toLowerCase()) ? '' : x))
    )
  ];
}

// Split a message into: instruction text (before the table), the table, and test strings.
function splitInput(text) {
  const strings = [];
  const rest = [];
  text.split('\n').forEach(l => {
    const m = l.match(STRINGS_LINE);
    if (m) strings.push(...parseStrings(m[2]));
    else rest.push(l);
  });
  const headerAt = rest.findIndex(l => /[|\t]/.test(l));
  const instruction = headerAt > 0 ? rest.slice(0, headerAt).join(' ').trim() : '';
  const tableText = (headerAt >= 0 ? rest.slice(headerAt) : rest).join('\n').trim();
  return { instruction, tableText, strings };
}

function looksLikeTable(t) {
  const lines = t.split('\n').filter(l => l.trim());
  return lines.length >= 2 && /[|\t]/.test(lines[0]) && /[|\t]/.test(lines[1]);
}

const norm = s => s.replace(/\s+/g, ' ').trim();
function presetNotes(tableText) {
  return SUBSET_PRESETS.find(p => norm(p.table) === norm(tableText))?.notes || {};
}

// What the student asked for, from their own words (works without the AI).
function techniqueFromWords(text) {
  const t = ` ${text.toLowerCase()} `;
  if (/minimi[sz]|minimal|smallest|reduce the states/.test(t)) {
    const part = /partition|refinement/.test(t);
    const table = /table[\s-]*fill|myhill|filling/.test(t);
    if (/both|two ways/.test(t) || (part && table)) return 'min_both';
    return part ? 'min_partition' : table ? 'min_table' : 'min_both';
  }
  if (/closure|ε-cl|e-cl/.test(t)) return 'eps_closure';
  if (/(remove|removing|eliminat|kill|get rid).{0,20}(ε|eps|epsilon|lambda)|(ε|epsilon|eps)[\s-]*(free|removal)/.test(t)) return 'eps_removal';
  if (/(to|into|a|equivalent) dfa|subset|powerset|determini[sz]/.test(t)) return 'subset_construction';
  if (/state[\s-]*elim|gnfa|arden|to regex|into regex/.test(t)) return 'state_elimination';
  if (/thompson|regex to|to nfa|build nfa|fragment/.test(t)) return 'thompson';
  if (/product|cartesian|intersection|union of dfa/.test(t)) return 'product';
  if (/pumping|not regular|non-regular|prove.*not regular/.test(t)) return 'pumping';
  if (/regex identit|equivalent regex|regex compare/.test(t)) return 'regex';
  if (/\b(trace|test|run|accept)/.test(t)) return 'dfa_trace';
  return null;
}

function pickTechnique(words, m, strings) {
  const asked = techniqueFromWords(words || '');
  if (asked === 'subset_construction' && m.alphabet.includes(EPS)) return 'eps_removal'; // ε first, then the DFA
  if (asked === 'eps_closure' || asked === 'eps_removal') return m.alphabet.includes(EPS) ? asked : strings.length ? 'dfa_trace' : isNfa(m) ? 'subset_construction' : 'min_both';
  if (asked && asked.startsWith('min')) return isDfa(m) ? asked : m.alphabet.includes(EPS) ? 'eps_removal' : 'subset_construction';
  if (asked) return asked;
  if (strings.length) return m.alphabet.includes(EPS) ? 'eps_closure' : 'dfa_trace';
  if (m.alphabet.includes(EPS)) return 'eps_removal';
  if (isNfa(m)) return 'subset_construction';
  return 'min_both';
}

const INTRO = {
  subset_construction: "Here's the **subset construction**, one row at a time. Press **Next** (or ←/→) to walk through it.",
  min_both: "Here's the minimisation **both ways**: partition refinement first, then table filling. They must end with the same classes.",
  min_partition: "Here's the minimisation by **partition refinement**, round by round.",
  min_table: "Here's the minimisation by **table filling**, pass by pass, with a witness for every crossed pair.",
  eps_closure: "Here are the **ε-closures**, then each string traced as close → move → close.",
  eps_removal: "Here's the **ε-removal**: closures, then δ′ one entry per line, then F′ (that's where the marks are).",
  moore_mealy: "Here's the machine run step by step, then **converted** to the other kind and checked.",
  dfa_design: "Here's the design, **facts first**, following the 5-step recipe.",
  thompson: "Here's **Thompson's construction**, building the ε-NFA fragments inside-out.",
  state_elimination: "Here's **state elimination (GNFA)**, bypassing states one by one until only the regex remains.",
  product: "Here's the **product construction**, computing pair transitions and accepting states.",
  regex: "Here's the **regular expression comparison and identities** analysis.",
  pumping: "Here's the **Pumping Lemma proof**, establishing contradiction with the 5-step recipe."
};

// Run a code technique on a machine and wrap the result as a chat message.
export function solveWith(technique, machine, strings = [], notes = {}) {
  let solution;
  let keep = machine;
  if (technique === 'subset_construction') solution = solveSubsetConstruction(machine, notes);
  else if (technique === 'dfa_trace') {
    if (!strings.length) {
      return { msg: bot('Got the machine! Which strings should I trace? Send something like `test aab, ba, ε`.', { mood: 'thinking' }), machine };
    }
    solution = solveTrace(machine, strings, notes);
  } else if (technique.startsWith('min')) {
    solution = solveMinimise(machine, { min_both: 'both', min_partition: 'partition', min_table: 'table' }[technique] || 'both', notes);
  } else if (technique === 'eps_closure') solution = solveEpsClosure(machine, strings, notes);
  else if (technique === 'eps_removal') solution = solveEpsRemoval(machine, notes);
  else if (technique === 'state_elimination') solution = solveStateElimination(machine);
  else if (technique === 'product') solution = solveProductConstruction(machine);
  else if (technique === 'thompson') solution = solveThompson(notes.regex || 'a(a|b)*b', strings);
  else if (technique === 'regex') solution = solveRegexIdentities(notes.r1 || '(a|b)*', notes.r2 || 'a*|b*', strings);
  else if (technique === 'pumping') solution = solvePumpingLemma(notes.key || '0ⁿ1ⁿ');
  else return { msg: bot("I can't do that one yet 🛠️. Send me a table and tell me what to do with it.", { mood: 'sad' }), machine };

  const finalMachine = [...solution.steps].reverse().find(s => s.extra?.machine)?.extra.machine || machine;
  if (['subset_construction', 'eps_removal', 'thompson', 'product'].includes(technique) || technique.startsWith('min')) keep = finalMachine;
  return { msg: solutionMessage(technique, solution, selfCheck(solution, machine), finalMachine, !notes.facts), machine: keep };
}

function solutionMessage(technique, solution, checks, finalMachine, explainable) {
  const allGood = checks.every(c => c.ok !== false);
  return {
    role: 'bot',
    kind: 'solution',
    text: technique === 'dfa_trace' ? `I traced ${solution.tests.length === 1 ? 'your string' : 'your strings'}, one move per line.` : INTRO[technique] || 'Here it is, step by step.',
    solution,
    checks,
    mood: allGood ? 'happy' : 'sad',
    celebrate: allGood,
    needsExplain: explainable && (technique === 'subset_construction' || technique === 'eps_removal' || technique.startsWith('min')),
    finalMachine,
    technique
  };
}

// What the AI explainer needs: the final machine and code-computed examples.
export function explainPayload(msg) {
  const m = msg.finalMachine;
  const pool = stringsUpTo(m.alphabet, 5);
  return {
    technique: msg.solution.technique,
    machineTable: machineToTable(m),
    accepted: pool.filter(w => accepts(m, w)).slice(0, 12),
    rejected: pool.filter(w => !accepts(m, w)).slice(0, 12)
  };
}

const tableError = e => bot(`I couldn't read that table: ${e.message}\n\nWrite it like this (→ marks the start state, * marks accepting states):\n\`\`\`\n${FORMAT}\n\`\`\``, { mood: 'sad' });

export async function respond({ text, images = [], machine, llmOn, history, practice = null }) {
  const trimmed = text.trim();
  const hasTable = /\n.*[|\t]/.test(trimmed);

  // Check my answer (needs the AI to read the student's work)
  if (CHECK_RE.test(trimmed) || (images.length && practice)) {
    if (!llmOn) return { msgs: [bot("I need my AI helper to read your work, and it isn't switched on here yet.", { mood: 'sad' })] };
    return checkAttempt({ trimmed, images, practice });
  }

  // Practice mode
  if (!hasTable && !images.length) {
    if (practice && SHOW_RE.test(trimmed)) return solvePractice(practice);
    if (PRACTICE_RE.test(trimmed)) return practiceMessage(trimmed, practice);
  }

  // Pictures always need the AI to read them
  if (images.length) {
    if (!llmOn) return { msgs: [bot("I can't read pictures just yet 📷. For now, type the machine as a table and I'll solve it:\n```\n" + FORMAT + '\n```', { mood: 'sad' })] };
    return askAi({ trimmed, images, machine, history });
  }

  // 1. Pasted contract JSON
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const problems = validateContract(parsed);
      if (problems.some(p => p.startsWith('Missing') || p.includes('must be'))) {
        return { msgs: [bot(`That JSON doesn't match our answer format:\n${problems.map(p => `- ${p}`).join('\n')}`, { mood: 'sad' })] };
      }
      return { msgs: [{ role: 'bot', kind: 'solution', text: 'Rendered your JSON answer.', solution: parsed, checks: selfCheck(parsed, null), mood: 'wow' }] };
    } catch {
      /* not JSON after all */
    }
  }

  // 2. A table
  const { instruction, tableText, strings } = splitInput(trimmed);
  if (looksLikeTable(tableText)) {
    if (looksLikeTransducer(tableText)) {
      try {
        const M = parseTransducer(tableText);
        return { msgs: [solutionMessage('moore_mealy', solveMooreMealy(M, strings), [], null, false)] };
      } catch (e) {
        return { msgs: [bot(`I couldn't read that Moore/Mealy table: ${e.message}`, { mood: 'sad' })] };
      }
    }
    let m;
    try {
      m = parseTransitionTable(tableText);
    } catch (e) {
      return { msgs: [tableError(e)] };
    }
    try {
      const { msg, machine: kept } = solveWith(pickTechnique(instruction, m, strings), m, strings, presetNotes(tableText));
      return { msgs: [msg], machine: kept };
    } catch (e) {
      return { msgs: [bot(e.message, { mood: 'sad' })], machine: m };
    }
  }

  // 3. A test command or a command about the active machine
  const cmd = trimmed.match(TEST_CMD);
  if (cmd && cmd[2].trim().length < 200 && !/[?]/.test(cmd[2])) {
    const ss = parseStrings(cmd[2]);
    if (!machine) {
      return {
        msgs: [
          bot(
            "There's no active machine in this chat yet to test those strings on!\n\nFirst provide an automaton (for example, type `thompson: (0|1)*10` or paste an FA table), then you can test strings with `test <strings>`.",
            { mood: 'thinking' }
          )
        ]
      };
    }
    const syms = machine.alphabet.filter(a => a !== EPS);
    const badChars = [...new Set(ss.flatMap(w => [...w]).filter(ch => !syms.includes(ch)))];
    if (badChars.length) {
      return {
        msgs: [
          bot(
            `This machine's alphabet is Σ = {${syms.join(', ')}}, but your test string contains '${badChars.join("', '")}'.\n\nTry testing strings made of {${syms.join(', ')}}, e.g. \`test ${syms[0] || 'a'}${syms[1] || 'b'}, ${syms[0] || 'a'}\`.`,
            { mood: 'thinking' }
          )
        ],
        machine
      };
    }
    if (ss.length) {
      try {
        return { msgs: [solveWith('dfa_trace', machine, ss).msg], machine };
      } catch (e) {
        return { msgs: [bot(e.message, { mood: 'sad' })], machine };
      }
    }
  }

  if (machine) {
    const asked = trimmed.length < 120 && !/\?\s*$/.test(trimmed) ? techniqueFromWords(trimmed) : null;
    if (asked && asked !== 'dfa_trace') {
      try {
        const { msg, machine: kept } = solveWith(pickTechnique(trimmed, machine, []), machine, []);
        return { msgs: [msg], machine: kept };
      } catch (e) {
        return { msgs: [bot(e.message, { mood: 'sad' })], machine };
      }
    }
  }

  // 3b. Module 3 direct commands (Thompson, Pumping Lemma, Regex Identities)
  const thMatch = trimmed.match(/^(?:thompson|regex to (?:ε-)?nfa)\s*[:=]?\s*(.+)$/i);
  if (thMatch) {
    try {
      const sol = solveThompson(thMatch[1].trim());
      const finalM = [...sol.steps].reverse().find(s => s.extra?.machine)?.extra.machine || null;
      return { msgs: [solutionMessage('thompson', sol, selfCheck(sol, null), finalM, false)], machine: finalM };
    } catch (e) {
      return { msgs: [bot(`Thompson construction error: ${e.message}`, { mood: 'sad' })] };
    }
  }

  const pumpMatch = trimmed.match(/^(?:pumping(?: lemma)?|prove not regular)\s*[:=]?\s*(.*)$/i);
  if (pumpMatch) {
    try {
      const key = pumpMatch[1].trim() || '0ⁿ1ⁿ';
      const sol = solvePumpingLemma(key);
      return { msgs: [solutionMessage('pumping', sol, selfCheck(sol, null), null, false)] };
    } catch (e) {
      return { msgs: [bot(`Pumping lemma error: ${e.message}`, { mood: 'sad' })] };
    }
  }

  const compMatch = trimmed.match(/^r1\s*[:=]\s*(.+?)\s*r2\s*[:=]\s*(.+)$/i) || trimmed.match(/^(?:compare|identit(?:y|ies))\s*[:=]?\s*(.+?)\s*(?:vs|and|,)\s*(.+)$/i);
  if (compMatch) {
    try {
      const sol = solveRegexIdentities(compMatch[1].trim(), compMatch[2].trim());
      return { msgs: [solutionMessage('regex', sol, selfCheck(sol, null), null, false)] };
    } catch (e) {
      return { msgs: [bot(`Regex identities error: ${e.message}`, { mood: 'sad' })] };
    }
  }

  // 4. The AI analyzer
  if (llmOn) return askAi({ trimmed, images: [], machine, history });

  // 5. Offline
  return {
    msgs: [
      bot(
        "I can't answer written questions just yet, but send me a machine as a table and I'll solve it step by step:\n```\n" + FORMAT + "\n```\nAdd a line like `strings: aab, ba, ε` to test strings.",
        { mood: 'thinking' }
      )
    ]
  };
}

async function askAi({ trimmed, images, machine, history }) {
  const ai = await analyze({ message: trimmed, images, technique: null, machineTable: machine ? machineToTable(machine) : null, history });
  // For solved exercises our own intro already says what happens, so the AI's "I will …"
  // sentence would repeat it. Keep it only when nothing gets solved.
  const intro = '';

  // The student showed their own work: mark it (code marks, the AI only reads)
  if (ai.intent === 'check') return checkAttempt({ trimmed, images, practice: null });

  // S02: the AI designs, code lays it out and checks it
  if (ai.intent === 'solve' && ai.technique === 'dfa_design' && ai.design) {
    try {
      const { solution, machine: m, checks } = solveDesign(ai.design, String(ai.design.description || ai.reply || ''));
      const msg = solutionMessage('dfa_design', solution, [...selfCheck(solution, null), ...checks], m, false);
      return { msgs: [{ ...msg, text: `${intro}${msg.text}` }], machine: m };
    } catch (e) {
      return { msgs: [bot(`${intro}I tried to build the design but something is off: ${e.message} Could you ask again?`, { mood: 'sad' })] };
    }
  }

  // Moore / Mealy described in words or a picture
  if (ai.intent === 'solve' && ai.technique === 'moore_mealy' && ai.transducer) {
    try {
      const t = ai.transducer;
      const M = { type: t.type === 'mealy' ? 'mealy' : 'moore', states: t.states.map(String), alphabet: t.alphabet.map(String), start: String(t.start), delta: t.delta, out: t.out };
      M.states.forEach(q => M.alphabet.forEach(a => {
        if (!M.states.includes(M.delta?.[q]?.[a])) throw new Error(`δ(${q}, ${a}) is missing.`);
      }));
      const msg = solutionMessage('moore_mealy', solveMooreMealy(M, (ai.strings || []).map(String)), [], null, false);
      return { msgs: [{ ...msg, text: `${intro}${msg.text}` }] };
    } catch (e) {
      return { msgs: [bot(`${intro}I couldn't read that Moore/Mealy machine: ${e.message}`, { mood: 'sad' })] };
    }
  }

  // A finite automaton to convert / minimise / trace
  if (ai.intent === 'solve' && (ai.machine || machine)) {
    let m;
    try {
      m = ai.machine ? normalizeMachine(ai.machine) : machine;
    } catch (e) {
      return { msgs: [bot(`I tried to read the machine but something is off: ${e.message} Could you check it and send it again?`, { mood: 'sad' })] };
    }
    const ss = (ai.strings || []).map(String);
    let tech = ai.technique && (READY.has(ai.technique) || ai.technique.startsWith('min')) ? ai.technique : null;
    if (tech && tech.startsWith('min')) tech = { both: 'min_both', partition: 'min_partition', table: 'min_table' }[ai.method] || tech;
    if (!tech || (tech === 'subset_construction' && m.alphabet.includes(EPS))) tech = pickTechnique(trimmed, m, ss);
    const readBack = ai.machine ? `${intro}This is the machine as I read it (tell me if I got something wrong):\n\`\`\`\n${machineToTable(m)}\n\`\`\`\n` : intro;
    try {
      const { msg, machine: kept } = solveWith(tech, m, ss);
      return { msgs: [{ ...msg, text: `${readBack}${msg.text}` }], machine: kept };
    } catch (e) {
      return { msgs: [bot(`${readBack}${e.message}`, { mood: 'sad' })], machine: m };
    }
  }

  if (ai.intent === 'question' && ai.answer?.short) return { msgs: [answerMessage(ai)] };
  return {
    msgs: [
      bot(ai.reply || ai.answer?.short || "Hmm, I'm not sure what to do with that. Could you say it another way?", {
        mood: ai.intent === 'unsupported' ? 'sad' : 'idle',
        followUps: cleanList(ai.follow_ups, 3)
      })
    ]
  };
}

const cleanList = (x, n) => (Array.isArray(x) ? x.map(String).map(t => t.trim()).filter(Boolean).slice(0, n) : []);

// A structured explanation. Guard: every example machine is checked by code: an
// invalid one is dropped, and each string's ✓/✗ is computed here, never taken from the AI.
function answerMessage(ai) {
  const a = ai.answer;
  const examples = (Array.isArray(a.examples) ? a.examples : [])
    .slice(0, 2)
    .map(ex => {
      try {
        const m = normalizeMachine(ex.machine);
        if (m.states.length > 8) return null; // examples must stay tiny
        const syms = m.alphabet.filter(x => x !== EPS);
        const strings = cleanList(ex.strings, 5)
          .map(w => (['ε', 'eps', 'epsilon', '""'].includes(w) ? '' : w))
          .filter(w => [...w].every(ch => syms.includes(ch)));
        return { caption: String(ex.caption || ''), machine: m, tests: strings.map(w => ({ input: w, accepted: accepts(m, w) })) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const explain = cleanList(a.explain, 6);
  return {
    role: 'bot',
    kind: 'answer',
    mood: 'wow',
    text: [a.short, ...explain].join('\n'), // plain version, used as chat history for the AI
    answer: { short: String(a.short), explain, examples, trap: a.trap ? String(a.trap) : '', session: /^S\d\d$/.test(a.session || '') ? a.session : '' },
    followUps: cleanList(ai.follow_ups, 3)
  };
}

// ---------------- practice mode ----------------
function practiceMessage(text, current) {
  // Topic buttons send their label (e.g. "NFA → DFA"), so match labels first.
  const byLabel = PRACTICE_TOPICS.find(t => text.toLowerCase().includes(t.label.toLowerCase()));
  const words = byLabel ? (byLabel.technique === 'min_both' ? 'min_both' : byLabel.technique) : techniqueFromWords(text) || '';
  let topic = /moore|mealy|output/i.test(text) ? 'moore_mealy' : words.startsWith('min') ? 'min_both' : words.startsWith('eps') ? 'eps_removal' : words === 'subset_construction' || words === 'dfa_trace' ? words : null;
  if (!topic && /^\s*(another|one more)/i.test(text) && current) topic = current.technique;
  if (!topic) {
    return {
      msgs: [
        bot("Let's practise! 🎲 Pick a topic and I'll make you a **fresh exercise**. Try it on paper, then send me a photo and I'll mark it.", {
          mood: 'happy',
          actions: PRACTICE_TOPICS.map(t => ({ label: `${t.emoji} ${t.label}`, say: `Give me a practice question on ${t.label}` }))
        })
      ]
    };
  }
  let p;
  try {
    p = makePractice(topic);
  } catch (e) {
    return { msgs: [bot(e.message, { mood: 'sad' })] };
  }
  return {
    msgs: [{ role: 'bot', kind: 'practice', mood: 'happy', text: p.task, practice: p }],
    practice: p,
    machine: p.machine || null
  };
}

function solvePractice(p) {
  try {
    if (p.transducer) return { msgs: [solutionMessage('moore_mealy', solveMooreMealy(p.transducer, p.strings || []), [], null, false)] };
    if (p.technique === 'thompson') {
      const regMatch = p.task.match(/\*\*`([^`]+)`\*\*/);
      const reg = regMatch ? regMatch[1] : '(a|b)*abb';
      const sol = solveThompson(reg);
      return { msgs: [solutionMessage('thompson', sol, selfCheck(sol, null), null, false)] };
    }
    if (p.technique === 'pumping') {
      const sol = solvePumpingLemma('0ⁿ1ⁿ');
      return { msgs: [solutionMessage('pumping', sol, selfCheck(sol, null), null, false)] };
    }
    if (p.technique === 'state_elimination') {
      const sol = solveStateElimination(p.machine);
      return { msgs: [solutionMessage('state_elimination', sol, selfCheck(sol, null), null, false)] };
    }
    const { msg } = solveWith(p.technique, p.machine, p.strings || []);
    return { msgs: [{ ...msg, text: `Here's the full solution. Compare it with yours, or switch on **🤔 Quiz me** to guess each step first.` }] };
  } catch (e) {
    return { msgs: [bot(e.message, { mood: 'sad' })] };
  }
}

// ---------------- check my answer ----------------
async function checkAttempt({ trimmed, images, practice }) {
  const technique = practice ? (practice.technique === 'min_both' ? 'min_table' : practice.technique) : null;
  // If the student typed the question as a table before their answer, OUR parser reads it.
  const question = practice ? {} : questionFromText(trimmed);
  const qMachine = practice?.machine || question.machine;
  const qTransducer = practice?.transducer || question.transducer;
  const read = await readAttempt({
    message: trimmed,
    images,
    technique,
    machineTable: qMachine ? machineToTable(qMachine) : null,
    transducerTable: qTransducer ? transducerToTable(qTransducer) : null
  });
  const tech = technique || read.technique;
  let machine = practice?.machine || question.machine || null;
  let transducer = practice?.transducer || question.transducer || null;
  try {
    if (!machine && read.machine) machine = normalizeMachine(read.machine);
    if (!transducer && read.transducer) transducer = { ...read.transducer, type: read.transducer.type === 'mealy' ? 'mealy' : 'moore' };
  } catch (e) {
    return { msgs: [bot(`I couldn't read the question's machine: ${e.message} Send the question too, or a clearer photo.`, { mood: 'sad' })] };
  }
  if (!tech || (!machine && !transducer && tech !== 'dfa_design')) {
    return { msgs: [bot("I couldn't tell which question this answers. Send the question together with your work (one photo is fine), or start a 🎲 practice exercise first.", { mood: 'thinking' })] };
  }
  let result;
  try {
    result = checkStudent({ technique: tech, machine, transducer, student: read.student, languageRegex: read.language_regex });
  } catch (e) {
    return { msgs: [bot(e.message, { mood: 'sad' })] };
  }
  const full = result.score === result.total;
  return {
    msgs: [
      {
        role: 'bot',
        kind: 'check',
        mood: full ? 'happy' : result.score >= result.total / 2 ? 'wow' : 'sad',
        celebrate: full,
        text: full ? `Checked your ${techniqueLabel(tech)}: everything is right.` : `Checked your ${techniqueLabel(tech)}: first mistake at ${result.firstMistake?.where}.`,
        result,
        unreadable: Array.isArray(read.unreadable) ? read.unreadable.map(String).slice(0, 4) : []
      }
    ],
    machine: machine || undefined,
    practice: practice || { technique: tech, machine, transducer, strings: [] }
  };
}

// The question's table, if it is clearly the question: it comes before "my answer" (or
// there are two tables and it is the first). Otherwise let the AI decide what is what.
function questionFromText(text) {
  const lines = text.split('\n');
  const blocks = [];
  let cur = null;
  lines.forEach((l, i) => {
    if (/[|\t]/.test(l) && l.trim()) {
      if (!cur) blocks.push((cur = { start: i, lines: [] }));
      cur.lines.push(l);
    } else cur = null;
  });
  const markerLine = lines.findIndex(l => /my (answer|solution|work|attempt)|^\s*(answer|solution)\s*:/i.test(l));
  const first = blocks.find(b => b.lines.length >= 2);
  if (!first) return {};
  const beforeMarker = markerLine >= 0 && first.start + first.lines.length <= markerLine;
  if (!beforeMarker && blocks.filter(b => b.lines.length >= 2).length < 2) return {};
  const table = first.lines.join('\n');
  try {
    if (looksLikeTransducer(table)) return { transducer: parseTransducer(table) };
    return { machine: parseTransitionTable(table) };
  } catch {
    return {};
  }
}
