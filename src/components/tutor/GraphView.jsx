import React, { useEffect, useState } from 'react';

// Graphviz (WASM) is large, so it is loaded only when the tutor first draws a graph.
let vizPromise = null;
const getViz = () => (vizPromise ||= import('@viz-js/viz').then(m => m.instance()));

const quote = s => `"${String(s).replace(/"/g, '\\"')}"`;

// Add our default look after the first "{" and the highlight colours before the
// last "}". Later node statements in DOT add attributes, so this works on any
// valid DOT the LLM returns, not only on ours.
export function decorateDot(dot, highlight = []) {
  const open = dot.indexOf('{');
  const close = dot.lastIndexOf('}');
  if (open < 0 || close < 0) return dot;
  const defaults =
    '\n  bgcolor="transparent"; pad=0.2;' +
    '\n  node [fontname="Helvetica", fontsize=12, width=0.5, height=0.5];' +
    '\n  edge [fontname="Helvetica", fontsize=11, arrowsize=0.7];';
  const marks = highlight
    .map(h => `\n  ${quote(h)} [style=filled, fillcolor="#fcd34d", color="#d97706", fontcolor="#1e293b", penwidth=2];`)
    .join('');
  return dot.slice(0, open + 1) + defaults + dot.slice(open + 1, close) + marks + '\n' + dot.slice(close);
}

export default function GraphView({ dot, highlight = [] }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!dot) return;
    getViz()
      .then(viz => {
        const out = viz.renderString(decorateDot(dot, highlight), { format: 'svg' });
        // Let the diagram follow light/dark mode: plain black becomes the text colour.
        // Keep the natural size as a maximum, so a 2-state machine is not blown up to full width.
        const w = parseFloat((out.match(/<svg width="([\d.]+)pt"/) || [])[1] || '0');
        const themed = out
          .replaceAll('"black"', '"currentColor"')
          .replace(/<svg width="[^"]*" height="[^"]*"/, w ? `<svg style="max-width:${Math.round(w * 1.8)}px;width:100%"` : '<svg');
        if (!cancelled) {
          setSvg(themed);
          setError(null);
        }
      })
      .catch(e => !cancelled && setError(e.message || String(e)));
    return () => {
      cancelled = true;
    };
  }, [dot, highlight.join('\u0000')]);

  if (!dot) return null;
  if (error) {
    return (
      <div className="text-xs rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 p-3">
        <p className="font-semibold text-rose-700 dark:text-rose-300 mb-1">The diagram could not be drawn (invalid DOT).</p>
        <pre className="font-mono whitespace-pre-wrap text-slate-600 dark:text-slate-400">{dot}</pre>
      </div>
    );
  }
  return (
    <div
      className="tutor-graph w-full flex justify-center text-slate-700 dark:text-slate-200 [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:max-h-[340px]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
