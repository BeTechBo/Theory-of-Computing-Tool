import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  CheckCircle2, XCircle, Settings2, Sparkles, BookOpen, Download, Upload
} from 'lucide-react';
import { PDA_PRESETS, parsePdaDefinition, simulatePda, EPSILON } from './pdaSimulator';
import StateDiagramSvg from '../common/StateDiagramSvg';
import TapeVisualizer from '../common/TapeVisualizer';

export default function PdaVisualizer() {
  const [selectedPreset, setSelectedPreset] = useState('aⁿbⁿ  (n ≥ 1)');
  const [q0, setQ0] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].q0);
  const [z0, setZ0] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].z);
  const [fin, setFin] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].fin);
  const [mode, setMode] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].mode);
  const [trsText, setTrsText] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].t);
  const [inputStr, setInputStr] = useState(PDA_PRESETS['aⁿbⁿ  (n ≥ 1)'].w);

  const [machine, setMachine] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [simResult, setSimResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [showEditor, setShowEditor] = useState(false);

  const timerRef = useRef(null);
  const traceEndRef = useRef(null);

  // Load a preset
  const handleSelectPreset = (key) => {
    const p = PDA_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setQ0(p.q0);
    setZ0(p.z);
    setFin(p.fin);
    setMode(p.mode);
    setTrsText(p.t);
    setInputStr(p.w);
  };

  // Compile and run simulation
  const handleCompileAndRun = () => {
    stopPlayback();
    const { machine: parsedMachine, errors } = parsePdaDefinition({
      q0,
      z: z0,
      fin,
      mode,
      transitionsText: trsText
    });

    setParseErrors(errors);
    if (errors.length > 0) return;

    setMachine(parsedMachine);
    const result = simulatePda(parsedMachine, inputStr);
    setSimResult(result);
    setStepIndex(0);
  };

  // Initial load
  useEffect(() => {
    handleCompileAndRun();
  }, [q0, z0, fin, mode, trsText]);

  // Handle play/pause loop
  const stopPlayback = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (!simResult || simResult.steps.length <= 1) return;
      if (stepIndex >= simResult.steps.length - 1) {
        setStepIndex(0);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setStepIndex(prev => {
        if (!simResult || prev >= simResult.steps.length - 1) {
          stopPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simResult, playbackSpeed]);

  // Auto scroll trace to bottom
  useEffect(() => {
    if (traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [stepIndex]);

  // Current simulation snapshot
  const currentStep = simResult?.steps?.[stepIndex];
  const currentConfig = currentStep?.c;
  const isFinished = simResult && stepIndex === simResult.steps.length - 1;

  // Active transition info
  const activeTransObj = currentStep?.t !== null && machine?.transitions[currentStep?.t]
    ? machine.transitions[currentStep.t]
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                PDA Simulator
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {mode === 'final' ? 'Accept by Final State' : 'Accept by Empty Stack'}
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Pushdown Automata Visualizer
            </h2>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Preset:</span>
            <select
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {Object.keys(PDA_PRESETS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input & Execution Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-center">
          <div className="md:col-span-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Input String (w):
            </label>
            <input
              type="text"
              value={inputStr}
              onChange={e => setInputStr(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCompileAndRun(); }}
              placeholder="e.g. aabb"
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <button
              onClick={handleCompileAndRun}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              Simulate
            </button>
          </div>

          {/* Stepping controls */}
          <div className="md:col-span-6 flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={() => { stopPlayback(); setStepIndex(0); }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
            <button
              onClick={() => { stopPlayback(); setStepIndex(p => Math.max(0, p - 1)); }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
            <button
              onClick={togglePlayback}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => { stopPlayback(); setStepIndex(p => Math.min((simResult?.steps.length || 1) - 1, p + 1)); }}
              disabled={isFinished}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>

            {/* Speed selection */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 ml-2">
              <span>Speed:</span>
              <select
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(Number(e.target.value))}
                className="bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px]"
              >
                <option value={1200}>0.7x</option>
                <option value={800}>1x</option>
                <option value={400}>2x</option>
                <option value={200}>4x</option>
              </select>
            </div>

            <button
              onClick={() => setShowEditor(!showEditor)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 ml-1 transition"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showEditor ? 'Hide Machine' : 'Edit Machine'}</span>
            </button>
          </div>
        </div>

        {/* Status / Verdict Banner */}
        {simResult && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">
                Step <span className="font-bold text-amber-600 dark:text-amber-400">{stepIndex}</span> of {simResult.steps.length - 1}
              </span>
              {isFinished ? (
                simResult.accepted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Accepted string
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Rejected string (no accepting branch)
                  </span>
                )
              ) : (
                <span className="text-slate-400">Simulation in progress...</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Explored {simResult.exploredCount} configurations · Max stack: {simResult.maxStackDepth}
            </div>
          </div>
        )}
      </div>

      {/* Main Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tape + State Diagram + Trace */}
        <div className="lg:col-span-9 space-y-5">
          {/* Tape Visualizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <TapeVisualizer
              tape={simResult?.input || inputStr}
              headIndex={currentConfig?.i ?? 0}
            />
          </div>

          {/* State Transition Diagram */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                State Transition Diagram
              </h3>
              <div className="text-xs font-mono text-slate-500">
                Active State: <span className="font-bold text-amber-500">{currentConfig?.q || machine?.q0}</span>
              </div>
            </div>

            {machine && (
              <StateDiagramSvg
                states={machine.states}
                transitions={machine.transitions}
                activeState={currentConfig?.q}
                activeTransition={currentStep?.t}
                initialState={machine.q0}
                finalStates={machine.fin}
                width={740}
                height={260}
              />
            )}
          </div>

          {/* Trace of Configurations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Configuration Trace History <span className="font-mono text-xs text-slate-400">(q, remaining_input, stack)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {stepIndex + 1} snapshots
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 font-mono text-xs pr-1">
              {simResult?.steps.slice(0, stepIndex + 1).map((st, i) => {
                const isCur = i === stepIndex;
                const unread = inputStr.slice(st.c.i) || EPSILON;
                const stackStr = st.c.s.length ? st.c.s.join('') : EPSILON;
                const transObj = st.t !== null ? machine?.transitions[st.t] : null;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition ${
                      isCur
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 font-semibold text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50/50 dark:bg-slate-850/30 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-5">{i === 0 ? '⊢₀' : '⊢'}</span>
                      <span>({st.c.q}, <span className="text-teal-600 dark:text-teal-400">{unread}</span>, <span className="text-amber-600 dark:text-amber-400">{stackStr}</span>)</span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {transObj ? `δ(${transObj.from}, ${transObj.a || EPSILON}, ${transObj.top}) = (${transObj.to}, ${transObj.push || EPSILON})` : 'Start configuration'}
                    </div>
                  </div>
                );
              })}
              <div ref={traceEndRef} />
            </div>
          </div>
        </div>

        {/* Right Column: Animated Stack Column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 self-start mb-1">
              Stack Memory
            </h3>
            <span className="text-[11px] font-mono text-slate-400 self-start mb-3">
              (Top of stack is at the top)
            </span>

            {/* Stack Visual container */}
            <div className="w-full flex flex-col items-center">
              <div className="w-32 border-2 border-slate-700 dark:border-slate-400 border-t-0 rounded-b-xl p-2 min-h-[300px] max-h-[420px] overflow-y-auto flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-950/60 shadow-inner">
                {currentConfig?.s && currentConfig.s.length > 0 ? (
                  currentConfig.s.map((sym, sIdx) => {
                    const isTop = sIdx === 0;
                    const isZ0 = sym === z0 && sIdx === currentConfig.s.length - 1;

                    return (
                      <div
                        key={sIdx}
                        className={`w-full h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shadow-sm transition-all animate-pop ${
                          isTop
                            ? 'bg-amber-400 dark:bg-amber-500 text-slate-950 border border-amber-600 ring-2 ring-amber-300 dark:ring-amber-800'
                            : isZ0
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-400'
                            : 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700'
                        }`}
                      >
                        <span>{sym}</span>
                        {isTop && (
                          <span className="text-[9px] font-sans ml-1 text-slate-900 font-normal opacity-75">
                            (top)
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs font-mono text-slate-400 italic my-auto">
                    Stack is empty
                  </div>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-2">
                Stack depth: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentConfig?.s?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Current Step Rule Callout */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
              Active Rule Executed:
            </span>
            {activeTransObj ? (
              <div className="font-mono text-amber-800 dark:text-amber-300 space-y-0.5">
                <div>From state: <span className="font-semibold">{activeTransObj.from}</span></div>
                <div>Read symbol: <span className="font-semibold">{activeTransObj.a || EPSILON}</span></div>
                <div>Pop symbol: <span className="font-semibold">{activeTransObj.top}</span></div>
                <div>To state: <span className="font-semibold">{activeTransObj.to}</span></div>
                <div>Push sequence: <span className="font-semibold">{activeTransObj.push || EPSILON}</span></div>
              </div>
            ) : (
              <div className="text-slate-500 font-mono">
                Initial configuration (no transition applied)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Machine Editor */}
      {showEditor && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-600" />
              Machine Formal Definition & Transitions
            </h3>
            <span className="text-xs text-slate-400">
              M = (Q, Σ, Γ, δ, q₀, Z₀, F)
            </span>
          </div>

          {/* Machine formal tuple inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Start State (q₀)
              </label>
              <input
                type="text"
                value={q0}
                onChange={e => setQ0(e.target.value)}
                className="w-full font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Start Stack Symbol (Z₀)
              </label>
              <input
                type="text"
                maxLength={1}
                value={z0}
                onChange={e => setZ0(e.target.value)}
                className="w-full font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Final States (F, comma separated)
              </label>
              <input
                type="text"
                value={fin}
                onChange={e => setFin(e.target.value)}
                placeholder="e.g. q1, q2"
                className="w-full font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Acceptance Criteria
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="final">Accept by Final State</option>
                <option value="empty">Accept by Empty Stack</option>
              </select>
            </div>
          </div>

          {/* Transitions text area */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Transition Rules (δ) — Format: <span className="font-mono text-amber-600 dark:text-amber-400">state input top newState push</span>
            </label>
            <textarea
              rows={6}
              value={trsText}
              onChange={e => setTrsText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 leading-relaxed focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="q0 a Z q0 XZ&#10;q0 b X q1 e"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Note: Use <code>e</code> or <code>ε</code> for epsilon moves or popping the stack. Pushing <code>XZ</code> replaces the popped top with <code>Z</code> and pushes <code>X</code> above it.
            </p>
          </div>

          {/* Validation errors */}
          {parseErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <span className="font-bold">Syntax Errors Found:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCompileAndRun}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold text-slate-950 text-xs transition"
            >
              Apply Machine Edits & Rerun
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
