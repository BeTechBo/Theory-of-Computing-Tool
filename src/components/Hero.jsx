import React, { useState, useEffect } from 'react';
import {
  Layers, Sparkles, Cpu, GitFork, Code2, ShieldAlert, ArrowRight, Play, CheckCircle2
} from 'lucide-react';

export default function Hero({ onStart }) {
  // Animated stack hero reproducing the beloved animation from the original tool
  const seq = ['a', 'a', 'a', 'b', 'b', 'b'];
  const [seqIdx, setSeqIdx] = useState(0);
  const [stack, setStack] = useState(['Z']);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeqIdx(prevIdx => {
        if (prevIdx === 6) {
          setStack(['Z']);
          return 0;
        } else {
          const char = seq[prevIdx];
          if (char === 'a') {
            setStack(s => [...s, 'X']);
          } else {
            setStack(s => (s.length > 1 ? s.slice(0, -1) : ['Z']));
          }
          return prevIdx + 1;
        }
      });
    }, 700);

    return () => clearInterval(timer);
  }, []);

  const featureCards = [
    {
      id: 'pda',
      title: 'Pushdown Automata (PDA)',
      description: 'Step-by-step tape reading, live stack pops/pushes, state diagram, configuration trace, and presets.',
      icon: Layers,
      color: 'from-amber-500/20 to-amber-500/5',
      badge: 'Core Module'
    },
    {
      id: 'fa',
      title: 'Finite Automata (DFA & NFA)',
      description: 'Interactive execution, NFA to DFA Powerset Subset Construction table, and Myhill-Nerode minimization.',
      icon: Sparkles,
      color: 'from-blue-500/20 to-blue-500/5',
      badge: 'Subset & Minimization'
    },
    {
      id: 'tm',
      title: 'Turing Machine Simulator',
      description: 'Infinite bidirectional tape animation, head controls, non-context-free deciders like aⁿbⁿcⁿ, incrementers, and busy beavers.',
      icon: Cpu,
      color: 'from-emerald-500/20 to-emerald-500/5',
      badge: 'Infinite Tape'
    },
    {
      id: 'cfg',
      title: 'Context-Free Grammars',
      description: 'Interactive production rule derivations, recursive Concrete Syntax Trees (Parse Trees), and CYK algorithm.',
      icon: GitFork,
      color: 'from-purple-500/20 to-purple-500/5',
      badge: 'Parse Trees'
    },
    {
      id: 'regex',
      title: 'Regex & Thompson Construction',
      description: 'Interactive Regular Expressions synthesizer compiling expressions into ε-NFA diagrams.',
      icon: Code2,
      color: 'from-pink-500/20 to-pink-500/5',
      badge: 'ε-NFA'
    },
    {
      id: 'pumping',
      title: 'Pumping Lemma Game',
      description: 'Adversary proof game proving languages non-regular or non-context-free by establishing contradictions.',
      icon: ShieldAlert,
      color: 'from-teal-500/20 to-teal-500/5',
      badge: 'Interactive Game'
    }
  ];

  return (
    <div className="space-y-16 py-6">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 shadow-2xl p-8 sm:p-12 lg:p-16">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span>The American University in Cairo</span>
              <span>•</span>
              <span>CSCE 4201</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Theory of Computing Interactive Suite
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-light leading-relaxed">
              Dr. Alia ElBolock's course laboratory companion. Explore Pushdown Automata, Finite State Machines, Infinite Turing Tapes, Syntax Trees, and Formal Proofs with real-time visual simulation.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onStart('pda')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch PDA Visualizer</span>
              </button>

              <button
                onClick={() => onStart('fa')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800/80 text-slate-200 font-semibold text-sm transition"
              >
                <span>Explore All 6 Modules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Original Animated Stack Hero recreated with high fidelity */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-inner">
            <div className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Stack Simulation:</span>
              <span className="font-bold text-amber-400">aⁿbⁿ (n = 3)</span>
            </div>

            {/* Stack box */}
            <div className="w-36 h-56 border-2 border-slate-400 dark:border-slate-500 border-t-0 rounded-b-xl p-2 flex flex-col-reverse gap-2 bg-slate-900/80 shadow-inner">
              {stack.map((sym, idx) => (
                <div
                  key={idx}
                  className={`w-full h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow transition-all ${
                    sym === 'Z'
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-amber-400 text-slate-950 animate-pop'
                  }`}
                >
                  {sym}
                </div>
              ))}
            </div>

            {/* Input sequence */}
            <div className="flex items-center gap-2 mt-4 font-mono text-sm tracking-widest">
              {seq.map((c, i) => (
                <span
                  key={i}
                  className={`transition-opacity ${
                    i < seqIdx ? 'opacity-30 line-through text-slate-500' : 'text-amber-400 font-bold'
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">
            Comprehensive Capabilities & Modules
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select any module to interact with state machines, algorithms, and formal proofs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map(card => {
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                onClick={() => onStart(card.id)}
                className="group relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-950 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-amber-600 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  <span>Open Visualizer</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
