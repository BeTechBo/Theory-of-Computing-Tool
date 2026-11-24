// Worked examples for Module 5 (S17–S21), taken from the session walkthroughs and practice
// questions. "notes" carries what code cannot compute: what each variable (or state) MEANS and
// the language in one sentence, written in our own words. For inputs that are not presets the
// AI helper writes these. "expect" is what the model answers give; scripts/test-grammar.mjs
// checks the solvers against it.

import { parseGrammar, grammarText } from './grammar.js';
import { parsePda, pdaText } from './pdaMachine.js';

export const GRAMMAR_PRESETS = [
  {
    id: 'anbn',
    name: 'S17 · aⁿbⁿ in one production',
    text: 'S → aSb | ε',
    notes: {
      facts: [{ item: 'S', meaning: 'a block of a’s followed by a block of b’s of exactly the same length (aⁿbⁿ)' }],
      language: '{ aⁿbⁿ : n ≥ 0 }: some a’s, then exactly as many b’s. Each use of S → aSb adds one a and one b together, so neither count can run ahead.'
    }
  },
  {
    id: 'equal',
    name: 'S17 · EQUAL (three variables)',
    text: 'S → aB | bA | ε\nA → aS | bAA | a\nB → bS | aBB | b',
    notes: {
      facts: [
        { item: 'S', meaning: 'exactly the strings with as many a’s as b’s' },
        { item: 'A', meaning: 'exactly the strings with one more a than b' },
        { item: 'B', meaning: 'exactly the strings with one more b than a' }
      ],
      language: 'EQUAL = { w ∈ {a,b}* : #a(w) = #b(w) }: every string with equally many a’s and b’s, in any order.'
    }
  },
  {
    id: 'order',
    name: 'S17 Activity · Grammar for your order',
    text: 'O → ZDX\nZ → s | m | l\nD → c | t\nX → wE | ε\nE → A | A&E\nA → h | o',
    notes: {
      facts: [
        { item: 'O', meaning: 'a whole order: a size, a drink, then the optional extras' },
        { item: 'Z', meaning: 'the size: s, m or l' },
        { item: 'D', meaning: 'the drink: c (coffee) or t (tea)' },
        { item: 'X', meaning: 'nothing, or w ("with") followed by a list of extras' },
        { item: 'E', meaning: 'a list of one or more extras joined by &' },
        { item: 'A', meaning: 'one extra: h (shot) or o (oat milk)' }
      ],
      language: 'An order: one size (s, m, l), one drink (c, t), then optionally w and one or more extras (h, o) joined by &. As a pattern: [sml][ct](w[ho](&[ho])*)?'
    }
  },
  {
    id: 'expr',
    name: 'S18 Activity · Two trees, one string',
    text: 'E → E+E | E×E | a',
    notes: {
      facts: [{ item: 'E', meaning: 'an expression: a’s joined by + and × in any order' }],
      language: 'The alternating strings a, a+a, a×a, a+a×a, …: a’s separated by single operators, ( a (+ | ×) )* a.'
    }
  },
  {
    id: 's18-walk',
    name: 'S18 · All four steps on one grammar',
    text: 'S → AB | b\nA → aA | ε\nB → bC | b\nC → A',
    notes: {
      facts: [
        { item: 'S', meaning: 'a run of a’s, one b, then a run of a’s (a*ba*)' },
        { item: 'A', meaning: 'any run of a’s, possibly empty (a*)' },
        { item: 'B', meaning: 'one b followed by any run of a’s (ba*)' },
        { item: 'C', meaning: 'the same as A: any run of a’s (a*)' }
      ],
      language: 'a*ba*: every string over {a,b} with exactly one b.'
    },
    expect: { simplified: 'S → AB | b | bC\nA → aA | a\nB → bC | b\nC → aA | a' }
  },
  {
    id: 's18-q1',
    name: 'S18 Q1 · A chain of unit productions',
    text: 'G = ( {S, X, Y, Z, M, N}, {a, b, c}, P, S )\nS → XY\nX → a\nY → Z | b\nZ → M\nM → N\nN → a',
    notes: { language: '{ aa, ab }: exactly two strings (the terminal c is never used).' },
    expect: { simplified: 'S → XY\nX → a\nY → b | a', terminals: ['a', 'b'] }
  },
  {
    id: 's18-q2',
    name: 'S18 Q2 · Simplification with ε-productions',
    text: 'S → ASA | aB | b\nA → B\nB → b | ε',
    notes: {},
    expect: { simplified: 'S → ASA | SA | AS | aB | a | b\nA → b\nB → b' }
  },
  {
    id: 's19-relay',
    name: 'S19 Activity · CNF conversion relay',
    text: 'S → ASA | aB\nA → B | S\nB → b | ε',
    notes: {
      facts: [
        { item: 'S', meaning: 'every string over {a,b} that contains at least one a' },
        { item: 'A', meaning: 'ε, b, or anything S generates' },
        { item: 'B', meaning: 'b or ε' }
      ],
      language: 'All strings over {a,b} that contain at least one a.'
    },
    expect: { cnf: 'S0 → A D1 | SA | AS | Ca B | a\nS → A D1 | SA | AS | Ca B | a\nA → b | A D1 | SA | AS | Ca B | a\nB → b\nCa → a\nD1 → SA' }
  },
  {
    id: 's19-ex1',
    name: 'S19 · EQUAL − {ε} to CNF',
    text: 'S → aB | bA\nA → aS | bAA | a\nB → bS | aBB | b',
    notes: {
      facts: [
        { item: 'S', meaning: 'non-empty strings with as many a’s as b’s' },
        { item: 'A', meaning: 'strings with exactly one more a than b' },
        { item: 'B', meaning: 'strings with exactly one more b than a' }
      ],
      language: 'EQUAL − {ε}: every non-empty string over {a,b} with equally many a’s and b’s.'
    },
    expect: { cnfLinz: 'S → Ca B | Cb A\nA → Ca S | Cb D1 | a\nB → Cb S | Ca D2 | b\nCa → a\nCb → b\nD1 → AA\nD2 → BB' }
  },
  {
    id: 's19-q2',
    name: 'S19 Q2 · A conversion where ε is in the language',
    text: 'S → aSb | bSa | SS | ε',
    notes: { facts: [{ item: 'S', meaning: 'every string with as many a’s as b’s' }], language: 'EQUAL: every string over {a,b} with equally many a’s and b’s (ε included).' },
    expect: { cnf: 'S0 → ε | Ca D1 | Ca Cb | Cb D2 | Cb Ca | SS\nS → Ca D1 | Ca Cb | Cb D2 | Cb Ca | SS\nCa → a\nCb → b\nD1 → S Cb\nD2 → S Ca' }
  },
  {
    id: 's21-walk',
    name: 'S21 · One grammar, converted and then run',
    text: 'S → aBc | ab\nB → SB | ε',
    notes: { language: 'L(G) = { ab, ac, aabc, aacc, aaabcc, … }: an a, then nested members of the language, closed by b or by c.' },
    expect: { transitions: 9 }
  },
  {
    id: 's21-q1',
    name: 'S21 Q1 · Convert, then trace',
    text: 'S → aSb | bSa | ε',
    notes: {
      facts: [{ item: 'S', meaning: 'ε, or a shorter member wrapped in a…b or in b…a' }],
      language: 'The strings built by wrapping a…b or b…a pairs around a shorter member. All have equally many a’s and b’s, but not every such string is in it: abba is not.'
    },
    expect: { transitions: 7 }
  }
];

