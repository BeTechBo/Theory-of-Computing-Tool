import React, { useEffect, useRef } from 'react';

// Special renderers for the grammar and PDA techniques (S17–S21, Noor). The step player calls
// <StepExtras extra={step.extra} /> and each renderer draws one key of the contract's "extra":
//   extra.tree   { label, children: [...] }            a derivation tree (nodes may be fresh / pending)
//   extra.trees  [{ title, tree }]                      trees side by side (ambiguity)
//   extra.stack  { input, frames: [{ state, rest, stack: [top, …] }], current }   the stack, move by move
//   extra.diff   { rows: [{ lhs, alts: [{ text, status }] }], before, after }     the grammar, with what changed
// They also accept the looser shapes an LLM tends to write (strings for leaves, "XXZ" for a stack).

const label = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const panel = 'mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3';

export function StepExtras({ extra }) {
  if (!extra || typeof extra !== 'object') return null;
  const trees = Array.isArray(extra.trees) ? extra.trees : extra.tree ? [{ title: '', tree: extra.tree }] : [];
  return (
    <>
      {extra.diff?.rows && <GrammarDiff diff={extra.diff} />}
      {trees.length > 0 && (
        <div className={panel}>
          <div className={`grid gap-4 ${trees.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {trees.map((t, i) => (
              <div key={i} className="min-w-0">
                {t.title && <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono mb-1 text-center">{t.title}</p>}
                <TreeView tree={t.tree} />
              </div>
            ))}
          </div>
          {extra.tree_caption && <p className="mt-1 text-center text-xs font-mono text-slate-600 dark:text-slate-300">{extra.tree_caption}</p>}
          <TreeLegend trees={trees} />
        </div>
      )}
      {extra.stack && <StackView stack={extra.stack} />}
    </>
  );
}

// ---------- derivation tree ----------
const EPS = 'ε';
function normalise(node) {
  if (node == null) return null;
  if (typeof node !== 'object') return { label: String(node), kind: String(node) === EPS ? 'eps' : /^[A-Z]/.test(String(node)) ? 'var' : 'term' };
  const text = String(node.label ?? node.sym ?? node.name ?? node.symbol ?? '?');
  const children = Array.isArray(node.children) ? node.children.map(normalise).filter(Boolean) : [];
  const kind = node.kind || (children.length ? 'var' : text === EPS ? 'eps' : /^[A-Z]/.test(text) ? 'var' : 'term');
  return { label: text, kind, fresh: Boolean(node.fresh), pending: Boolean(node.pending) || (kind === 'var' && !children.length && node.pending !== false && node.kind === undefined), active: Boolean(node.active), children };
}

const NODE_H = 54;
const R = 15;
function layout(root) {
  let nextX = 0;
  let depthMax = 0;
  const nodes = [];
  const edges = [];
  const place = (nd, depth) => {
    depthMax = Math.max(depthMax, depth);
    const w = Math.max(38, nd.label.length * 9 + 22);
    if (!nd.children.length) {
      nd.x = nextX + w / 2;
      nextX += w;
    } else {
      nd.children.forEach(c => place(c, depth + 1));
      nd.x = (nd.children[0].x + nd.children[nd.children.length - 1].x) / 2;
      // a wide label over a single narrow child: keep the leaves from crowding it
      nextX = Math.max(nextX, nd.x + w / 2);
    }
    nd.y = depth * NODE_H + R + 6;
    nodes.push(nd);
    nd.children.forEach(c => edges.push([nd, c]));
  };
  place(root, 0);
  // a wide label above a narrow leaf can stick out on the left: shift everything right
  const shift = Math.max(0, 2 - Math.min(...nodes.map(n => n.x - Math.max(R, (n.label.length * 9 + 12) / 2))));
  nodes.forEach(n => (n.x += shift));
  return { nodes, edges, width: Math.max(nextX + shift, 60), height: depthMax * NODE_H + 2 * R + 14 };
}

export function TreeView({ tree }) {
  const root = normalise(tree);
  if (!root) return null;
  const { nodes, edges, width, height } = layout(root);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: Math.round(width * 1.15), maxWidth: 'none', display: 'block', margin: '0 auto' }} role="img" aria-label="Derivation tree">
        {edges.map(([p, c], i) => (
          <line key={i} x1={p.x} y1={p.y + R - 1} x2={c.x} y2={c.y - R + 1} strokeWidth={c.fresh ? 2 : 1.3} className={c.fresh ? 'stroke-amber-500 tree-fresh' : 'stroke-slate-400 dark:stroke-slate-600'} />
        ))}
        {nodes.map((n, i) => {
          const w = Math.max(26, n.label.length * 9 + 12);
          if (n.kind === 'var') {
            return (
              <g key={i} className={n.fresh ? 'tree-fresh' : ''}>
                <rect
                  x={n.x - Math.max(R, w / 2)}
                  y={n.y - R}
                  width={Math.max(2 * R, w)}
                  height={2 * R}
                  rx={R}
                  strokeWidth={n.active ? 2.4 : 1.5}
                  strokeDasharray={n.pending ? '4 3' : undefined}
                  className={
                    n.fresh
                      ? 'fill-amber-200 stroke-amber-600'
                      : n.active
                      ? 'fill-teal-50 stroke-teal-600 dark:fill-teal-950'
                      : n.pending
                      ? 'fill-white stroke-violet-500 dark:fill-slate-900'
                      : 'fill-white stroke-slate-500 dark:fill-slate-900 dark:stroke-slate-400'
                  }
                />
                <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize="13" fontWeight="600" className="font-mono fill-slate-800 dark:fill-slate-100">
                  {n.label}
                </text>
              </g>
            );
          }
          return (
            <g key={i} className={n.fresh ? 'tree-fresh' : ''}>
              <rect x={n.x - w / 2} y={n.y - 12} width={w} height={24} rx={6} className={n.kind === 'eps' ? 'fill-slate-100 dark:fill-slate-800' : n.fresh ? 'fill-amber-200' : 'fill-teal-100 dark:fill-teal-900'} />
              <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize="13" fontWeight={n.kind === 'eps' ? 400 : 700} fontStyle={n.kind === 'eps' ? 'italic' : 'normal'} className={`font-mono ${n.kind === 'eps' ? 'fill-slate-500' : 'fill-teal-900 dark:fill-teal-100'}`}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TreeLegend({ trees }) {
  const flat = [];
  const walk = n => {
    const x = normalise(n);
    if (!x) return;
    flat.push(x);
    x.children.forEach(walk);
  };
  trees.forEach(t => walk(t.tree));
  const has = k => flat.some(n => n[k]);
  if (!has('fresh') && !has('pending')) return null;
  return (
    <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
      {has('fresh') && <span><span className="inline-block w-3 h-3 rounded-full bg-amber-200 border border-amber-600 align-[-2px]" /> added by this production</span>}
      {has('pending') && <span><span className="inline-block w-3 h-3 rounded-full bg-white border border-dashed border-violet-500 align-[-2px]" /> variable still to expand</span>}
      <span><span className="inline-block w-3 h-3 rounded bg-teal-100 align-[-2px]" /> terminal (a leaf)</span>
    </p>
  );
}

// ---------- the stack, move by move ----------
const cells = s => (Array.isArray(s) ? s.map(String) : typeof s === 'string' ? (s === EPS ? [] : [...s]) : []);
const NOTE_STYLE = { ACCEPT: 'bg-emerald-100 text-emerald-800 border-emerald-300', STUCK: 'bg-rose-100 text-rose-800 border-rose-300' };

export function StackView({ stack }) {
  const frames = (Array.isArray(stack.frames) && stack.frames.length ? stack.frames : [{ state: stack.state, rest: stack.rest, stack: stack.symbols ?? stack.stack, pos: stack.pos }]).map(f => ({ ...f, stack: cells(f.stack) }));
  const cur = Math.max(0, Math.min(frames.length - 1, stack.current ?? frames.length - 1));
  const f = frames[cur];
  const input = typeof stack.input === 'string' ? stack.input : null;
  const pos = f.pos ?? (input != null && typeof f.rest === 'string' ? input.length - (f.rest === EPS ? 0 : f.rest.length) : 0);
  const tallest = Math.max(...frames.map(x => x.stack.length + (x.popped ? 1 : 0)), 1);
  const strip = useRef(null);
  const active = useRef(null);
  useEffect(() => {
    const box = strip.current;
    const el = active.current;
    if (box && el) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [cur, frames.length]);

  return (
    <div className={panel}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className={label}>Input tape</p>
          {input != null && (
            <div className="mt-1 flex items-end font-mono text-sm">
              {input.length === 0 && <span className="px-2 py-1 rounded-md border border-dashed border-slate-300 text-slate-500">ε (empty input)</span>}
              {[...input].map((ch, i) => (
                <span key={i} className="flex flex-col items-center">
                  <span className={`w-7 h-7 flex items-center justify-center border ${i < pos ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 font-semibold'} ${i === 0 ? 'rounded-l-md' : '-ml-px'} ${i === input.length - 1 ? 'rounded-r-md' : ''}`}>{ch}</span>
                  <span className={`text-[10px] leading-3 ${i === pos ? 'text-teal-600' : 'text-transparent'}`}>▲</span>
                </span>
              ))}
              {input.length > 0 && pos >= input.length && <span className="ml-2 mb-3 text-[11px] text-teal-700 dark:text-teal-400 font-sans font-semibold">all read</span>}
            </div>
          )}
        </div>
        <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
          {cur === 0 ? 'start' : `move ${cur}`}
          {f.via ? `:  ${f.via}` : ''}
        </p>
      </div>

      <p className={label}>Stack after each move (top at the top)</p>
      <div ref={strip} className="mt-1 flex gap-1.5 overflow-x-auto pb-2">
        {frames.map((x, i) => {
          const on = i === cur;
          return (
            <div key={i} ref={on ? active : null} className={`shrink-0 w-[68px] rounded-lg px-1 pt-1 pb-1.5 flex flex-col items-center transition ${on ? 'bg-white dark:bg-slate-900 ring-2 ring-teal-400 shadow-sm' : 'opacity-80'}`}>
              <span className="text-[10px] font-mono text-slate-400">{i === 0 ? 'start' : `⊢ ${i}`}</span>
              <div className="flex flex-col justify-end items-center w-full" style={{ height: tallest * 25 + 4 }}>
                {x.popped && on && <span className="w-9 h-6 mb-px flex items-center justify-center rounded border border-dashed border-rose-300 text-rose-400 line-through font-mono text-xs">{x.popped}</span>}
                {x.stack.length === 0 && <span className="text-[11px] italic text-slate-400 mb-1">empty</span>}
                {x.stack.map((sym, k) => (
                  <span
                    key={k}
                    className={`w-9 h-6 -mt-px flex items-center justify-center border font-mono text-xs ${
                      on && k < (x.fresh || 0)
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold animate-pop'
                        : sym === stack.bottom && k === x.stack.length - 1
                        ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-700 dark:text-slate-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-slate-800 dark:text-amber-100'
                    } ${k === 0 ? 'rounded-t' : ''} ${k === x.stack.length - 1 ? 'rounded-b' : ''}`}
                  >
                    {sym}
                  </span>
                ))}
              </div>
              <span className="mt-1 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 truncate max-w-full">{x.state}</span>
              <span className="text-[10px] font-mono text-slate-500 truncate max-w-full" title="unread input">{x.rest === '' || x.rest == null ? EPS : x.rest}</span>
              {x.note && <span className={`mt-1 px-1.5 rounded border text-[9px] font-bold ${NOTE_STYLE[x.note] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>{x.note}</span>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">
        Under each stack: the state and the unread input. <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-400 align-[-2px]" /> just pushed
        {frames.some(x => x.popped) && <> · <span className="text-rose-400 line-through font-mono">X</span> just popped</>}
      </p>
    </div>
  );
}

// ---------- the grammar as a diff ----------
const ALT = {
  same: 'text-slate-800 dark:text-slate-200',
  added: 'bg-emerald-100 text-emerald-900 border border-emerald-300 rounded px-1 font-semibold',
  removed: 'bg-rose-50 text-rose-500 border border-rose-200 rounded px-1 line-through'
};
export function GrammarDiff({ diff }) {
  const changed = diff.changed ?? diff.rows.some(r => r.alts.some(a => a.status !== 'same'));
  return (
    <div className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
        <p className={label}>{changed ? 'The grammar after this step' : 'The grammar (unchanged by this step)'}</p>
        {diff.before != null && (
          <p className="text-xs font-mono text-slate-500">
            {diff.before} → <span className={diff.after !== diff.before ? 'font-bold text-slate-800 dark:text-slate-100' : ''}>{diff.after}</span> productions
          </p>
        )}
      </div>
      <div className="font-mono text-sm space-y-0.5 overflow-x-auto">
        {diff.rows.map((row, i) => (
          <div key={i} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`w-9 shrink-0 text-right font-semibold ${row.status === 'removed' ? 'text-rose-500 line-through' : row.status === 'added' ? 'text-emerald-700' : 'text-slate-900 dark:text-slate-100'}`}>{row.lhs}</span>
            <span className="text-slate-400">→</span>
            {row.alts.map((a, k) => (
              <React.Fragment key={k}>
                {k > 0 && <span className="text-slate-300 dark:text-slate-600">|</span>}
                <span className={ALT[a.status] || ALT.same}>{a.text}</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      {(changed || diff.note) && (
        <p className="mt-2 text-[11px] text-slate-500">
          {changed && (
            <>
              <span className={ALT.added}>new</span> <span className={`${ALT.removed} ml-1`}>removed</span>
            </>
          )}
          {diff.note && <span className="ml-2">{diff.note}</span>}
        </p>
      )}
    </div>
  );
}
