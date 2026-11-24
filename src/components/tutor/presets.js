// Worked examples taken from the course material (S04 handout + model answers).
// "notes" carries the parts code cannot compute (plain-English invariants, L);
// later the LLM will write these for inputs that are not presets.

export const TECHNIQUES = [
  {
    group: 'Module 1–2 · Finite automata (Adham)',
    items: [
      { id: 'subset_construction', label: 'S04 · NFA → DFA (subset construction)', ready: true },
      { id: 'dfa_trace', label: 'S01 · DFA trace (test strings)', ready: true },
      { id: 'dfa_design', label: 'S02 · DFA design', ready: true },
      { id: 'min_table', label: 'S03 · Minimisation (table filling)', ready: true },
      { id: 'min_partition', label: 'S03 · Minimisation (partition refinement)', ready: true },
      { id: 'eps_closure', label: 'S05 · ε-closure and ε-NFA trace', ready: true },
      { id: 'eps_removal', label: 'S06 · ε-removal', ready: true },
      { id: 'moore_mealy', label: 'S07 · Moore and Mealy machines', ready: true }
    ]
  },
  {
    group: 'Module 3 · Regular expressions (Ebram)',
    items: [
      { id: 'regex', label: 'S09 · Regex and identities', ready: true },
      { id: 'state_elimination', label: 'S10 · FA → regex (state elimination / Arden)', ready: true },
      { id: 'thompson', label: 'S11 · Regex → ε-NFA (Thompson)', ready: true },
      { id: 'product', label: 'S12 · Product construction and complement', ready: true },
      { id: 'pumping', label: 'S13 · Pumping lemma', ready: true }
    ]
  },
  {
    group: 'Module 5 · Grammars and PDAs (Noor)',
    items: [
      { id: 'cfg', label: 'S17 · Linear grammars, CFGs and derivations', ready: true },
      { id: 'ambiguity', label: 'S18 · Derivation trees and ambiguity', ready: true },
      { id: 'simplification', label: 'S18 · CFG simplification', ready: true },
      { id: 'cnf_gnf', label: 'S19 · CNF and GNF', ready: true },
      { id: 'pda', label: 'S20 · PDA design and trace', ready: true },
      { id: 'cfg_to_pda', label: 'S21 · CFG → PDA', ready: true }
    ]
  }
];

