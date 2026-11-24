// Course knowledge for the AI, written in our own words from the CSCE 4201 slides and
// model answers (the repo is public, so no slide text is copied here).
// The server picks the 1–2 most relevant notes for each message, so answers use the
// lecturer's method, notation and traps instead of a generic textbook answer.
//
// Teammates: add your sessions (S09–S13, S17–S21) in the same shape.

export const SESSION_MAP = `
Course map (CSCE 4201, Fall 2026). In scope for this tutor: S01–S21.
S01 alphabets, strings, languages; DFA formal definition and acceptance · S02 designing DFAs: "the facts come first" (invariants, trap states)
S03 DFA minimisation: partition refinement and table filling · S04 NFAs and the subset construction · S05 ε-NFAs and ε-closure
S06 removing ε-moves: ε-NFA → NFA → DFA · S07 Moore and Mealy machines (machines with output)
S09 regular expressions and identities · S10 FA → regex (state elimination, Arden) · S11 regex → ε-NFA (Thompson)
S12 closure properties: product construction, complement · S13 pumping lemma for regular languages
S17 linear grammars and CFGs, derivations · S18 derivation trees, ambiguity, CFG simplification · S19 CNF and GNF
S20 pushdown automata: definition, configurations (IDs), acceptance · S21 CFG ↔ PDA
Later sessions (S22–S25: CFL pumping lemma, CYK, Turing machines) are beyond this tutor: answer briefly and say so.
`.trim();

