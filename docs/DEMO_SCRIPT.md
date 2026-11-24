# Stately · 5-minute demo script

One technique per module, shown the way the course marks it: every step on screen, tests at the end, the language in one sentence.

| | |
|---|---|
| **Length** | 5 minutes (timings below add up to 5:00) |
| **Speakers** | Adham (finite automata), Ebram (regular expressions), Noor (grammars and PDAs) |
| **Needs** | `npm install`, `npm run dev`, browser at `http://localhost:3000`, window at least 1280 px wide |
| **AI key** | Not needed. Everything in this script is solved by code and works offline. With `GEMINI_API_KEY` set, the plain-English "what each state / variable means" lines fill in a second after each answer. |

## Before you start (2 minutes, off stage)

1. `npm run test:grammar` should end with `✓ all passed`.
2. Open the app, click **New chat**, and delete old chats so the sidebar is clean.
3. Zoom the browser to 110–125 % so the back row can read the monospace lines.
4. Keep this file open on a second screen: the inputs in the grey boxes are meant to be pasted.

Controls you will use: **Next** (or the → key) walks one step forward, **Prev** (←) goes back, **Show all steps** prints the whole answer, **🤔 Quiz me** makes Stately ask before it reveals each step.

---

## 0:00 – 0:30 · The problem (Noor)

> "ChatGPT gives you the final answer. Our exam gives most of its marks to the *method*: the table after every round, the grammar after every step, every ID of a trace. Stately solves each technique the way the course marks it, one step at a time, and code checks every answer."

Show the welcome screen. Point at the six cards: three modules, one chat box.

## 0:30 – 1:30 · Module 1–2: NFA → DFA by the subset construction (Adham)

1. Click the card **🏁 NFA → DFA**.
2. Press **Next** three times. Say: "One row per step. The union is written out in full, new subsets are marked, and the diagram grows with the table."
3. Jump to the last step (click the last dot). Point at **Test strings** (one is rejected) and the **Result** box: "3 of the 8 possible subsets are reachable".
4. Click the chip **➡️ Now minimise it**. Say: "The answer stays in the chat, so the next technique starts from it."

## 1:30 – 2:15 · Module 3: FA → regular expression by state elimination (Ebram)

> Ebram's module plugs into the same step player. If it is not merged on demo day, use the fallback below so the timing still works.

- **If merged:** paste the DFA from A2 Q3, press **Next** through two eliminations, and point at the label written in full: `R(p,r) + R(p,q) R(q,q)* R(q,r)`. Say the trap out loud: "the star stays when the removed state has a self-loop".
- **Fallback (works today):** click **🎲 Practice → Minimise a DFA**, then **👀 Show the solution** and switch on **🤔 Quiz me** for one step. Say: "Every technique also generates fresh exercises and quizzes you before each step."

## 2:15 – 3:30 · Module 5: Chomsky normal form (Noor)

1. Click **New chat**, then the card **🌳 Grammar → CNF** (the Session 19 relay grammar).

   ```
   Convert to Chomsky normal form:
   S → ASA | aB
   A → B | S
   B → b | ε
   ```

2. The opening step is on screen (the grammar, and whether ε ∈ L). Say: "First question: is ε in the language? It decides which version of CNF we convert to."
3. **Next** → *Step 1 · A new start symbol?* Say: "S is on a right-hand side, so we add S0."
4. **Next** → *Step 2 · ε-productions*. Point at the **diff box**: green is new, red is removed. Say: "S → ASA becomes four productions. And look at the last line: this step *created* the unit production S → S. That is the trap from Session 18, and Stately flags it."
5. **Next**, **Next**, **Next** quickly (steps 3, 4a, 4b). On 4b say: "Three right-hand sides end in SA, so one new variable D1 serves all three."
6. **Next** → the result. Point at the three checks: every production is A → BC or A → a, S0 is on no right-hand side, and "L unchanged: compared on every string of length ≤ 8". Say: "That last line is not the AI talking. Code enumerated both languages and compared them."

## 3:30 – 4:30 · Module 5: a PDA trace with the stack on screen (Noor)

1. Click **New chat**, then the card **🥞 Trace a PDA** (the aⁿbⁿ machine of Session 20 with `strings: aabb, abab`).
2. Step 1: the seven-tuple and the diagram. Say: "Stack written top first: the course's convention, stated at the top."
3. **Next** → determinism: both rules checked, with rule 2 named.
4. **Next** four times, slowly (start ID, then moves 1 to 3). The **stack strip** grows by one column per move: two X's go on (green), then the first one comes off (red ghost). The input tape pointer moves; the current state lights up in the diagram. Say: "One ⊢ per line, each with the transition that justifies it."
5. **Next** twice more → *Move 5: ε-move*. Say: "Five moves for four symbols. The fifth is the ε-move that checks the bottom marker, and it is the one everybody forgets."
6. **Next** → `abab` is rejected. Read the red line: "STUCK … Being stuck is rejection, not an error."

## 4:30 – 5:00 · What makes it different, and close (all three)

Type into the same chat:

```
test aaabbb
```

Say while it renders: "It remembers the machine. Any follow-up works: test my own string, convert it, simplify it."

> "Three modules, one step player. Code computes every table, tree and trace, so the steps are always right; the AI only reads free text and photos and writes the plain-English meanings. And every answer ends the way our model answers do: tests with a rejected string, and the language in one sentence."

---

## If something goes wrong

| Problem | What to do |
|---|---|
| A card does nothing | Paste the grey box from this script into the message box and press Enter. |
| The diagram does not appear | Graphviz loads on first use; press **Next** and **Prev** once. The tables and lines are complete without it. |
| "I can't answer written questions just yet" | No AI key on this machine. Stay on the script: nothing in it needs the AI. |
| You pressed Next too often | Click the dot of the step you want (the row of dots above the step). |
| The stack strip is cut off on a small screen | Scroll it sideways, or click **Show all steps** and zoom out. |

## Extra material if there is a question round

All of these work offline, one message each:

| Question from the audience | Send this |
|---|---|
| "Can it find ambiguity?" | `Is this grammar ambiguous? E → E+E \| E×E \| a` (shortest string with two trees, both trees side by side, then the E/T/F repair, verified) |
| "Does it simplify grammars?" | `Simplify: S → AB \| b, A → aA \| ε, B → bC \| b, C → A` |
| "Grammar to machine?" | After any grammar: click **🥞 Turn it into a PDA** (three states, \|P\| + \|T\| + 2 transitions, the run with the sentential form beside every ID) |
| "A nondeterministic PDA?" | Paste the wwᴿ machine from `src/components/tutor/grammarPresets.js` with `strings: abba` (the accepting branch and a STUCK branch) |
| "Machine to grammar?" | Paste any DFA table with the line `Convert this DFA to a right-linear grammar` above it |
| "Can an LLM answer be rendered too?" | Paste the contents of `examples/S20_pda_trace.json`: the same player draws any answer in the shared JSON contract |