export const SUBSET_PRESETS = [
  {
    name: 'S04 Activity · Subset Race',
    table: `state | a        | b
→ m0  | {m0, m1} | {m0}
m1    | {m1}     | {m1, m2}
* m2  | {m2}     | {m2}`,
    notes: {
      facts: [
        { item: '{m0}', meaning: 'no a has been seen yet' },
        { item: '{m0,m1}', meaning: 'an a has been seen, but no b has followed it yet' },
        { item: '{m0,m1,m2}', meaning: 'an a has been seen and a b has followed it somewhere later (accepting, absorbing)' }
      ],
      language: 'All strings over {a,b} in which some a is followed, somewhere later, by a b: (a|b)* a (a|b)* b (a|b)*.'
    },
    // Model answer table, used by the test script to check the generator
    expected: {
      '{m0}': { a: '{m0,m1}', b: '{m0}' },
      '{m0,m1}': { a: '{m0,m1}', b: '{m0,m1,m2}' },
      '{m0,m1,m2}': { a: '{m0,m1,m2}', b: '{m0,m1,m2}' }
    },
    expectedFinal: ['{m0,m1,m2}']
  },
  {
    name: 'S04 Q1 · No empty set',
    table: `state | 0    | 1
→ x0  | {x0} | {x0, x1}
x1    | {x2} | ∅
* x2  | ∅    | ∅`,
    notes: {
      facts: [
        { item: '{x0}', meaning: 'the last symbol read was not a 1, or nothing has been read yet' },
        { item: '{x0,x1}', meaning: 'the last symbol read was a 1' },
        { item: '{x0,x2}', meaning: 'the last two symbols were 1 then 0 (accepting)' }
      ],
      language: 'All strings over {0,1} that end with 10.'
    },
    expected: {
      '{x0}': { 0: '{x0}', 1: '{x0,x1}' },
      '{x0,x1}': { 0: '{x0,x2}', 1: '{x0,x1}' },
      '{x0,x2}': { 0: '{x0}', 1: '{x0,x1}' }
    },
    expectedFinal: ['{x0,x2}']
  },
  {
    name: 'S04 Q2 · With the empty set',
    table: `state | a    | b
→ y0  | {y1} | {y2}
y1    | {y1} | {y3}
y2    | {y3} | {y2}
* y3  | ∅    | ∅`,
    notes: {
      facts: [
        { item: '{y0}', meaning: 'nothing has been read yet' },
        { item: '{y1}', meaning: 'the input so far is a run of a’s (at least one)' },
        { item: '{y2}', meaning: 'the input so far is a run of b’s (at least one)' },
        { item: '{y3}', meaning: 'a run of one letter was ended by a single other letter (accepting)' },
        { item: '∅', meaning: 'something was read after that ending; every path has died' }
      ],
      language: 'A run of a’s ended by a single b, or a run of b’s ended by a single a: { aⁿb : n ≥ 1 } ∪ { bⁿa : n ≥ 1 }.'
    },
    expected: {
      '{y0}': { a: '{y1}', b: '{y2}' },
      '{y1}': { a: '{y1}', b: '{y3}' },
      '{y2}': { a: '{y3}', b: '{y2}' },
      '{y3}': { a: '∅', b: '∅' },
      '∅': { a: '∅', b: '∅' }
    },
    expectedFinal: ['{y3}']
  }
];

export const REGEX_PRESETS = [
  {
    name: 'S09 · Distributive law vs non-equivalence',
    r1: 'a(b|c)',
    r2: 'ab|ac',
    equivalent: true
  },
  {
    name: 'S09 · Famous trap: (a|b)* vs a*|b*',
    r1: '(a|b)*',
    r2: 'a*|b*',
    equivalent: false,
    witness: 'ab'
  },
  {
    name: 'S09 · Star absorption: (a*b*)* vs (a|b)*',
    r1: '(a*b*)*',
    r2: '(a|b)*',
    equivalent: true
  }
];

export const THOMPSON_PRESETS = [
  {
    name: 'S11 · Ends in abb: (a|b)*abb',
    regex: '(a|b)*abb',
    strings: ['abb', 'aabb', 'babb', 'ab', 'b']
  },
  {
    name: 'S11 · Begins & ends in 0: 0(0|1)*0',
    regex: '0(0|1)*0',
    strings: ['00', '010', '0110', '0', '01']
  },
  {
    name: 'S11 · Star blocks: (00|11)*',
    regex: '(00|11)*',
    strings: ['00', '11', '0011', '01', '']
  }
];

export const PRODUCT_PRESETS = [
  {
    name: 'S12 · Even a’s and ends in b',
    table1: `state | a  | b\n→* q0 | q1 | q0\n   q1 | q0 | q1`,
    table2: `state | a  | b\n→ s0  | s0 | s1\n* s1  | s0 | s1`,
    op: 'intersection'
  }
];

export const PUMPING_PRESETS_LIST = [
  { name: 'S13 · 0ⁿ1ⁿ (Equal 0s and 1s)', key: '0ⁿ1ⁿ' },
  { name: 'S13 · aⁿb²ⁿ (Twice as many b as a)', key: 'aⁿb²ⁿ' },
  { name: 'S13 · ww (Duplicated strings)', key: 'ww' },
  { name: 'S13 · 1ⁿ² (Square length)', key: '1ⁿ²' },
  { name: 'S13 · 0ⁱ1ʲ (i > j)', key: '0ⁱ1ʲ (i > j)' }
];
