# Theory of Computing Interactive Suite (AutomataLab)

> **CSCE 4201 — Theory of Computing**  
> **The American University in Cairo (AUC)**  
> **Instructor:** Dr. Alia ElBolock  
> **Author:** BeTechBo

An interactive suite for exploring and visualizing formal languages, automata, grammars, and computability theory.

---

## 🌟 Capabilities & Included Modules

### 1. 🥞 Pushdown Automata (PDA) Visualizer & Step Simulator
- **Step-by-step Execution:** Step forward, step backward, or auto-play with adjustable playback speed.
- **Dynamic Stack Visualizer:** Live stack container highlighting the top of stack, start symbol $Z_0$, and animation of pushes and pops.
- **Dual Acceptance Modes:** Acceptance by **Final State** ($q \in F$) or acceptance by **Empty Stack** ($\text{stack} = \emptyset$).
- **Non-Deterministic Search (NPDA):** Breadth-first search exploring configurations to automatically locate accepting branches.
- **Interactive State Diagram:** Dynamic SVG graph with active state lighting, self-loops, and transition labels $\delta(q, a, X) = (p, \alpha)$.
- **Configuration Trace:** Complete history trace of instantaneous descriptions $(q, w_{\text{remaining}}, \gamma)$.
- **Presets Included:**
  - $a^n b^n \ (n \ge 1)$
  - $a^n b^{2n} \ (n \ge 1)$
  - $\#a = \#b$ (Empty stack)
  - Palindromes $w c w^R$ (Deterministic)
  - Palindromes $w w^R$ (NPDA guessing)
  - Balanced parentheses $( ) [ ]$

### 2. ⚡ Finite Automata Studio (DFA & NFA)
- **Interactive Simulation:** Step-by-step reading with multi-state $\varepsilon$-closure tracking.
- **NFA $\to$ DFA Powerset Construction:** Full interactive conversion table displaying subset powerset states $\{q_0, q_1\}$ and synthesized equivalent DFA diagram.
- **DFA Minimization:** Table-filling (Myhill-Nerode) distinguishable pair matrix with equivalent quotient state reduction.
- **Batch String Tester:** Run test suites across multiple inputs simultaneously.

### 3. ⚙️ Turing Machine (TM) Studio
- **Infinite Bidirectional Tape:** Dynamic scrolling tape cells centered on the active read/write head.
- **Head Controls:** Left ($L$), Right ($R$), and Stay ($S$) movements with symbol overwrite.
- **Decidability:** Halting in accept ($q_{acc}$) or reject ($q_{rej}$) states, with loop protection.
- **Classic Algorithms:**
  - $a^n b^n c^n$ decider (Non-Context-Free language recognition)
  - Binary incrementer ($+1$)
  - Palindrome recognizer ($w = w^R$)

### 4. 🌳 Context-Free Grammars (CFG) & Parse Trees
- **Grammar Editor:** Production rule definition ($A \to \alpha \mid \beta$).
- **Leftmost Derivations:** Automatic derivation sequence generator.
- **Concrete Syntax Trees (Parse Trees):** Interactive SVG tree diagram rendering root variables down to leaf terminal symbols.

### 5. 🔤 Regular Expressions & Thompson's Construction
- **Regex Synthesizer:** Compiles regular expressions into equivalent $\varepsilon$-NFA state diagrams using Thompson's inductive construction (concatenation, union, Kleene star).
- **Match Evaluator:** Instant regex tester.

### 6. 🛡️ Pumping Lemma Playground
- **Adversary Game:** Interactive proof game demonstrating non-regularity for $0^n 1^n$ and non-context-free nature for $a^n b^n c^n$ by choosing $p$, selecting $s$, partitioning $s = xyz$, and picking $i$ to establish contradictions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
git clone https://github.com/BeTechBo/Theory-of-Computing-Tool.git
cd "Theory of Computing Tool"
npm install
```

### Run Locally
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Build for Production
```bash
npm run build
```
The compiled static assets will be ready in `dist/`.

---

## ☁️ Deploying to Vercel

### Option 1: Automatic Vercel Git Integration (Recommended)
1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/BeTechBo/Theory-of-Computing-Tool.git
   git push -u origin main
   ```
2. Log into [Vercel](https://vercel.com).
3. Click **"Add New"** > **"Project"** and import `Theory-of-Computing-Tool`.
4. Vercel will automatically detect the **Vite** framework and `dist` output directory.
5. Click **"Deploy"** — your live site will be ready in seconds!

### Option 2: Deploying via Vercel CLI
```bash
npm install -g vercel
vercel
```
Follow the interactive prompts to deploy.

---

## 🎓 Academic Credit & Citation
Developed for **CSCE 4201 (Theory of Computing)** at **The American University in Cairo (AUC)** under the academic direction of **Dr. Alia ElBolock**.
