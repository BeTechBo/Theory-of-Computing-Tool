import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  CheckCircle2, XCircle, ArrowRightLeft, Minimize2, ListChecks, Plus, Trash2, Eye
} from 'lucide-react';
import { FA_PRESETS, simulateFa, convertNfaToDfa, minimizeDfa, EPSILON } from './faEngine';
import StateDiagramSvg from '../common/StateDiagramSvg';
import TapeVisualizer from '../common/TapeVisualizer';

export default function FaStudio() {
  const [selectedPreset, setSelectedPreset] = useState('Ends with "01" (DFA)');
  const [machine, setMachine] = useState(FA_PRESETS['Ends with "01" (DFA)']);
  const [inputStr, setInputStr] = useState('1001');

  // Simulation state
  const [simResult, setSimResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  // Conversion / Minimization modal states
  const [showNfaModal, setShowNfaModal] = useState(false);
  const [nfaConversionResult, setNfaConversionResult] = useState(null);
  const [showMinModal, setShowMinModal] = useState(false);
  const [minimizationResult, setMinimizationResult] = useState(null);

  // Batch testing
  const [batchInputs, setBatchInputs] = useState(['1001', '0101', '1100', '01', '00']);
  const [newBatchStr, setNewBatchStr] = useState('');

  // Load preset
  const handleSelectPreset = (key) => {
    const p = FA_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setMachine(p);
    setInputStr(p.sampleInputs?.[0] || '');
    setBatchInputs(p.sampleInputs || []);
  };

  // Run simulation
  const runSimulation = () => {
    stopPlayback();
    const res = simulateFa(machine, inputStr);
    setSimResult(res);
    setStepIndex(0);
  };

  useEffect(() => {
    runSimulation();
  }, [machine, inputStr]);

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
    }, 800);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, simResult]);

  // Handle NFA to DFA
  const handleConvertNfa = () => {
    const res = convertNfaToDfa(machine);
    setNfaConversionResult(res);
    setShowNfaModal(true);
  };

  // Handle DFA Minimization
  const handleMinimize = () => {
    const res = minimizeDfa(machine);
    setMinimizationResult(res);
    setShowMinModal(true);
  };

  const curStep = simResult?.steps?.[stepIndex];
  const isFinished = simResult && stepIndex === simResult.steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                machine.type === 'DFA'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              }`}>
                {machine.type}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Alphabet: [{machine.alphabet.join(', ')}] · States: {machine.states.length}
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Finite Automata Studio (DFA & NFA)
            </h2>
          </div>

          {/* Quick Presets & Algorithms */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {Object.keys(FA_PRESETS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>

            {machine.type === 'NFA' ? (
              <button
                onClick={handleConvertNfa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>NFA → DFA</span>
              </button>
            ) : (
              <button
                onClick={handleMinimize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimize DFA</span>
              </button>
            )}
          </div>
        </div>

        {/* Input & Stepping bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-center">
          <div className="md:col-span-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Input String:
            </label>
            <input
              type="text"
              value={inputStr}
              onChange={e => setInputStr(e.target.value)}
              placeholder="e.g. 1001"
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <button
              onClick={runSimulation}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              Run
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
              onClick={() => { stopPlayback(); setStepIndex(p => Math.min((simResult?.steps.length || 1) - 1, p + 1)); }}
              disabled={isFinished}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Verdict */}
        {simResult && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">
                Step <span className="font-bold text-amber-600 dark:text-amber-400">{stepIndex}</span> of {simResult.steps.length - 1}
              </span>
              {isFinished && (
                simResult.accepted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    String Accepted (Reached {simResult.finalActiveStates.filter(s => machine.finalStates.includes(s)).join(', ')})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    String Rejected
                  </span>
                )
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Active states: {curStep?.activeStates?.join(', ') || '∅'}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Tape + State Diagram + Batch Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          {/* Tape */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <TapeVisualizer
              tape={inputStr}
              headIndex={curStep?.index ?? 0}
            />
          </div>

          {/* State diagram */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Transition Diagram
              </h3>
              <div className="text-xs font-mono text-slate-500">
                Active: <span className="font-bold text-amber-500">[{curStep?.activeStates?.join(', ')}]</span>
              </div>
            </div>

            <StateDiagramSvg
              states={machine.states}
              transitions={machine.transitions.map(t => ({
                from: t.from,
                to: t.to,
                label: t.symbol || EPSILON
              }))}
              activeStates={curStep?.activeStates || []}
              initialState={machine.startState}
              finalStates={new Set(machine.finalStates)}
              width={700}
              height={260}
            />
          </div>
        </div>

        {/* Right Column: Batch Testing Matrix */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <ListChecks className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Batch String Tester
              </h3>
            </div>

            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {batchInputs.map((str, idx) => {
                const res = simulateFa(machine, str);
                return (
                  <div
                    key={idx}
                    onClick={() => setInputStr(str)}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 cursor-pointer hover:border-teal-500 transition group text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {str === '' ? 'ε' : str}
                      </span>
                      {str === inputStr && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-sans">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {res.accepted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBatchInputs(batchInputs.filter((_, i) => i !== idx));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new string to batch */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBatchStr}
                onChange={e => setNewBatchStr(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newBatchStr) {
                    setBatchInputs([...batchInputs, newBatchStr]);
                    setNewBatchStr('');
                  }
                }}
                placeholder="Add string to test..."
                className="flex-1 text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
              <button
                onClick={() => {
                  if (newBatchStr) {
                    setBatchInputs([...batchInputs, newBatchStr]);
                    setNewBatchStr('');
                  }
                }}
                className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
                title="Add Test"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: NFA to DFA Subset Construction */}
      {showNfaModal && nfaConversionResult && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-slate-100">
                  NFA → DFA Powerset (Subset) Construction
                </h3>
                <p className="text-xs text-slate-500">
                  Systematic transformation converting nondeterministic states into subset power states
                </p>
              </div>
              <button
                onClick={() => setShowNfaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Powerset Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="p-2.5 border border-slate-200 dark:border-slate-800">DFA State</th>
                    <th className="p-2.5 border border-slate-200 dark:border-slate-800">Subset of NFA States</th>
                    {nfaConversionResult.dfa.alphabet.map(sym => (
                      <th key={sym} className="p-2.5 border border-slate-200 dark:border-slate-800">
                        δ' (on '{sym}')
                      </th>
                    ))}
                    <th className="p-2.5 border border-slate-200 dark:border-slate-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nfaConversionResult.tableRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="p-2.5 font-bold text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-800">
                        {row.dfaName}
                      </td>
                      <td className="p-2.5 border border-slate-200 dark:border-slate-800">
                        {row.subset}
                      </td>
                      {nfaConversionResult.dfa.alphabet.map(sym => (
                        <td key={sym} className="p-2.5 border border-slate-200 dark:border-slate-800">
                          {row.moves[sym]?.targetName} ({row.moves[sym]?.targetSubset})
                        </td>
                      ))}
                      <td className="p-2.5 border border-slate-200 dark:border-slate-800">
                        {row.isFinal ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-sans font-bold">
                            Accepting (Final)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-sans">
                            Non-final
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Generated DFA State Diagram */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                Generated Equivalent DFA Diagram
              </h4>
              <StateDiagramSvg
                states={nfaConversionResult.dfa.states}
                transitions={nfaConversionResult.dfa.transitions}
                initialState={nfaConversionResult.dfa.startState}
                finalStates={new Set(nfaConversionResult.dfa.finalStates)}
                width={700}
                height={260}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setMachine({
                    ...nfaConversionResult.dfa,
                    type: 'DFA'
                  });
                  setShowNfaModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
              >
                Load this DFA into Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DFA Minimization Table-Filling */}
      {showMinModal && minimizationResult && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-slate-100">
                  DFA Minimization (Table-Filling / Myhill-Nerode)
                </h3>
                <p className="text-xs text-slate-500">
                  Distinguishability matrix pairing and merging equivalent quotient states
                </p>
              </div>
              <button
                onClick={() => setShowMinModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Table filling matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono border-collapse border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="p-2 border border-slate-200 dark:border-slate-800">States</th>
                    {minimizationResult.states.slice(0, -1).map(st => (
                      <th key={st} className="p-2 border border-slate-200 dark:border-slate-800">{st}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {minimizationResult.states.slice(1).map((s1, i1) => {
                    const rowIdx = i1 + 1;
                    return (
                      <tr key={s1}>
                        <td className="p-2 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                          {s1}
                        </td>
                        {minimizationResult.states.slice(0, -1).map((s2, colIdx) => {
                          if (colIdx >= rowIdx) {
                            return <td key={s2} className="bg-slate-200/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"></td>;
                          }
                          const isMarked = minimizationResult.markedTable[rowIdx]?.[colIdx];
                          return (
                            <td
                              key={s2}
                              title={minimizationResult.reasonTable[rowIdx]?.[colIdx]}
                              className={`p-2 border border-slate-200 dark:border-slate-800 ${
                                isMarked
                                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 font-bold'
                                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 font-bold'
                              }`}
                            >
                              {isMarked ? '✕' : '='}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex gap-4 text-[11px] text-slate-500 mt-2 font-sans">
                <span className="flex items-center gap-1"><span className="text-rose-500 font-bold font-mono">✕</span> = Distinguishable pair</span>
                <span className="flex items-center gap-1"><span className="text-emerald-500 font-bold font-mono">=</span> = Equivalent pair (can be merged)</span>
              </div>
            </div>

            {/* Minimized Diagram */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                Minimized Quotient DFA (States reduced from {machine.states.length} to {minimizationResult.minimizedDfa.states.length})
              </h4>
              <StateDiagramSvg
                states={minimizationResult.minimizedDfa.states}
                transitions={minimizationResult.minimizedDfa.transitions}
                initialState={minimizationResult.minimizedDfa.startState}
                finalStates={new Set(minimizationResult.minimizedDfa.finalStates)}
                width={700}
                height={260}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setMachine({
                    ...minimizationResult.minimizedDfa,
                    type: 'DFA'
                  });
                  setShowMinModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
              >
                Load this Minimized DFA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
