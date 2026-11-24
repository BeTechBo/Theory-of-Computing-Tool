// Course knowledge for Module 5 (S17–S21: grammars and pushdown automata), in the same shape
// as courseNotes.js and written in our own words from the session slides (no slide text is
// copied: the repo is public). The server picks the best-matching notes for each message.

export const GRAMMAR_NOTES = [
  {
    session: 'S17',
    title: 'Grammars: linear grammars, context-free grammars, derivations',
    keywords: ['grammar', 'production', 'derivation', 'derive', 'right-linear', 'left-linear', 'linear', 'context-free', 'cfg', 'chomsky hierarchy', 'type 3', 'type 2', 'sentential', 'variable', 'terminal', 'generate', 'aⁿbⁿ', 'over-generat', 'under-generat'],
    text: `
- A grammar is G = (V, T, P, S): variables (uppercase), terminals (lowercase), productions, start symbol. Give all four; a list of productions alone is not a grammar. α ⇒ β is one step using one production, ⇒* is zero or more steps, and L(G) = { w ∈ T* : S ⇒* w }. A sentential form may still contain variables.
- The type is read off the SHAPE of the productions and nothing else. Right-linear: every production is A → wB or A → w (the variable at the right end). Left-linear: A → Bw or A → w. Both are Type 3 and generate exactly the regular languages. A Type 3 grammar must be ALL right-linear or ALL left-linear: S → aB, B → Sb | b mixes the shapes and generates { aⁿbⁿ : n ≥ 1 }, which is not regular. Linear (one variable anywhere, as in S → aSb) is only Type 2.
- The type of the grammar is not the class of the language: S → AB, A → aA | ε, B → bB | ε is Type 2 only, but generates a*b*, which is regular. Answer the two questions separately.
- DFA → right-linear grammar, five steps: (1) each state becomes a variable, the start state the start symbol; (2) for δ(q, a) = p add q → ap; (3) if p is accepting ALSO add q → a (forgetting this gives L(G) = ∅); (4) if the start state is accepting add a fresh S → q0 | ε (never q0 → ε, because q0 occurs on right-hand sides); (5) discard useless variables (dead states). A derivation beside a run: the one variable at the end of the sentential form is the current state.
- Left-linear: build a right-linear grammar for the reverse language, then reverse every right-hand side.
- Context-free (Type 2): A → α with any α. Design by finding the pairing: what must be produced together in one production. S → aSb | ε gives { aⁿbⁿ }; S → aSa | bSb | a | b | ε gives the palindromes; S → (S) | SS | ε balanced brackets. EQUAL: S → aB | bA | ε, A → aS | bAA | a, B → bS | aBB | b, where A means "one more a than b" and B "one more b than a". Count the situations first, then give each one a variable.
- In a derivation, name the production used at every step: that is where the marks are. Check a grammar both ways: over-generation (it makes a string it should not: writing A → aA | ε instead of A → aA | a lets ab into { aᵐbⁿ : m ≠ n }) and under-generation. Decide whether ε belongs to L before writing any production.`
  },
  {
    session: 'S18',
    title: 'Derivation trees and ambiguity',
    keywords: ['derivation tree', 'parse tree', 'tree', 'yield', 'leftmost', 'rightmost', 'ambiguous', 'ambiguity', 'two trees', 'precedence', 'inherently', 'inherent', 'unambiguous'],
    text: `
- A derivation tree: the root is S, interior nodes are variables, the children of a node spell out one production from left to right, and an ε-leaf is an only child. The yield is the leaves read left to right. S ⇒* w exactly when some tree has yield w.
- One tree has many derivations, but exactly one leftmost derivation (its preorder traversal) and one rightmost. So "ambiguous" means some string has two different TREES, equivalently two different leftmost derivations. Two derivations of the same tree are NOT ambiguity.
- To show ambiguity, give the shortest string with two trees and draw both (or write both leftmost derivations). For E → E+E | E×E | a the shortest witnesses have five symbols (a+a×a, a+a+a, a×a×a); a+a has one tree. For S → aS | Sa | a the string aⁿ has 2ⁿ⁻¹ trees.
- Ambiguity is a property of the GRAMMAR, not of the language: a⁺ also has the unambiguous grammar S → aS | a.
- Repair with one variable per precedence level, the tighter operator deeper: E → E+T | T, T → T×F | F, F → a (add F → (E) for brackets). There is no algorithm that removes ambiguity, and none that decides it.
- An inherently ambiguous language is one where EVERY grammar is ambiguous. The example to name: { aⁿbⁿcᵐdᵐ } ∪ { aⁿbᵐcᵐdⁿ } with n, m ≥ 1; abcd is in both halves and gets one tree from each. Proving it is not examinable.`
  },
  {
    session: 'S18',
    title: 'Simplifying a CFG: useless symbols, ε-productions, unit productions',
    keywords: ['simplify', 'simplification', 'useless', 'generating', 'reachable', 'unreachable', 'nullable', 'ε-production', 'epsilon production', 'unit production', 'unit', 'chain', 'clean up'],
    text: `
- Fixed order: 1a remove non-generating variables, 1b remove unreachable symbols, 2 remove ε-productions, 3 remove unit productions, 4 remove useless symbols again. Each step works on the previous step's output; write the whole grammar after every step; a step that changes nothing must still be recorded.
- 1a (bottom-up): A is generating if some production of A has only terminals and generating variables on the right (A → ε counts). 1b (top-down from S): keep what S can reach. 1a must come before 1b: in S → AB | a, A → a (B has no productions) 1a deletes B and S → AB, then 1b deletes A; the other order leaves A behind.
- Step 2: nullable = the variables that derive ε (A → ε, or a right-hand side made of nullable variables only; follow the chains). For each production write every combination with the nullable symbols present or absent, but never all absent; then delete the ε-productions. S → ASA with A nullable gives ASA | SA | AS | S. If S is nullable then ε ∈ L(G) and the new grammar generates L(G) − {ε}: say so.
- Step 3: list the unit productions of the CURRENT grammar (step 2 creates new ones, such as S → B or S → S). Follow every chain to its end: if A ⇒* B by unit productions, A receives all of B's non-unit productions. A → A simply disappears. Mind cycles.
- Step 4 is not redundant: removing a unit production can delete the only arrow into a variable (Y → Z, Z → M, M → N: after step 3, Z, M and N are unreachable). A terminal that appears in no production is useless too.
- Finish by naming L(G) and checking a couple of short strings by hand. Common errors: dropping all the nullable symbols at once; looking for unit productions in the original grammar; following one link instead of the whole chain.`
  },
  {
    session: 'S19',
    title: 'Chomsky and Greibach normal forms',
    keywords: ['cnf', 'chomsky', 'normal form', 'gnf', 'greibach', 'left recursion', 'left-recursion', '2n-1', '2n − 1', 's0', 'binary tree'],
    text: `
- CNF: every production is A → BC or A → a. This course uses Sipser's version: S0 → ε is allowed for the start symbol only, and the start symbol may not appear on any right-hand side. (The Linz version has no ε at all; say which one you use.)
- Five steps, in order, each on the previous output: (1) decide whether ε ∈ L(G), and add S0 → S when S occurs on a right-hand side; (2) remove ε-productions (S18 step 2; if ε ∈ L, S0 → ε returns at the very end); (3) remove unit productions, including the ones steps 1 and 2 created (S18 step 3); (4a) for every terminal a inside a right-hand side of length ≥ 2 add Ca → a and replace it: a terminal ANYWHERE, not only in front, and never touch A → a; (4b) break right-hand sides longer than two: A → B1B2…Bm becomes A → B1D1, D1 → B2D2, … with m − 2 new variables (identical tails may share one).
- Check at the end: every production is two variables or one terminal; the start symbol is on no right-hand side; ε comes only from the start symbol; derive one short string in both grammars.
- Payoff: in CNF a string of length n is derived in exactly 2n − 1 steps (n − 1 splits and n terminal steps), so membership is a finite search. CNF does not remove ambiguity and does not shrink the grammar: every string keeps its number of trees.
- Worked example: S → ASA | aB, A → B | S, B → b | ε becomes S0 → AD1 | SA | AS | CaB | a, S the same, A → b | AD1 | SA | AS | CaB | a, B → b, Ca → a, D1 → SA.
- GNF: every production is A → aα with α a string of variables. A string of length n takes exactly n steps, and a GNF production is a PDA instruction (read a, pop A, push α). The full conversion is not examinable; recognising the form is. Left recursion is the obstacle: A → Aα | β becomes A → βA′ | β, A′ → αA′ | α (S → Sa | b becomes S → bA | b, A → aA | a).
- A grammar is in a normal form only if EVERY production fits; one bad production settles it.`
  },
  {
    session: 'S20',
    title: 'Pushdown automata: definition, IDs, acceptance, determinism',
    keywords: ['pda', 'pushdown', 'stack', 'push', 'pop', 'bottom marker', 'z0', 'instantaneous', 'configuration', '⊢', 'empty stack', 'final state', 'dpda', 'deterministic pda', 'wwr', 'wcw', 'seven-tuple', '7-tuple'],
    text: `
- M = (Q, Σ, Γ, δ, q0, Z0, F): Γ is the stack alphabet and Z0 the bottom marker, the only symbol on the stack at the start. δ(q, a, Z) is a set of pairs (p, γ): in state q, reading a (or ε), with Z on top, go to p and replace Z by the string γ. γ = ε is a pop, γ = Z leaves the stack alone, γ = XZ pushes X. One operation, three choices of γ.
- The stack is written TOP FIRST: δ(q, a, Z) = (p, XZ) puts X above Z. An ID is (state, unread input, stack). A trace is a list of IDs, one ⊢ per line, each justified by the transition used. Count the moves: the ε-moves are the ones forgotten (aabb on the aⁿbⁿ machine takes 5 moves, not 4).
- Design in four questions: what must be remembered (a count, or the symbols themselves)? when to push, and what (two symbols per input symbol for a 2:1 ratio)? when to switch from pushing to popping (a visible symbol, or a guess)? which acceptance mode?
- aⁿbⁿ with n ≥ 1: δ(q0,a,Z) = (q0,XZ), δ(q0,a,X) = (q0,XX), δ(q0,b,X) = (q1,ε), δ(q1,b,X) = (q1,ε), δ(q1,ε,Z) = (q2,Z), F = {q2}. The last ε-move is the test that the count is back to zero; without it L(M) = ∅.
- Acceptance: by final state (input finished in a state of F; the stack may hold anything) or by empty stack (input finished and the stack empty, marker included; F = ∅). Same class of languages; always say which mode. A PDA with no applicable move is stuck and that branch rejects: no dead state is needed.
- Deterministic iff (rule 1) |δ(q, a, Z)| ≤ 1 for every a ∈ Σ ∪ {ε}, and (rule 2) if δ(q, ε, Z) ≠ ∅ then δ(q, a, Z) = ∅ for every a ∈ Σ. Rule 2 is the forgotten one; an empty-stack machine that pops its marker by an ε-move usually breaks it.
- Nondeterminism adds real power here: DPDA ⊊ PDA. wcwᴿ is deterministic because the c marks the middle; wwᴿ needs a guess and has no DPDA. A nondeterministic machine accepts if SOME branch accepts; show the accepting branch and one that gets stuck.`
  },
  {
    session: 'S21',
    title: 'CFG → PDA (the three rules) and PDA → CFG',
    keywords: ['cfg to pda', 'grammar to pda', 'grammar to machine', 'cfg → pda', 'three-rule', 'three rule', 'expand', 'match', 'q_loop', 'pda to cfg', 'triple', 'equivalen', 'sentential form'],
    text: `
- Grammar → machine, always three states q_s, q_loop, q_f. START: q_s —ε, $ → S$→ q_loop (push S above a fresh marker $). EXPAND: one loop ε, A → w at q_loop for every production A → w. MATCH: one loop a, a → ε for every terminal a. ACCEPT: q_loop —ε, $ → ε→ q_f. It accepts by final state. The number of transitions is |P| + |T| + 2: predict it first.
- The stack always holds the unmatched tail of the current sentential form, top on the left, so A → w is pushed as written (not reversed). Γ contains the variables AND the terminals. An ε-production gives the legal transition ε, A → ε (a pop), and it is the one most often left out; the match loops are the most-omitted family.
- Trace with a third column for the sentential form: reading it downwards gives the leftmost derivation. The machine is nondeterministic wherever the grammar offers a choice; a string that is not in L(G) is rejected because every branch gets stuck.
- From a normal form the machine has ONE state, Z0 = S, and accepts by empty stack. From GNF each A → aα becomes a, A → α (exactly n moves on a string of length n). From CNF, A → BC becomes ε, A → BC and A → a becomes a, A → ε (2n − 1 moves).
- Machine → grammar uses variables [q A p] ("the strings that take the machine from q to p while removing A"); it is shown once and is not examinable. The two directions together give CFL = PDA-recognisable, so a language can be shown context-free by a grammar OR by a machine.
- Every regular language has a deterministic PDA that ignores its stack: regular ⊊ deterministic CFL ⊊ CFL, with { aⁿbⁿ } and { wwᴿ } as the witnesses.`
  }
];

// Which note matches each Module 5 technique (used to pick the notes for a request).
export const GRAMMAR_TECHNIQUE_SESSION = {
  cfg: 'S17 grammar derivation',
  ambiguity: 'S18 derivation tree ambiguity',
  simplification: 'S18 simplification useless nullable unit production',
  cnf_gnf: 'S19 chomsky greibach normal form',
  pda: 'S20 pushdown pda stack',
  cfg_to_pda: 'S21 cfg to pda'
};
