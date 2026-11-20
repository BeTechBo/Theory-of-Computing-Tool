import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, XCircle, ArrowRight, Code2, BookOpen
} from 'lucide-react';
import { REGEX_PRESETS, thompsonsConstruction, EPSILON } from './regexEngine';
import StateDiagramSvg from '../common/StateDiagramSvg';

export default function RegexStudio() {
  const [selectedPreset, setSelectedPreset] = useState('(a|b)*abb');
  const [regexStr, setRegexStr] = useState('(a|b)*abb');
  const [testInput, setTestInput] = useState('aabb');
  const [nfa, setNfa] = useState(null);

  const handleSelectPreset = (key) => {
    const p = REGEX_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setRegexStr(p.regex);
    setTestInput(p.testCases?.[0] || '');
  };

  useEffect(() => {
    const generated = thompsonsConstruction(regexStr);
    setNfa(generated);
  }, [regexStr]);

  // Convert simple regex string to JS RegExp for testing
  const testMatch = () => {
    try {
      const sanitized = regexStr.replace(EPSILON, '');
      const re = new RegExp(`^(${sanitized})$`);
      return re.test(testInput);
    } catch (e) {
      return false;
    }
  };

  const isMatched = testMatch();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                Thompson's Construction
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Regex ➔ ε-NFA
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Regular Expressions & Thompson's ε-NFA Studio
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Preset:</span>
            <select
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-pink-500 outline-none"
            >
              {Object.keys(REGEX_PRESETS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Regex input & string tester */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-center">
          <div className="md:col-span-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Regular Expression:
            </label>
            <input
              type="text"
              value={regexStr}
              onChange={e => setRegexStr(e.target.value)}
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-pink-500 outline-none"
            />
          </div>

          <div className="md:col-span-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Test String (w):
            </label>
            <input
              type="text"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="e.g. aabb"
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-pink-500 outline-none"
            />
            {isMatched ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matches
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-semibold whitespace-nowrap">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> No Match
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thompson's NFA Diagram */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-pink-500" />
            Synthesized Thompson's ε-NFA Diagram
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Generated states: {nfa?.states.length || 0} · Transitions: {nfa?.transitions.length || 0}
          </span>
        </div>

        {nfa ? (
          <StateDiagramSvg
            states={nfa.states}
            transitions={nfa.transitions}
            initialState={nfa.startState}
            finalStates={new Set(nfa.finalStates)}
            width={720}
            height={280}
          />
        ) : (
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
            Unable to synthesize automaton for this expression.
          </div>
        )}
      </div>

      {/* Thompson's Rules Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">1. Concatenation (r₁ · r₂)</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Connects the accept state of the first automaton to the start state of the second automaton via an ε-transition.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">2. Union (r₁ | r₂)</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Creates a new start state that branches via ε to both start states, and joins both accept states via ε to a new unified accept state.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">3. Kleene Star (r*)</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Adds a loop-back ε from accept to start to repeat, plus a direct bypass ε from the new start state to accept to match the empty string ε.
          </p>
        </div>
      </div>
    </div>
  );
}
