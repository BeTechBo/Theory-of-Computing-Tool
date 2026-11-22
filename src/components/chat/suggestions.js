// Suggested follow-up questions under each answer. The ready-made answers come from
// the S01/S04 slides and model answers; with the AI connected, the AI answers instead.

export const FOLLOW_UPS = {
  subset_construction: ['When is ∅ a state?', 'Why only reachable subsets?', 'What does each subset mean?'],
  dfa_trace: ['What does δ̂(q0, w) mean?', 'When is ε accepted?'],
  min_table: ['Why remove unreachable states first?', 'What is a witness string?', 'Why do both methods agree?'],
  min_partition: ['Why remove unreachable states first?', 'What is a signature?', 'Why do both methods agree?'],
  eps_closure: ['Why does ε-CL(q) contain q itself?', 'When is ε accepted?'],
  eps_removal: ["Why does only q0 join F′?", 'Why close after the move too?'],
  moore_mealy: ['Why is the Moore output one symbol longer?', 'Why can Mealy → Moore need more states?'],
  dfa_design: ['How do I choose the facts?', 'When do I need a dead state?']
};

export const READY_ANSWERS = {
  'When is ∅ a state?': `**∅ becomes a state when some reachable subset has no move at all on a symbol.**
- Every path has died and nothing can revive it, so ∅ loops to itself on every symbol: it is the dead (trap) state from Session 2.
- It never appears when one NFA state is in every reachable subset *and* has an arrow on every symbol (like x0 in S04 Q1).
- In S04 Q2, y3 has no outgoing arrows, so {y3} on a gives ∅.`,

  'Why only reachable subsets?': `Because a subset nothing can reach can never be entered, so it changes nothing about the language.
- Start from {q0} and only add a subset when some row actually produces it.
- Listing all 2ⁿ subsets would still be correct, but it shows no understanding of which ones are reachable, and the marking scheme rewards building outward.
- Example: in S04 Q2 only 5 of the 16 subsets are reachable.`,

  'What does each subset mean?': `Each subset is a **fact about the input read so far**: the set of NFA states that input could have led to.
- In the Subset Race, {m0,m1} means "an a has been seen, but no b has followed it yet".
- Nobody chose these facts: the subset construction discovers them for you, just like minimisation discovers which states really differ.`,

  'What does δ̂(q0, w) mean?': `δ̂ ("delta-hat") is the **extended transition function**: δ̂(q0, w) is the state you end in after reading the whole string w from q0, one symbol at a time.
- The string is accepted exactly when δ̂(q0, w) ∈ F.
- For the empty string there are zero moves, so δ̂(q0, ε) = q0.`,

  'When is ε accepted?': `Reading ε makes **zero moves**, so the machine stays where it started.
- In a DFA: ε is accepted exactly when the start state q0 is accepting.
- With ε-moves: look at ε-CL(q0) instead; ε is accepted when the closure contains an accepting state.`,

  'Why remove unreachable states first?': `Because the algorithm never asks whether a state can be reached.
- An unreachable state behaves however its arrows say, so it can survive as a block of its own.
- The language stays the same, but the result is **not minimal** (S03 Q3: 4 blocks instead of 3).
- It fails only sometimes, which is why students think the step is optional. It is not.`,

  'What is a witness string?': `A **witness** is a string that tells two states apart: from one state it is accepted, from the other it is rejected.
- Pass 0 pairs have witness ε (one state accepts, the other does not).
- If (p,q) on a goes to a pair with witness w, then (p,q) gets witness a·w.`,

  'Why do both methods agree?': `Because the minimal DFA of a language is **unique** (up to renaming states).
- Partition refinement and table filling both find exactly which states no string can tell apart.
- So they must end with the same classes. If yours differ, one of them has a mistake.`,

  'What is a signature?': `A state's **signature** in a round lists which block each symbol leads to, e.g. s1: a → A, b → A.
- Two states in the same block with different signatures behave differently, so the block splits.
- Stop when a round splits nothing.`,

  'Why does ε-CL(q) contain q itself?': `Because you can always reach q from q with **zero** ε-moves.
- Without this rule, a state with no ε-arrows would get an empty closure, and every string whose run ends there would be wrongly rejected (S05 Q3).`,

  "Why does only q0 join F′?": `Because δ′(q, a) = ε-CL(δ(ε-CL(q), a)) **closes after every move**.
- Any path that could slide into an accepting state after reading a symbol already lands on it.
- The only moment δ′ never sees is before the first symbol: the empty string, which belongs to q0.
- So q0 joins F′ exactly when ε-CL(q0) contains an accepting state. Nothing else needs adding.`,

  'Why close after the move too?': `So that free moves **after** a symbol are not lost.
- δ′(q, a) = ε-CL(δ(ε-CL(q), a)): close (free moves before), move on a, close again (free moves after).
- Dropping the last closure needs a bigger F′ to compensate. Mixing the two methods gives wrong answers (S06 Q3).`,

  'Why is the Moore output one symbol longer?': `A Moore machine prints the output of its **current state**, and it is already in q0 before reading anything.
- So on w it prints λ(q0) first, then one symbol per input symbol: |w| + 1 symbols.
- A Mealy machine prints on arrows only: |w| symbols. Equivalence drops Moore's first symbol.`,

  'Why can Mealy → Moore need more states?': `A Moore state must know **what was just printed**, so states become pairs [q, c].
- If the arrows entering q print different symbols, q splits into several pairs.
- At most |Q|×|Δ| states. Moore → Mealy never needs new states.`,

  'How do I choose the facts?': `Ask: **what must I remember about the input so far to decide the answer at the end?**
- Count only as far as the language cares ("none / one / two or more").
- Unbounded counts become remainders (divisible by 3 → 3 states).
- Write each fact about the whole prefix, never about a single transition.`,

  'When do I need a dead state?': `When something can happen that **no later input can undo** and the string must be rejected.
- Example: "no ab anywhere": once ab appears, every continuation is rejected.
- The dead state loops to itself on every symbol and is not accepting. It also keeps δ complete.`
};
