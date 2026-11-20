import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  CheckCircle2, XCircle, AlertTriangle, Settings2, Cpu
} from 'lucide-react';
import { TM_PRESETS, simulateTuringMachine, BLANK } from './tmEngine';
import StateDiagramSvg from '../common/StateDiagramSvg';

export default function TuringMachineStudio() {
  const [selectedPreset, setSelectedPreset] = useState('aⁿbⁿcⁿ  (Beyond Context-Free)');
  const [tm, setTm] = useState(TM_PRESETS['aⁿbⁿcⁿ  (Beyond Context-Free)']);
  const [inputTape, setInputTape] = useState('aabbcc');

  const [simResult, setSimResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [showEditor, setShowEditor] = useState(false);

  const timerRef = useRef(null);

  const handleSelectPreset = (key) => {
    const p = TM_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setTm(p);
    setInputTape(p.initialTape);
  };

  const runSimulation = () => {
    stopPlayback();
    const res = simulateTuringMachine(tm, inputTape);
    setSimResult(res);
    setStepIndex(0);
  };

  useEffect(() => {
    runSimulation();
  }, [tm, inputTape]);

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
      if (!simResult || simResult.history.length <= 1) return;
      if (stepIndex >= simResult.history.length - 1) {
        setStepIndex(0);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setStepIndex(prev => {
        if (!simResult || prev >= simResult.history.length - 1) {
          stopPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, simResult, speed]);

  const currentStep = simResult?.history?.[stepIndex];
  const isFinished = simResult && stepIndex === simResult.history.length - 1;

  // Window of visible tape cells around the head
  const headPos = currentStep?.head ?? 0;
  const visibleRange = 11; // show 11 cells on each side
  const cellIndices = [];
  for (let i = headPos - visibleRange; i <= headPos + visibleRange; i++) {
    cellIndices.push(i);
  }

  // Collect all unique states
  const allStates = Array.from(new Set([
    tm.q0,
    tm.acceptState,
    tm.rejectState,
    ...tm.transitions.map(t => t.from),
    ...tm.transitions.map(t => t.to)
  ]));

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Turing Machine Simulator
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Blank symbol: <span className="font-bold text-amber-500">{BLANK}</span>
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Standard 1-Tape Turing Machine Studio
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Preset:</span>
            <select
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {Object.keys(TM_PRESETS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input & Stepping bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-center">
          <div className="md:col-span-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Initial Tape:
            </label>
            <input
              type="text"
              value={inputTape}
              onChange={e => setInputTape(e.target.value)}
              placeholder="e.g. aabbcc"
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              onClick={runSimulation}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              Load & Run
            </button>
          </div>

          <div className="md:col-span-6 flex items-center justify-end gap-2">
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
              onClick={() => { stopPlayback(); setStepIndex(p => Math.min((simResult?.history.length || 1) - 1, p + 1)); }}
              disabled={isFinished}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>

            <div className="flex items-center gap-1 text-[11px] text-slate-500 ml-2">
              <span>Speed:</span>
              <select
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px]"
              >
                <option value={900}>Slow</option>
                <option value={500}>Normal</option>
                <option value={200}>Fast</option>
                <option value={50}>Turbo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verdict / Status */}
        {simResult && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">
                Step <span className="font-bold text-amber-600 dark:text-amber-400">{stepIndex}</span> of {simResult.history.length - 1}
              </span>
              {isFinished && (
                simResult.accepted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Halted in Accept State ({tm.acceptState})
                  </span>
                ) : simResult.exceededMax ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Reached step limit (possible infinite loop)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Halted (Rejected / No transition)
                  </span>
                )
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              State: <span className="font-bold text-amber-500">{currentStep?.state}</span> · Head: cell #{headPos}
            </div>
          </div>
        )}
      </div>

      {/* Infinite Tape Visualizer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-500" />
            Infinite Turing Tape & Read/Write Head
          </h3>
          <span className="text-xs font-mono text-slate-400">
            ... ─ ─ ─ Infinite cells on both directions ─ ─ ─ ...
          </span>
        </div>

        {/* Tape cells strip */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto flex justify-center">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-600 text-sm">...</span>
            {cellIndices.map(cellIdx => {
              const isHead = cellIdx === headPos;
              const symbol = currentStep?.tapeSnapshot?.[cellIdx] ?? BLANK;

              return (
                <div key={cellIdx} className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-slate-500 mb-1">
                    {cellIdx}
                  </span>
                  <div
                    className={`relative w-11 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-base transition-all duration-150 ${
                      isHead
                        ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-500/40 shadow-xl scale-110 z-10'
                        : symbol !== BLANK
                        ? 'bg-slate-800 text-slate-100 border border-slate-700'
                        : 'bg-slate-900 text-slate-600 border border-slate-800/80'
                    }`}
                  >
                    <span>{symbol}</span>
                  </div>
                  {isHead && (
                    <div className="mt-1 flex flex-col items-center animate-bounce">
                      <span className="text-amber-400 text-xs font-mono">▲</span>
                      <span className="text-[10px] font-mono text-amber-300 font-semibold">HEAD</span>
                    </div>
                  )}
                </div>
              );
            })}
            <span className="font-mono text-slate-600 text-sm">...</span>
          </div>
        </div>
      </div>

      {/* State Diagram & Transition rule applied */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Turing Machine State Diagram
              </h3>
              <div className="text-xs font-mono text-slate-500">
                Current: <span className="font-bold text-amber-500">{currentStep?.state}</span>
              </div>
            </div>

            <StateDiagramSvg
              states={allStates}
              transitions={tm.transitions.map(t => ({
                from: t.from,
                to: t.to,
                label: `${t.read}→${t.write},${t.move}`
              }))}
              activeState={currentStep?.state}
              initialState={tm.q0}
              finalStates={new Set([tm.acceptState])}
              width={700}
              height={260}
            />
          </div>
        </div>

        {/* Right: Step history log */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Execution History
            </h3>

            <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs pr-1">
              {simResult?.history.slice(0, stepIndex + 1).map((h, i) => {
                const isCur = i === stepIndex;
                const r = h.ruleApplied;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      isCur
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 font-semibold text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50/50 dark:bg-slate-850/30 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="text-slate-400 mr-2">#{h.step}</span>
                      <span>q: <b>{h.state}</b></span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {r ? `δ(${r.from}, ${r.read}) = (${r.to}, ${r.write}, ${r.move})` : 'Start'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
