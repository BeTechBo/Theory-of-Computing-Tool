// Follow-up questions for Module 5 (S17–S21: grammars and pushdown automata), with ready-made
// answers written in our own words from the session slides. With the AI connected, the AI
// answers instead (using the course notes).

export const GRAMMAR_FOLLOW_UPS = {
  cfg: ['Why is S → aSb not Type 3?', 'Why can the two linear shapes not be mixed?', 'Leftmost or rightmost: does it matter?'],
  ambiguity: ['Why are two derivations not enough?', 'What is an inherently ambiguous language?', 'Why does one variable per level fix it?'],
  simplification: ['Why must 1a come before 1b?', 'Why is step 4 not redundant?', 'What happens to ε if it is in L(G)?'],
  cnf_gnf: ['Why exactly 2n − 1 steps?', 'Does CNF remove ambiguity?', 'What is Greibach normal form for?'],
  pda: ['Why does the stack need a bottom marker?', 'Final state or empty stack?', 'Why is wwᴿ not deterministic?'],
  cfg_to_pda: ['Why always three states?', 'Why are terminals in the stack alphabet?', 'What if I forget the ε-production?']
};

export const GRAMMAR_READY_ANSWERS = {
  'Why is S → aSb not Type 3?': `Because its variable sits in the **middle** of the right-hand side.
- Type 3 (regular) needs every production to be right-linear (A → wB) or every one left-linear (A → Bw): the variable pinned to one end.
- With the variable at an end, the grammar can only walk along the string, like a DFA walks along its input.
- In the middle it grows the string outwards from the centre, an a and a b together. That is how it produces aⁿbⁿ, which no finite automaton accepts (Session 13).`,

  'Why can the two linear shapes not be mixed?': `Because "right-linear" is a condition on **every** production, not on each one separately.
- S → aB is right-linear and B → Sb | b is left-linear, but together they generate { aⁿbⁿ : n ≥ 1 }, which is not regular.
- A grammar that mixes the two shapes is merely **linear** (Type 2). Only ALL right-linear or ALL left-linear gives Type 3.`,

  'Leftmost or rightmost: does it matter?': `Not for the answer: both describe the **same tree**.
- A derivation is a sequence; the order of expansion is an accident of how you wrote it down.
- Each tree has exactly one leftmost derivation (its preorder traversal) and exactly one rightmost one.
- That is why ambiguity is defined on trees: count trees, or count leftmost derivations, and you get the same number.`,

  'Why are two derivations not enough?': `Because one tree has many derivations.
- S ⇒ AB ⇒ aB ⇒ ab and S ⇒ AB ⇒ Ab ⇒ ab differ only in which variable was expanded first: same tree, so no ambiguity.
- Ambiguity needs two **different trees** for one string (equivalently, two different LEFTMOST derivations).
- So when you exhibit ambiguity, draw both trees or write both leftmost derivations.`,

  'What is an inherently ambiguous language?': `A context-free language for which **every** grammar is ambiguous: there is no good grammar to switch to.
- The course example is { aⁿbⁿcᵐdᵐ } ∪ { aⁿbᵐcᵐdⁿ }.
- A string like abcd is in both halves, and any grammar has to be able to build it both ways, because the two halves pair the letters differently.
- More variables cannot help. This is the one case where "the grammar is ambiguous" cannot be repaired. It is rare.`,

  'Why does one variable per level fix it?': `Because the grammar then leaves no choice about what groups with what.
- In E → E + T | T, T → T × F | F, F → a, a × can only be produced inside a T, and a T sits below the +.
- So × always binds tighter than +, and the left recursion (E → E + T) makes each operator group to the left.
- Same language, exactly one tree per string. Swap E and T to swap the precedence.`,

  'Why must 1a come before 1b?': `Because removing non-generating variables can make other symbols unreachable, but never the other way round.
- Take S → AB | a, A → a. B has no productions, so it generates nothing.
- 1a then 1b: 1a deletes B and S → AB; then 1b sees that A is unreachable. Result: S → a.
- 1b then 1a: 1b changes nothing, 1a deletes B and S → AB, and the useless A is left behind.
- The language is the same either way, so the wrong order goes unnoticed. It just does not finish the job.`,

  'Why is step 4 not redundant?': `Because steps 2 and 3 create new useless symbols.
- Deleting a unit production can remove the only arrow into a variable.
- Example: Y → Z, Z → M, M → N, N → a. After step 3, Y → a and nothing mentions Z, M or N any more: they are unreachable.
- Step 4 collects them. Every step runs on the output of the step before it, never on the original.`,

  'What happens to ε if it is in L(G)?': `It is lost: after step 2 the grammar generates L(G) − {ε}.
- Removing ε-productions removes every way to derive the empty string.
- ε ∈ L(G) exactly when S is nullable, so check that first and say so in your answer.
- In Chomsky normal form (Sipser's version) ε comes back at the very end as S0 → ε, for the start symbol only.`,

  'Why exactly 2n − 1 steps?': `Because in CNF nothing can shorten a sentential form and nothing can leave it unchanged.
- A → BC replaces one variable by two: the form gets exactly one symbol longer.
- A → a turns one variable into one terminal: same length, one variable retired.
- To reach n terminals you need n − 1 splits and n terminal steps: 2n − 1, exactly.
- So the search for a derivation is finite, and membership is decidable (CYK, Session 24).`,

  'Does CNF remove ambiguity?': `No. A normal form constrains the **shape** of the productions, not the number of ways to build a string.
- Each step of the conversion re-encodes productions locally; it never merges two trees or creates a new one.
- A string has exactly as many derivation trees after the conversion as before.
- Evidence from the course: an inherently ambiguous language stays ambiguous in CNF.`,

  'What is Greibach normal form for?': `Every production is A → aα: one terminal first, then variables only.
- Each step emits exactly one terminal, so a string of length n takes exactly n steps, left to right.
- That is a stack machine's program: read a, pop A, push α. Session 21 turns a GNF grammar into a one-state PDA by copying it out.
- The obstacle on the way is left recursion (A → Aα), removed with a new variable: A → βA′ | β, A′ → αA′ | α.`,

  'Why does the stack need a bottom marker?': `Because the machine can only look at the top symbol, so it cannot tell "empty" from "nothing I am allowed to see".
- The marker Z₀ is on the stack before anything is read. Seeing it on top again means everything pushed has been matched.
- The acceptance test is then expressible: δ(q1, ε, Z) = (q2, Z).
- Without that last ε-move the accepting state is unreachable and L(M) = ∅.`,

  'Final state or empty stack?': `Either: the two modes accept the same class of languages, but a machine must say which it uses.
- Final state: the input is finished in a state of F; the stack may hold anything.
- Empty stack: the input is finished and the stack is empty, bottom marker included; the state does not matter and F = ∅.
- Marks are lost by a machine that would accept under one convention and not the other, with no statement of which is meant.`,

  'Why is wwᴿ not deterministic?': `Because nothing in the input marks the middle.
- The machine must switch from pushing to matching exactly at the midpoint, and it can only do that with an ε-move taken on a guess.
- A nondeterministic PDA tries every midpoint; one branch is right, and one is enough.
- In wcwᴿ the c marks the middle, so the switch reads a real symbol and the machine is deterministic. This is the first time nondeterminism buys real power: DPDA ⊊ PDA.`,

  'Why always three states?': `Because all the grammar's content lives in the loops, not in the states.
- q_s only pushes S above the marker; q_f only says "done".
- Everything else happens at q_loop: one EXPAND loop per production and one MATCH loop per terminal.
- So the count is |P| + |T| + 2 transitions and 3 states, whatever the grammar.`,

  'Why are terminals in the stack alphabet?': `Because the stack holds **sentential forms**, and those contain terminals.
- EXPAND pushes a whole right-hand side, for example aBc, terminals included.
- MATCH then cancels a terminal on top of the stack against the same symbol in the input.
- So Γ = V ∪ T ∪ {$}. It is the one place in the course where Σ ⊆ Γ, on purpose.`,

  'What if I forget the ε-production?': `Then no derivation can stop, and the machine accepts nothing (or far too little).
- A → ε becomes the transition ε, A → ε: the top symbol is replaced by nothing, which is a pop.
- It is a legal transition and it is the one most often left out.
- Count first: one transition per production, including the ε-production.`
};
