// Validation of the shared JSON contract + Adham's automata self-check.

import { accepts, stringsUpTo } from './machine.js';

// ---------- contract validation (plan §4) ----------
export function validateContract(json) {
  const errors = [];
  if (!json || typeof json !== 'object') return ['The answer is not a JSON object.'];
  ['technique', 'steps', 'tests', 'language', 'conclusion'].forEach(k => {
    if (!(k in json)) errors.push(`Missing required field "${k}".`);
  });
  if (Array.isArray(json.steps)) {
    if (json.steps.length === 0) errors.push('"steps" is empty.');
    json.steps.forEach((s, i) => {
      if (!s.title) errors.push(`steps[${i}] has no "title".`);
      if (!s.explain) errors.push(`steps[${i}] has no "explain".`);
      if (!Array.isArray(s.lines)) errors.push(`steps[${i}].lines must be a list.`);
      if (s.table && !Array.isArray(s.table)) errors.push(`steps[${i}].table must be a list of rows.`);
    });
  } else if ('steps' in json) errors.push('"steps" must be a list.');
  if (Array.isArray(json.tests)) {
    const isAcceptor = json.tests.some(t => 'accepted' in t);
    if (isAcceptor && !json.tests.some(t => t.accepted === false)) {
      errors.push('Style rule 7: the tests need at least one rejected string.');
    }
  } else if ('tests' in json) errors.push('"tests" must be a list.');
  return errors;
}

// ---------- self-check ----------
// 1. Re-run every test string on the final machine (steps[last].extra.machine)
//    and compare with the ✓/✗ written in the answer.
// 2. If we know the student's input machine, compare it with the final machine
//    on every string up to a length bound (this catches a wrong final machine
//    whose ✓/✗ marks are merely consistent with itself).
export function selfCheck(json, inputMachine) {
  const results = [];
  const final = [...(json.steps || [])].reverse().find(s => s.extra?.machine)?.extra.machine;
  if (!final) {
    results.push({ ok: null, text: 'No final machine in the answer (steps[].extra.machine), so the self-check cannot run.' });
    return results;
  }

  let bad = 0;
  (json.tests || []).forEach(t => {
    if (!('accepted' in t)) return;
    const real = accepts(final, t.input || '');
    if (real !== t.accepted) {
      bad++;
      results.push({
        ok: false,
        text: `"${t.input || 'ε'}" is marked ${t.accepted ? '✓ accepted' : '✗ rejected'}, but the final machine ${real ? 'accepts' : 'rejects'} it.`
      });
    }
  });
  if (bad === 0) results.push({ ok: true, text: `All ${(json.tests || []).length} test marks match the final machine.` });

  if (inputMachine) {
    // Keep the brute force small: about 2000 strings at most.
    const k = inputMachine.alphabet.filter(a => a !== 'ε').length || 1;
    let len = 1;
    while (len < 12 && (k ** (len + 1) - 1) / Math.max(1, k - 1) <= 2000) len++;
    const pool = stringsUpTo(inputMachine.alphabet, len);
    const diff = pool.find(w => accepts(inputMachine, w) !== accepts(final, w));
    results.push(
      diff === undefined
        ? { ok: true, text: `Input and final machine agree on all ${pool.length} strings of length ≤ ${len}.` }
        : {
            ok: false,
            text: `Input and final machine disagree on "${diff || 'ε'}": the input machine ${accepts(inputMachine, diff) ? 'accepts' : 'rejects'} it.`
          }
    );
  }
  return results;
}

// ---------- checking an LLM-written regex for L against the real machine ----------
// Course notation: | for union, * star, + one-or-more, parentheses, ε, ∅.
// Returns { ok, text } or null when the regex cannot be read.
export function checkRegex(regex, machine) {
  const syms = machine.alphabet.filter(a => a !== 'ε');
  let src = '';
  for (const ch of regex.replace(/\s+/g, '')) {
    if (ch === 'ε' || ch === 'λ') src += '(?:)';
    else if (ch === '∅') src += '(?!)';
    else if ('()|*+?'.includes(ch)) src += ch;
    else if (ch === '∪') src += '|';
    else if (syms.includes(ch)) src += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else return null; // a symbol we do not understand
  }
  let re;
  try {
    re = new RegExp(`^(?:${src})$`);
  } catch {
    return null;
  }
  const k = Math.max(1, syms.length);
  let len = 1;
  while (len < 12 && (k ** (len + 1) - 1) / Math.max(1, k - 1) <= 3000) len++;
  const pool = stringsUpTo(machine.alphabet, len);
  const diff = pool.find(w => re.test(w) !== accepts(machine, w));
  return diff === undefined
    ? { ok: true, text: `The regex ${regex} matches exactly the strings the machine accepts (checked all ${pool.length} strings of length ≤ ${len}).` }
    : {
        ok: false,
        text: `The regex ${regex} is wrong on "${diff || 'ε'}": the machine ${accepts(machine, diff) ? 'accepts' : 'rejects'} it but the regex ${re.test(diff) ? 'matches' : 'does not match'} it.`
      };
}
