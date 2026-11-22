import React from 'react';
import { Sparkles } from 'lucide-react';
import Mascot from './Mascot';
import { Confetti } from './Doodles';
import SolutionPlayer from '../tutor/SolutionPlayer';
import { FOLLOW_UPS } from './suggestions.js';
import GraphView from '../tutor/GraphView';
import { machineToDot } from '../tutor/machine.js';
import { CheckCircle2, XCircle } from 'lucide-react';

// Tiny, safe formatter: **bold**, `code`, "- " bullets, ``` blocks. Builds React
// elements (no innerHTML), so model output can never inject markup.
export function RichText({ text }) {
  const blocks = String(text || '').split(/```\w*\n?/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) =>
        bi % 2 === 1 ? (
          <pre key={bi} className="font-mono text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 overflow-x-auto whitespace-pre">
            {block.replace(/\n$/, '')}
          </pre>
        ) : (
          <Paragraphs key={bi} text={block} />
        )
      )}
    </div>
  );
}

function Paragraphs({ text }) {
  const lines = text.split('\n');
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul${out.length}`} className="list-disc pl-5 space-y-0.5">
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  lines.forEach(l => {
    if (/^\s*[-•]\s+/.test(l)) list.push(l.replace(/^\s*[-•]\s+/, ''));
    else {
      flush();
      if (l.trim()) out.push(<p key={`p${out.length}`}>{inline(l)}</p>);
    }
  });
  flush();
  return <>{out}</>;
}

function inline(raw) {
  // The AI sometimes writes LaTeX like $2^n$: show it as plain text
  const s = raw.replace(/\$([^$\n]+)\$/g, (_, m) => m.replace(/\^\{?n\}?/g, 'ⁿ').replace(/\\(cup|in|delta|epsilon|emptyset)\b/g, (_, w) => ({ cup: '∪', in: '∈', delta: 'δ', epsilon: 'ε', emptyset: '∅' })[w]));
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="font-mono text-[0.9em] bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-1.5 py-0.5">
          {part.slice(1, -1)}
        </code>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const looksTabular = t => t.split('\n').filter(l => /\|/.test(l)).length >= 2;

export function UserBubble({ text, images = [], imageCount = 0 }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 max-w-[85%]">
          {images.map((src, i) => (
            <img key={i} src={src} alt="Attached picture" className="max-h-56 max-w-full rounded-2xl border-2 border-teal-200 shadow-sm" />
          ))}
        </div>
      )}
      {!images.length && imageCount > 0 && (
        <span className="text-xs font-bold text-slate-400">📷 {imageCount === 1 ? 'a picture' : `${imageCount} pictures`}</span>
      )}
      {text && (
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-teal-500 text-white px-4 py-2.5 shadow-sm shadow-teal-500/20">
          {looksTabular(text) ? (
            <pre className="font-mono text-[13px] whitespace-pre overflow-x-auto">{text}</pre>
          ) : (
            <p className="font-round font-semibold whitespace-pre-wrap">{text}</p>
          )}
        </div>
      )}
    </div>
  );
}

// "Thinking" bubble; after a few seconds it tells the student it is still working.
function Typing() {
  const [secs, setSecs] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const note = secs >= 20 ? 'Almost there, thanks for waiting…' : secs >= 6 ? 'Still working on it…' : '';
  return (
    <div className="flex items-end gap-2">
      <Mascot mood="thinking" size={46} />
      <div className="rounded-3xl rounded-bl-lg bg-white border-2 border-slate-100 px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="typing-dot w-2 h-2 rounded-full bg-violet-400" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
        {note && <span className="ml-2 text-sm font-round font-semibold text-slate-500">{note}</span>}
      </div>
    </div>
  );
}

