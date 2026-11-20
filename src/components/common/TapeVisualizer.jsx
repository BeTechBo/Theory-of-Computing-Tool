import React from 'react';

export default function TapeVisualizer({
  tape = '',
  headIndex = 0,
  label = 'Input Tape',
  emptyLabel = 'ε (empty string)'
}) {
  const chars = Array.isArray(tape) ? tape : tape.split('');

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{label}</span>
          <span className="font-mono text-[11px]">
            head index: <span className="text-amber-600 dark:text-amber-400 font-semibold">{headIndex}</span> / {chars.length}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 p-2.5 overflow-x-auto bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[58px]">
        {chars.length === 0 ? (
          <div className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-400">
            {emptyLabel}
          </div>
        ) : (
          chars.map((ch, idx) => {
            const isProcessed = idx < headIndex;
            const isCurrent = idx === headIndex;

            return (
              <div
                key={idx}
                className={`relative flex flex-col items-center justify-center min-w-[38px] h-10 rounded-lg border font-mono font-medium text-sm transition-all duration-150 ${
                  isCurrent
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 shadow-md ring-2 ring-amber-400/40 scale-105 z-10'
                    : isProcessed
                    ? 'bg-slate-200/50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-600 line-through'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span>{ch}</span>
                {isCurrent && (
                  <span className="absolute -bottom-3 text-[10px] text-amber-500 animate-bounce">
                    ▲
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
