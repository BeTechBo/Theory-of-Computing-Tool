import React, { useState } from 'react';
import {
  ShieldAlert, Swords, Trophy, CheckCircle2, RotateCcw, HelpCircle
} from 'lucide-react';

export default function PumpingLemmaGame() {
  const [lemmaType, setLemmaType] = useState('regular'); // 'regular' or 'cfl'
  const [p, setP] = useState(3);
  const [iValue, setIValue] = useState(2);
  const [gameWon, setGameWon] = useState(false);

  // In Regular pumping lemma on 0^n 1^n:
  // s = 0^p 1^p
  // y must consist entirely of 0s, length between 1 and p
  const [yLength, setYLength] = useState(1);

  const sString = lemmaType === 'regular'
    ? `${'0'.repeat(p)}${'1'.repeat(p)}`
    : `${'a'.repeat(p)}${'b'.repeat(p)}${'c'.repeat(p)}`;

  // Regular partition: x = 0^(p - yLen), y = 0^yLen, z = 1^p
  const xPart = lemmaType === 'regular' ? '0'.repeat(p - yLength) : 'a'.repeat(p - yLength);
  const yPart = lemmaType === 'regular' ? '0'.repeat(yLength) : 'a'.repeat(yLength);
  const zPart = lemmaType === 'regular' ? '1'.repeat(p) : `${'b'.repeat(p)}${'c'.repeat(p)}`;

  const pumpedString = `${xPart}${yPart.repeat(iValue)}${zPart}`;

  // Evaluate contradiction
  const count0 = (pumpedString.match(/0/g) || []).length;
  const count1 = (pumpedString.match(/1/g) || []).length;
  const countA = (pumpedString.match(/a/g) || []).length;
  const countB = (pumpedString.match(/b/g) || []).length;
  const countC = (pumpedString.match(/c/g) || []).length;

  const isContradiction = lemmaType === 'regular'
    ? count0 !== count1
    : (countA !== countB || countB !== countC);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Interactive Proof Game
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Adversary Game Framework
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Pumping Lemma Playground & Non-Regularity Proofs
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLemmaType('regular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                lemmaType === 'regular'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Regular Languages (0ⁿ1ⁿ)
            </button>
            <button
              onClick={() => setLemmaType('cfl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                lemmaType === 'cfl'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Context-Free (aⁿbⁿcⁿ)
            </button>
          </div>
        </div>

        {/* Steps of the Adversary Game */}
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                Step 1: Adversary
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Picks Pumping Length (p)
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">p =</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={p}
                  onChange={e => setP(Math.max(1, Math.min(8, Number(e.target.value))))}
                  className="w-16 text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850"
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">
                Step 2: You
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Select String s (|s| ≥ p)
              </h4>
              <div className="text-xs font-mono text-teal-600 dark:text-teal-400 mt-2 font-bold break-all">
                s = {sString}
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                Step 3: Adversary
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Partitions s = xyz (|xy| ≤ p)
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono text-slate-500">|y| =</span>
                <input
                  type="range"
                  min={1}
                  max={p}
                  value={yLength}
                  onChange={e => setYLength(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-xs font-mono font-bold">{yLength}</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">
                Step 4: You
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Choose Pumping Index (i)
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono text-slate-500">i =</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={iValue}
                  onChange={e => setIValue(Math.max(0, Math.min(6, Number(e.target.value))))}
                  className="w-16 text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Breakdown of Partition & Pumping */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Partition & Pumped String Analysis
        </h3>

        {/* Partition visualization */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-center font-mono text-sm">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block mb-1">x (prefix)</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {xPart || 'ε'}
            </span>
          </div>

          <span className="text-slate-400 font-sans">+</span>

          <div className="text-center">
            <span className="text-[10px] text-amber-500 font-bold block mb-1">y (pumped string)</span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold ring-2 ring-amber-400">
              {yPart}
            </span>
          </div>

          <span className="text-slate-400 font-sans">+</span>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 block mb-1">z (suffix)</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {zPart}
            </span>
          </div>
        </div>

        {/* Pumped result */}
        <div className="p-4 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center space-y-2">
          <span className="text-xs text-slate-500">
            Resulting Pumped String: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">w' = x · y^{iValue} · z</span>
          </span>
          <div className="font-mono text-base font-bold text-teal-600 dark:text-teal-400 break-all text-center">
            "{pumpedString}"
          </div>

          <div className="text-xs font-mono text-slate-500 flex gap-4 mt-1">
            {lemmaType === 'regular' ? (
              <>
                <span>#0's = <b>{count0}</b></span>
                <span>#1's = <b>{count1}</b></span>
              </>
            ) : (
              <>
                <span>#a's = <b>{countA}</b></span>
                <span>#b's = <b>{countB}</b></span>
                <span>#c's = <b>{countC}</b></span>
              </>
            )}
          </div>
        </div>

        {/* Contradiction verdict banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          isContradiction
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {isContradiction ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {isContradiction ? 'Contradiction Established! Proof Succeeded!' : 'No Contradiction Yet'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isContradiction
                  ? lemmaType === 'regular'
                    ? `Because #0 (${count0}) ≠ #1 (${count1}), the pumped string w' ∉ L. Therefore, L is not regular!`
                    : `Because the counts of a, b, c are not equal, w' ∉ L. Therefore, L is not context-free!`
                  : 'The counts still balance. Try choosing i = 0 or i = 2 to break membership.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