export function BotMessage({ msg, latest, onAction }) {
  if (msg.kind === 'typing') return <Typing />;

  return (
    <div className="flex items-start gap-2">
      <div className="shrink-0 pt-1">
        <Mascot mood={msg.mood || 'idle'} size={46} bob={latest} />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {msg.kind === 'answer' ? (
          <AnswerCard answer={msg.answer} />
        ) : (
          <div className="relative inline-block max-w-full rounded-3xl rounded-tl-lg bg-white border-2 border-slate-100 px-4 py-2.5 font-round text-[15px] text-slate-700 shadow-sm">
            {latest && msg.celebrate && <Confetti />}
            <RichText text={msg.text} />
          </div>
        )}

        {/* Suggested next questions written by the AI (answers and plain replies) */}
        {latest && msg.kind !== 'solution' && msg.followUps?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.followUps.map((q, i) => (
              <Chip key={q} color={['violet', 'amber', 'pink'][i % 3]} onClick={() => onAction({ type: 'ask', question: q })}>
                💡 {q}
              </Chip>
            ))}
          </div>
        )}

        {msg.kind === 'solution' && (
          <>
            <div className="rounded-3xl border-2 border-slate-100 bg-slate-50/60 p-3 sm:p-4">
              <SolutionPlayer solution={msg.solution} checks={msg.checks} keyboard={latest} />
            </div>
            {msg.explainState === 'loading' && (
              <p className="flex items-center gap-1.5 text-xs font-round text-violet-600">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Thinking about what each state means…
              </p>
            )}
            {latest && (
              <div className="flex flex-wrap gap-2">
                {msg.solution.technique === 'eps_removal' && (
                  <Chip color="sky" onClick={() => onAction({ type: 'say', text: 'Now convert it to a DFA' })}>➡️ Now turn it into a DFA</Chip>
                )}
                {msg.solution.technique === 'subset_construction' && (
                  <Chip color="sky" onClick={() => onAction({ type: 'say', text: 'Now minimise it' })}>➡️ Now minimise it</Chip>
                )}
                {!['moore_mealy'].includes(msg.solution.technique) && (
                  <Chip color="teal" onClick={() => onAction({ type: 'test' })}>🧪 Test my own string</Chip>
                )}
                {(FOLLOW_UPS[msg.solution.technique] || []).map((q, i) => (
                  <Chip key={q} color={['violet', 'amber', 'pink'][i % 3]} onClick={() => onAction({ type: 'ask', question: q })}>
                    💡 {q}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Chip({ children, onClick, color = 'slate', active = false, disabled = false, title }) {
  const palette = {
    teal: 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    pink: 'border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100',
    sky: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
    slate: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 rounded-full border-2 text-sm font-round font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : palette
      }`}
    >
      {children}
    </button>
  );
}

// A structured explanation: the short answer, the steps, tiny example machines
// (drawn and checked by code), the common mistake, and where it was taught.
function AnswerCard({ answer }) {
  return (
    <div className="rounded-3xl rounded-tl-lg bg-white border-2 border-slate-100 px-5 py-4 font-round text-[15px] text-slate-700 shadow-sm space-y-3">
      <div className="text-[16px] text-slate-900 font-semibold">
        <RichText text={answer.short} />
      </div>

      {answer.explain.length > 0 && (
        <ol className="space-y-1.5">
          {answer.explain.map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <div className="min-w-0"><RichText text={line} /></div>
            </li>
          ))}
        </ol>
      )}

      {answer.examples.length > 0 && (
        <div className={`grid gap-3 ${answer.examples.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {answer.examples.map((ex, i) => (
            <div key={i} className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3">
              <div className="text-sm font-bold text-slate-800 mb-1">
                <RichText text={ex.caption || 'Example'} />
              </div>
              <GraphView dot={machineToDot(ex.machine)} />
              {ex.tests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ex.tests.map((t, j) => (
                    <span
                      key={j}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                        t.accepted ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {t.accepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.input === '' ? 'ε' : t.input}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {answer.trap && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-100 px-4 py-2.5 text-[14px]">
          <div className="font-bold text-amber-800">⚠️ Common mistake</div>
          <div className="text-amber-900"><RichText text={answer.trap} /></div>
        </div>
      )}

      {answer.session && (
        <p className="text-xs font-bold text-slate-400">📚 Taught in Session {Number(answer.session.slice(1))}</p>
      )}
    </div>
  );
}
