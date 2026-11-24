import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, ListOrdered } from 'lucide-react';
import GraphView from './GraphView';
import { StepExtras } from './renderers/grammar';

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm';
const h3 = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2';

// Renders one answer in the shared JSON contract (plan §4), whoever produced it:
// our code generators or the LLM.
export default function SolutionPlayer({ solution, checks = [], keyboard = true, quizDefault = false }) {
  // ?step=N opens a given step and ?all=1 shows every step (handy for the demo script)
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const [idx, setIdx] = useState(() => Math.max(0, Math.min((solution.steps?.length || 1) - 1, Number(params.get('step') || 1) - 1)));
  const [showAll, setShowAll] = useState(params.get('all') === '1');
  const steps = solution.steps || [];
  // Quiz mode: before showing a step that has a quiz, ask it first.
  const [quizOn, setQuizOn] = useState(quizDefault);
  const [asking, setAsking] = useState(null); // index of the step being asked about
  const [picks, setPicks] = useState({}); // step index -> chosen option
  const hasQuizzes = steps.some(s => s.quiz);
  // Grammars are "generated", machines "accepted": a solution may name its own two verdicts.
  const [yes, no] = solution.test_labels || ['accepted', 'rejected'];
  const answered = Object.keys(picks).length;
  const right = Object.entries(picks).filter(([i, o]) => steps[i]?.quiz?.answer === o).length;

  const goNext = () => {
    if (asking !== null) return;
    const n = idx + 1;
    if (n >= steps.length) return;
    if (quizOn && steps[n].quiz && !(n in picks)) setAsking(n);
    else setIdx(n);
  };
  const reveal = () => {
    setIdx(asking);
    setAsking(null);
  };

  const firstSolution = React.useRef(solution);
  useEffect(() => {
    if (solution !== firstSolution.current) setIdx(0);
  }, [solution]);

  // ← / → keys walk the steps
  useEffect(() => {
    const onKey = e => {
      if (!keyboard || showAll || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft' && asking === null) setIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });


  const shown = showAll ? steps.map((s, i) => [s, i]) : [[steps[idx], idx]];

  return (
    <div className="space-y-5">
      {/* Step controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={showAll || idx === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs font-mono text-slate-500 min-w-[90px] text-center">
            {showAll ? `all ${steps.length} steps` : `step ${idx + 1} / ${steps.length}`}
          </span>
          <button
            onClick={goNext}
            disabled={showAll || idx === steps.length - 1 || asking !== null}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-40 transition"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {hasQuizzes && !showAll && (
            <button
              onClick={() => {
                setQuizOn(q => !q);
                setAsking(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                quizOn ? 'bg-violet-600 border-violet-600 text-white' : 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100'
              }`}
              title="Guess each step before you see it"
            >
              🤔 {quizOn ? `Quiz on · ${right}/${answered}` : 'Quiz me'}
            </button>
          )}
          {!showAll && (
            <div className="hidden sm:flex gap-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-teal-600' : i < idx ? 'w-3 bg-teal-300 dark:bg-teal-800' : 'w-3 bg-slate-300 dark:bg-slate-700'}`}
                  title={steps[i].title}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAll(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ListOrdered className="w-3.5 h-3.5" /> {showAll ? 'One step at a time' : 'Show all steps'}
          </button>
        </div>
      </div>

      {/* The step(s) */}
      {shown.map(([step, i]) => step && <StepCard key={i} step={step} number={i + 1} />)}

      {/* Quiz: guess the next step before seeing it */}
      {asking !== null && (
        <QuizCard
          quiz={steps[asking].quiz}
          number={asking + 1}
          picked={picks[asking]}
          onPick={o => setPicks(p => ({ ...p, [asking]: o }))}
          onReveal={reveal}
        />
      )}

      {/* Tests + self-check + summary, after the last step */}
      {(showAll || idx === steps.length - 1) && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className={card}>
            <h3 className={h3}>Test strings</h3>
            <table className="w-full text-sm">
              <tbody>
                {(solution.tests || []).map((t, i) => (
                  <tr key={i} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 font-mono font-semibold">{t.input === '' ? 'ε' : t.input}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-slate-500 dark:text-slate-400">{t.path}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {'accepted' in t ? (
                        t.accepted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4" /> {yes}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                            <XCircle className="w-4 h-4" /> {no}
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-xs">{t.output}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {checks.some(c => c.ok === false) && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1.5">
                <p className="text-xs font-bold text-rose-700">Heads up: something here doesn't add up</p>
                {checks.filter(c => c.ok === false).map((c, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {c.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className={`${card} bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900`}>
            {solution.facts?.length > 0 && (
              <>
                <h3 className={h3}>{solution.facts_title || 'What each state means'}</h3>
                <ul className="space-y-1 text-sm mb-4">
                  {solution.facts.map((f, i) => (
                    <li key={i}>
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">{f.item}</span>
                      <span className="text-slate-700 dark:text-slate-300">: {f.meaning}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {solution.language && (
              <>
                <h3 className={h3}>The language</h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 mb-4">{solution.language}</p>
              </>
            )}
            <h3 className={h3}>Result</h3>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{solution.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step, number }) {
  const cellSet = new Set((step.highlight_cells || []).map(([r, c]) => `${r},${c}`));
  const hasTable = Array.isArray(step.table) && step.table.length > 0;
  return (
    <div className={`${card} animate-pop`}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-mono text-teal-600 dark:text-teal-400">Step {number}</span>
        <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-slate-100">{step.title}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-3xl">{step.explain}</p>

      {step.lines?.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono text-[13px]">
          {step.lines.map((l, i) => (
            <li
              key={i}
              className={`px-3 py-1 rounded-md ${
                /\(new\)/.test(l)
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              {l}
            </li>
          ))}
        </ul>
      )}

      {(hasTable || step.graph) && (
        <div className={`mt-4 grid gap-5 ${hasTable && step.graph ? 'lg:grid-cols-2' : ''} items-start`}>
          {hasTable && (
            <div className="overflow-x-auto">
              <table className="text-sm font-mono border-collapse">
                <thead>
                  <tr>
                    {step.table[0].map((h, c) => (
                      <th key={c} className="px-3 py-1.5 text-left border-b-2 border-slate-300 dark:border-slate-700 text-slate-500 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {step.table.slice(1).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={`px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap transition-colors ${
                            cellSet.has(`${r + 1},${c}`)
                              ? 'bg-amber-200 dark:bg-amber-800/60 text-slate-900 dark:text-amber-50 font-semibold'
                              : c === 0
                              ? 'font-semibold text-slate-800 dark:text-slate-200'
                              : 'text-slate-700 dark:text-slate-300'
                          } ${cell === '…' ? 'text-slate-400 dark:text-slate-600' : ''}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {step.graph && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-2">
              <GraphView dot={step.graph} highlight={step.highlight || []} />
            </div>
          )}
        </div>
      )}

      {/* Plug-in slot for the special renderers: tree, stack, grammar diff (S17–S21) */}
      <StepExtras extra={step.extra} />
    </div>
  );
}

function QuizCard({ quiz, number, picked, onPick, onReveal }) {
  const done = picked !== undefined;
  const correct = picked === quiz.answer;
  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/70 p-5 animate-pop">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1">🤔 Guess step {number} before you see it</p>
      <p className="font-serif text-lg font-bold text-slate-900 mb-3">{quiz.question}</p>
      <div className="flex flex-wrap gap-2">
        {quiz.options.map(o => {
          const isAns = o === quiz.answer;
          const style = !done
            ? 'bg-white border-violet-200 hover:border-violet-400 hover:bg-violet-100'
            : isAns
            ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
            : o === picked
            ? 'bg-rose-100 border-rose-400 text-rose-900'
            : 'bg-white border-slate-200 opacity-50';
          return (
            <button key={o} disabled={done} onClick={() => onPick(o)} className={`px-4 py-2 rounded-xl border-2 font-mono text-sm font-semibold transition active:scale-95 ${style}`}>
              {o}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className={`text-sm font-semibold ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>
            {correct ? '✓ Correct! ' : `✗ Not quite: it's ${quiz.answer}. `}
            <span className="font-normal text-slate-700">{quiz.why}</span>
          </p>
          <button onClick={onReveal} className="ml-auto px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold">
            See the step →
          </button>
        </div>
      )}
    </div>
  );
}