export const PDA_PRESETS = [
  {
    id: 'pda-anbn',
    name: 'S20 · A PDA for aⁿbⁿ',
    text: 'M = ({q0, q1, q2}, {a, b}, {X, Z}, δ, q0, Z, {q2})\nδ(q0, a, Z) = (q0, XZ)\nδ(q0, a, X) = (q0, XX)\nδ(q0, b, X) = (q1, ε)\nδ(q1, b, X) = (q1, ε)\nδ(q1, ε, Z) = (q2, Z)',
    notes: {
      facts: [
        { item: 'q0', meaning: 'still reading a’s: the stack holds one X for every a read so far' },
        { item: 'q1', meaning: 'reading b’s: each b has cancelled one X' },
        { item: 'q2', meaning: 'every a has been matched by a b (accepting)' },
        { item: 'X', meaning: 'one a that is still waiting for its b' },
        { item: 'Z', meaning: 'the bottom marker: when it is on top again, the count is back to zero' }
      ],
      language: '{ aⁿbⁿ : n ≥ 1 }: a block of a’s followed by a block of b’s of the same length.'
    }
  },
  {
    id: 'pda-equal',
    name: 'S20 Q2 · One state, empty stack (#a = #b)',
    text: 'δ(q0, a, Z) = (q0, PZ)\nδ(q0, b, Z) = (q0, NZ)\nδ(q0, a, P) = (q0, PP)\nδ(q0, b, N) = (q0, NN)\nδ(q0, a, N) = (q0, ε)\nδ(q0, b, P) = (q0, ε)\nδ(q0, ε, Z) = (q0, ε)\nbottom: Z\naccept: empty stack',
    notes: {
      facts: [
        { item: 'q0', meaning: 'the only state: everything the machine knows is on the stack' },
        { item: 'P', meaning: 'one surplus a (the a’s are ahead)' },
        { item: 'N', meaning: 'one surplus b (the b’s are ahead)' },
        { item: 'Z', meaning: 'the bottom marker: only Z left means the counts are equal' }
      ],
      language: '{ w ∈ {a,b}* : #a(w) = #b(w) }: equally many a’s and b’s. The stack is a signed counter.'
    }
  },
  {
    id: 'pda-wwr',
    name: 'S20 · wwᴿ needs a guess',
    text: 'δ(q0, a, Z) = (q0, AZ)\nδ(q0, b, Z) = (q0, BZ)\nδ(q0, a, A) = (q0, AA)\nδ(q0, a, B) = (q0, AB)\nδ(q0, b, A) = (q0, BA)\nδ(q0, b, B) = (q0, BB)\nδ(q0, ε, Z) = (q1, Z)\nδ(q0, ε, A) = (q1, A)\nδ(q0, ε, B) = (q1, B)\nδ(q1, a, A) = (q1, ε)\nδ(q1, b, B) = (q1, ε)\nδ(q1, ε, Z) = (q1, ε)\nbottom: Z\naccept: empty stack',
    notes: {
      facts: [
        { item: 'q0', meaning: 'first half: every symbol read is pushed (A for a, B for b)' },
        { item: 'q1', meaning: 'second half: every symbol read must cancel the symbol on top' },
        { item: 'A', meaning: 'an a of the first half, waiting for its mirror image' },
        { item: 'B', meaning: 'a b of the first half, waiting for its mirror image' },
        { item: 'Z', meaning: 'the bottom marker: popped at the very end, which empties the stack' }
      ],
      language: '{ wwᴿ : w ∈ {a,b}* }: the even-length palindromes. Nothing marks the middle, so the switch from pushing to matching is a guess.'
    }
  }
];

const norm = s => s.replace(/\s+/g, ' ').trim();
const grammarKeys = GRAMMAR_PRESETS.map(p => ({ key: norm(grammarText(parseGrammar(p.text))), notes: p.notes }));
const pdaKeys = PDA_PRESETS.map(p => ({ key: norm(pdaText(parsePda(p.text).pda)), notes: p.notes }));

export const grammarNotes = g => grammarKeys.find(p => p.key === norm(grammarText(g)))?.notes || {};
export const pdaNotes = p => pdaKeys.find(x => x.key === norm(pdaText(p)))?.notes || {};
export const presetGrammar = id => GRAMMAR_PRESETS.find(p => p.id === id);
export const presetPda = id => PDA_PRESETS.find(p => p.id === id);