export const NOTES = [
  {
    session: 'S01',
    title: 'DFA formal definition, acceptance, reading a machine',
    keywords: ['dfa', 'deterministic', 'definition', 'tuple', 'accept', 'acceptance', 'trace', 'δ̂', 'delta hat', 'extended', 'language', 'alphabet', 'string', 'absorbing', 'read the machine', 'empty string', 'ε'],
    text: `
- A DFA is M = (Q, Σ, δ, q0, F). δ is total: exactly one arrow per state per symbol, so the table has |Q|×|Σ| entries. Always state this count ("|Q|×|Σ| = 3×2 = 6, and there are 6").
- Acceptance: run the whole string, one move per line (A —1→ A —0→ B …); accept iff δ̂(q0, w) ∈ F. Passing through an accepting state in the middle is worth nothing.
- ε makes zero moves, so ε is accepted iff q0 ∈ F. Whenever the start state is accepting, stop and ask whether ε really belongs to L; if not, split the start state (add a fresh non-accepting start with the same outgoing arrows).
- To READ a machine, name its states (one fact per state about the input so far) and check each arrow against the facts. "Simulation gives evidence; naming gives a proof." The marks are in the state meanings: a correct language with no meanings is capped.
- Absorbing (no way out) is about the arrows; accepting is about F. Students confuse the two.
- Example: A —0→ B, A —1→ A, B —0→ B, B —1→ C, C —0→ B, C —1→ A, F = {C}: A = nothing useful pending, B = ends in 0, C = ends in 01. L = strings ending in 01.`
  },
  {
    session: 'S02',
    title: 'Designing a DFA: the facts come first',
    keywords: ['design', 'build', 'construct', 'invariant', 'fact', 'trap', 'dead', 'divisible', 'remainder', 'mod', 'substring', 'contains', 'at least', 'even', 'odd', 'parity', 'ends with', 'preservation'],
    text: `
- Recipe: (1) name the FACTS the machine must remember about the input read so far; (2) one state per fact; (3) start state = the fact that is true of ε; (4) one arrow per state per symbol, each justified by how the fact changes; (5) mark F, then test strings (include ε and at least one rejected string).
- Facts are about the whole prefix ("odd number of a's so far"), never about transitions. Count only as far as the language cares ("none / one / two or more"). Unbounded counts become remainders: divisible by k needs k states.
- Binary value mod 3: appending bit b turns v into 2v + b, so δ(r_i, b) = r_((2i+b) mod 3).
- Trap (dead) state: a fact nothing can undo, e.g. "ab has occurred" when the language forbids ab. It is absorbing and non-accepting. More than one state may be accepting.
- Correctness proof = preservation, one arrow at a time: assume the invariant, apply the transition, show the target's invariant holds.
- Complement: in a COMPLETE DFA swap accepting and non-accepting states (this is why completeness matters).
- Common mistakes: a missing transition; invariants written as transitions; forgetting to check ε.`
  },
  {
    session: 'S03',
    title: 'DFA minimisation: partition refinement and table filling',
    keywords: ['minimise', 'minimize', 'minimal', 'minimum', 'smallest', 'partition', 'refinement', 'table filling', 'myhill', 'nerode', 'distinguishable', 'equivalent states', 'merge', 'unreachable', 'signature', 'block', 'witness'],
    text: `
- Step 1 ALWAYS: remove unreachable states (say "none" if there are none). Otherwise an unreachable state can survive as its own block and the result is not minimal; the language is unchanged, which is why the error goes unnoticed.
- Partition refinement: Round 0 = {F} | {Q − F}. Each round, give every state its signature (which block each symbol leads to, e.g. s1: a→ACC, b→ACC) and split states whose signatures differ. Stop when a round splits nothing. Each block becomes one state.
- Table filling: Pass 0 crosses every (accepting, non-accepting) pair, witness ε. Pass 1, 2, …: for each unmarked pair and each symbol, cross it if the pair it goes to is already crossed (record the witness string). A pair going to a single state, or to an unmarked pair, stays. Stop when a pass crosses nothing new; merge the unmarked pairs.
- Both methods give the same classes (uniqueness of the minimal DFA). When both are asked, say so.
- Name the blocks' facts at the end: minimisation discovers which facts are worth remembering.
- Example: s0→s1,s3 ; s1,s3 → s2,s4 ; F = {s2,s4} gives blocks {s0} | {s1,s3} | {s2,s4}, L = strings of length ≥ 2.`
  },
  {
    session: 'S04',
    title: 'NFAs and the subset construction',
    keywords: ['nfa', 'nondeterministic', 'nondeterminism', 'guess', 'subset', 'powerset', 'convert', 'nfa to dfa', 'reachable', '2^n', 'empty set', '∅', 'dead'],
    text: `
- An NFA's δ(q, a) is a SET of states (possibly ∅). It accepts w if SOME path ends in F. Nondeterminism "buys nothing": every NFA has an equivalent DFA.
- Subset construction: start at {q0}. For each new subset and each symbol, write the union of the moves in full ({m0,m1} on b → δ(m0,b) ∪ δ(m1,b) = {m0} ∪ {m1,m2} = {m0,m1,m2}) and mark new subsets. Stop when no new subset appears. Generate reachable subsets only, and state "k of 2ⁿ".
- Accepting subsets: those containing at least one NFA accepting state.
- ∅ is a real (dead) state when some union comes out empty; it loops to itself. It never appears if one state is in every reachable subset and has arrows on every symbol.
- Each subset is an invariant: the set of NFA states the input so far could have led to. E.g. {m0,m1} = "an a has been seen but no b has followed it yet".
- Listing all 2ⁿ subsets is correct but shows no understanding of reachability; the marking rewards building outward.`
  },
  {
    session: 'S05',
    title: 'ε-NFAs and ε-closure',
    keywords: ['ε-nfa', 'epsilon', 'ε-closure', 'closure', 'eps', 'ε-move', 'ε-transition', 'free move', 'close move close', 'cycle'],
    text: `
- ε-CL(q) = every state reachable from q using ε-arrows only, INCLUDING q itself (reflexive) and following chains to the end (transitive). Forgetting either rule silently rejects good strings.
- ε-arrows are one-way: ε-CL(y2) may contain y1 while ε-CL(y1) does not contain y2. States on an ε-cycle share one closure.
- Write a closure table for every state first.
- Trace a string as close → move → close: start with ε-CL(q0); for each symbol take the union of the moves of the live states, then close again. Accept iff the final live set contains a state of F.
- ε is accepted iff ε-CL(q0) contains an accepting state. If the live set becomes ∅ the string is rejected (every path died).`
  },
  {
    session: 'S06',
    title: 'Removing ε-moves (ε-NFA → NFA → DFA)',
    keywords: ['ε-removal', 'remove ε', 'removing ε', 'eliminate ε', 'epsilon removal', 'removing epsilon', 'remove epsilon', 'epsilon moves', 'ε-moves', 'kill the ε', "δ'", 'delta prime', "f'", 'f prime', 'equivalence', 'three machines', 'ε-nfa to nfa', 'ε-nfa to dfa'],
    text: `
- Recipe (the course's method): (1) closure table, written once; (2) δ′(q, a) = ε-CL( δ( ε-CL(q), a ) ) for EVERY state and symbol, one line each; (3) F′ = F, plus q0 if ε-CL(q0) contains a state of F, and NOTHING else; (4) test the old and the new machine on the same strings (include ε).
- Why only q0 joins F′: δ′ closes after every move, so any path that can slide into an accepting state already lands on it. The only moment δ′ never sees is before the first symbol, i.e. the empty string, which belongs to the start state. Forgetting the patch makes the machines disagree on ε.
- Do not mix methods: closing only BEFORE the move (δ(ε-CL(q), a)) requires a bigger F′ (every state whose closure meets F). Taking δ′ from one method and F′ from the other gives wrong answers.
- States on an ε-cycle share a closure, so their δ′ rows are identical: spot it and save work.
- Then the subset construction (S04) turns the NFA into a DFA. All three models (DFA, NFA, ε-NFA) accept the same class of languages.`
  },
  {
    session: 'S07',
    title: 'Moore and Mealy machines',
    keywords: ['moore', 'mealy', 'transducer', 'output', 'λ', 'lambda', 'print', 'output tape', 'machines that write'],
    text: `
- Moore: output λ(q) depends on the state only; it prints λ(q0) before reading anything, so the output has |w| + 1 symbols. Mealy: output λ(q, a) is on the arrow; output has |w| symbols. State the output length BEFORE running the machine.
- Equivalence: Moore output with its first symbol removed = Mealy output (on ε a Moore machine always prints one symbol and a Mealy machine prints nothing).
- Moore → Mealy: λ′(q, a) = λ(δ(q, a)), the arrow takes the output of the state it LANDS in. Same states, no new ones.
- Mealy → Moore: states are pairs [q, c] (state, last printed symbol); λ′([q,c]) = c; δ′([q,c], a) = [δ(q,a), λ(q,a)]; start [q0, c0] with c0 arbitrary (it only affects the dropped first symbol). Keep reachable pairs only. A state splits when the arrows entering it print different symbols; at most |Q|×|Δ| states.
- Example: Moore counter of b's mod 3 on babba prints 0 1 1 2 0 0 (six symbols); the Mealy version prints 1 1 2 0 0.`
  },
  {
    session: 'S09',
    title: 'Regular expressions, algebraic identities, and equivalence',
    keywords: ['regex', 'regular expression', 'identity', 'identities', 'algebraic', 'equivalent', 'arden', 'witness', 'star', 'kleene', 'union', 'concatenation'],
    text: `
- Regular expressions over Σ: base cases ∅ (empty language), ε (empty string), a ∈ Σ. Operations: union r₁|r₂, concatenation r₁r₂, Kleene star r*.
- Precedence: star * highest, then concatenation, then union | lowest. Use parentheses to override.
- Key identities (memorise these):
  - ∅ is identity for union: R | ∅ = ∅ | R = R.
  - ∅ is annihilator for concat: R ∅ = ∅ R = ∅.
  - ε is identity for concat: R ε = ε R = R.
  - Idempotence: R | R = R.
  - Star expansion: R* = ε | R R* = ε | R* R; (R*)* = R*; ∅* = ε (never ∅).
  - Union & star: (R | S)* = (R* S*)* = (R* | S*)*.
- Proving identities: show two languages are equal either via established algebraic laws or mutual inclusion (L(R₁) ⊆ L(R₂) and L(R₂) ⊆ L(R₁)).
- Disproving equivalence: find one WITNESS string w such that w ∈ L(R₁) but w ∉ L(R₂) (or vice-versa), stating clearly which accepts and which rejects. A single witness string disproves equivalence completely.
- Common traps: (ab)* ≠ a*b*; ∅* = ε (never ∅); (a|b)* ≠ a*|b*.
- Example: To show (a|b)* ≠ a*|b*, witness is ab (ab ∈ L((a|b)*) but ab ∉ L(a*|b*)).`
  },
  {
    session: 'S10',
    title: 'FA to regex: GNFA state elimination and Arden\'s lemma',
    keywords: ['state elimination', 'gnfa', 'arden', 'fa to regex', 'dfa to regex', 'nfa to regex', 'eliminate', 'rip', 'generalized'],
    text: `
- Recipe for GNFA State Elimination (the course's method):
  1. Add a fresh start state q_start with an ε-arrow to the original start state q0.
  2. Add a fresh accept state q_accept with ε-arrows from every state in F.
  3. Original final states become non-final; arrows carry regular expressions.
  4. Pick an intermediate state q to eliminate (justify the elimination order).
  5. For every predecessor p and successor r of q, update the edge:
     R_new(p, r) = R_old(p, r) | R(p, q) · (R(q, q))* · R(q, r).
     If p has no direct edge to r, R_old(p, r) = ∅. If q has no self-loop, (R(q, q))* = ε.
  6. Repeat until only q_start and q_accept remain. The expression on the arrow between them is the final regex!
- Arden's Lemma: if X = AX | B and ε ∉ A, then X = A*B is the unique solution. For systems of equations: write one equation per state q = ∪ (label · next_state) + (ε if q ∈ F), then substitute and apply Arden's lemma to solve for start state q0.
- Common traps: forgetting (R(q,q))* when q has a self-loop (writing R(p,q)R(q,r) instead of R(p,q)R(q,q)*R(q,r) loses most marks on this question); forgetting to add fresh q_start and q_accept.
- Example: Two-state machine q0 —a→ q1, q1 —b→ q0, F = {q0}: eliminating q1 adds a self-loop ab on q0, giving final regex (ab)*.`
  },
  {
    session: 'S11',
    title: 'Regex to ε-NFA: Thompson\'s inductive construction',
    keywords: ['thompson', 'regex to nfa', 'inductive construction', 'fragments', 'regex to ε-nfa', 'state count'],
    text: `
- Inductive Thompson construction compiles a regex into an equivalent ε-NFA with EXACTLY one start state (no incoming arrows) and one accept state (no outgoing arrows).
- Base fragments:
  - Symbol a: (start) —a→ (accept)  [2 states, 1 transition]
  - Epsilon ε: (start) —ε→ (accept)  [2 states, 1 transition]
  - Empty set ∅: (start)   (accept)   [2 states, 0 transitions]
- Inductive compositions:
  - Concatenation r₁r₂: merge or connect accept(M₁) —ε→ start(M₂). Total states: |Q₁| + |Q₂|.
  - Union r₁|r₂: fresh start with ε-arrows to start(M₁) and start(M₂); accepts of M₁ and M₂ connect via ε to fresh accept. Total states: |Q₁| + |Q₂| + 2.
  - Star r*: fresh start with ε-arrow to start(M) and bypass ε-arrow to fresh accept; accept(M) has loopback ε-arrow to start(M) and ε-arrow to fresh accept. Total states: |Q| + 2.
- Predict state count first: break down expression into its syntax tree, predict states, build inside-out step by step, and trace test strings.
- Common traps: missing the bypass ε in star (which breaks ε acceptance); forgetting that Thompson NFAs always have a single accept state.
- Example: Regex (a|b)*abb decomposes into base symbols a and b, union (a|b) (4 states), star (a|b)* (6 states), concatenated with a, b, b to yield an ε-NFA with 12 states.`
  },
  {
    session: 'S12',
    title: 'Closure properties: product construction and complement',
    keywords: ['closure', 'product construction', 'complement', 'intersection', 'union', 'difference', 'cartesian', 'pairs'],
    text: `
- Product construction builds a machine for L(M₁) ∩ L(M₂), L(M₁) ∪ L(M₂), or L(M₁) \\ L(M₂).
- Given complete DFAs M₁ = (Q₁, Σ, δ₁, q₀₁, F₁) and M₂ = (Q₂, Σ, δ₂, q₀₂, F₂):
  - States: Cartesian product pairs [p, q] for p ∈ Q₁ and q ∈ Q₂ (|Q₁|×|Q₂| states).
  - Start state: [q₀₁, q₀₂].
  - Transition: δ([p, q], a) = [δ₁(p, a), δ₂(q, a)] for every symbol a ∈ Σ.
  - Accepting states F_prod determine the operation:
    - Intersection (∩): both must accept → F = { [p, q] | p ∈ F₁ and q ∈ F₂ } = F₁ × F₂.
    - Union (∪): at least one accepts → F = { [p, q] | p ∈ F₁ or q ∈ F₂ }.
    - Difference (\\): p ∈ F₁ and q ∉ F₂.
- Complement: swap accepting and non-accepting states (F' = Q \\ F).
- CRITICAL RULE: Complement and product construction REQUIRE the DFA to be COMPLETE. If a DFA has missing arrows, a dead/trap state must be added before complementing!
- Common traps: complementing an NFA by swapping states (wrong! Automatic zero marks; an NFA must be converted to a complete DFA first); forgetting unreachable pairs.
- Example: Even a's (2 states) ∩ ends in b (2 states) yields a 4-state product DFA with start [even, not_b] and accepting set {[even, ends_b]}.`
  },
  {
    session: 'S13',
    title: 'Pumping lemma for regular languages',
    keywords: ['pumping', 'pumping lemma', 'non-regular', 'not regular', 'adversary', 'contradiction', 'xyz', 'pigeonhole'],
    text: `
- Purpose: prove a language is NOT regular. (It cannot be used to prove a language IS regular).
- Statement: If L is regular, ∃ integer p ≥ 1 such that ∀ string s ∈ L with |s| ≥ p, ∃ split s = xyz satisfying:
  1. |xy| ≤ p
  2. |y| ≥ 1  (y ≠ ε)
  3. ∀ i ≥ 0: x yⁱ z ∈ L.
- The 5-step Adversary Recipe:
  1. Assume L is regular for contradiction.
  2. Adversary picks pumping length p ≥ 1 (we treat p as an unknown constant, never pick a number!).
  3. We pick a clever string s ∈ L such that |s| ≥ p (expressed in terms of p, e.g. s = 0ᵖ 1ᵖ, s = aᵖ bᵖ, s = w w).
  4. Adversary chooses legal partition s = xyz with |xy| ≤ p and |y| ≥ 1.
     Because |xy| ≤ p, y is entirely confined within the first p characters of s!
  5. We pick a pumping index i (typically i = 0 to pump down, or i = 2 to pump up) and show that x yⁱ z ∉ L.
  6. Contradiction! Therefore L is not regular.
- Common traps: picking a specific number for p (e.g. "let p = 3" is an automatic fail); picking a string s that depends on a specific split; picking s whose length is less than p; assuming y is fixed rather than considering all legal y.
- Example: For L = {0ⁿ 1ⁿ | n ≥ 0}, pick s = 0ᵖ 1ᵖ (|s| = 2p ≥ p). Since |xy| ≤ p, y = 0ᵐ with m ≥ 1. Pumping i = 2 gives 0ᵖ⁺ᵐ 1ᵖ ∉ L because #0 > #1. Contradiction: L is not regular.`
  }
];

// Pick the notes that best match. The current message counts three times as much as
// the context (technique, earlier messages), so an old topic cannot crowd out the new one.
export function relevantNotes(message, context = '', limit = 2) {
  const score = (n, text) => {
    const t = ` ${String(text || '').toLowerCase()} `;
    let sc = t.includes(n.session.toLowerCase()) ? 5 : 0;
    n.keywords.forEach(k => {
      if (t.includes(k)) sc += k.length > 4 ? 2 : 1;
    });
    return sc;
  };
  return NOTES.map(n => ({ n, s: 3 * score(n, message) + score(n, context) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ n }) => `[${n.session} · ${n.title}]\n${n.text.trim()}`)
    .join('\n\n');
}
