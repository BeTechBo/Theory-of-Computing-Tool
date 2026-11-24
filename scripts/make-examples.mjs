// Writes one answer per Module 5 technique in the shared JSON contract (plan §4) to examples/.
// Paste any of these files into the chat and Stately renders it: the same player draws an
// answer whether code or an LLM produced it.   Run:  node scripts/make-examples.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { parseGrammar } from '../src/components/tutor/grammar.js';
import { parsePda } from '../src/components/tutor/pdaMachine.js';
import { presetGrammar, presetPda } from '../src/components/tutor/grammarPresets.js';
import { solveCfg } from '../src/components/tutor/techniques/cfgDerivation.js';
import { solveAmbiguity } from '../src/components/tutor/techniques/ambiguity.js';
import { solveSimplify } from '../src/components/tutor/techniques/simplify.js';
import { solveCnf } from '../src/components/tutor/techniques/normalForms.js';
import { solvePda } from '../src/components/tutor/techniques/pdaTrace.js';
import { solveCfgToPda } from '../src/components/tutor/techniques/cfgToPda.js';

const g = id => [parseGrammar(presetGrammar(id).text), presetGrammar(id).notes];
const p = presetPda('pda-anbn');
const answers = {
  S17_derivation: solveCfg(...[g('equal')[0], ['abba'], g('equal')[1]]),
  S18_ambiguity: solveAmbiguity(...g('expr')),
  S18_simplification: solveSimplify(...g('s18-walk')),
  S19_cnf: solveCnf(...g('s19-relay')),
  S20_pda_trace: solvePda(parsePda(p.text).pda, ['aabb', 'abab'], p.notes),
  S21_cfg_to_pda: solveCfgToPda(g('s21-walk')[0], ['aabc'], g('s21-walk')[1])
};

mkdirSync('examples', { recursive: true });
for (const [name, out] of Object.entries(answers)) {
  writeFileSync(`examples/${name}.json`, JSON.stringify(out.solution, null, 1) + '\n');
  console.log(`examples/${name}.json  (${out.solution.steps.length} steps)`);
}
