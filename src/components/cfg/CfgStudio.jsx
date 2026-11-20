import React, { useState, useEffect } from 'react';
import {
  GitFork, CheckCircle2, XCircle, Sparkles, BookOpen, Layers
} from 'lucide-react';
import { CFG_PRESETS, findLeftmostDerivation, parseCfgRules, computeCykTable, EPSILON } from './cfgEngine';

// Parse Tree Visualizer Component using SVG
function ParseTreeSvg({ node, width = 640, height = 300 }) {
  if (!node) return null;

  // Compute positions recursively
  let idCounter = 0;
  const layoutNode = (n, depth = 0, left = 0, right = width) => {
    const id = idCounter++;
    const x = (left + right) / 2;
    const y = 40 + depth * 55;

    const children = [];
    if (n.children && n.children.length > 0) {
      const step = (right - left) / n.children.length;
      n.children.forEach((c, idx) => {
        children.push(layoutNode(c, depth + 1, left + idx * step, left + (idx + 1) * step));
      });
    }

    return { id, name: n.name, x, y, children };
  };

  const root = layoutNode(node);

  // Collect nodes and edges
  const lines = [];
  const nodes = [];

  const traverse = (n) => {
    nodes.push(n);
    if (n.children) {
      n.children.forEach(c => {
        lines.push({ x1: n.x, y1: n.y, x2: c.x, y2: c.y });
        traverse(c);
      });
    }
  };

  traverse(root);

  return (
    <div className="w-full overflow-x-auto bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]" role="img" aria-label="Derivation parse tree">
        {/* Branches */}
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1 + 14}
            x2={l.x2}
            y2={l.y2 - 14}
            className="stroke-slate-300 dark:stroke-slate-700 stroke-2"
          />
        ))}

        {/* Nodes */}
        {nodes.map(n => {
          const isLeaf = !n.children || n.children.length === 0;

          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={15}
                className={`transition-all ${
                  isLeaf
                    ? 'fill-teal-100 dark:fill-teal-950/80 stroke-teal-500 stroke-2'
                    : 'fill-white dark:fill-slate-800 stroke-amber-500 stroke-2'
                }`}
              />
              <text
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-xs font-mono font-bold select-none ${
                  isLeaf
                    ? 'fill-teal-800 dark:fill-teal-300'
                    : 'fill-slate-800 dark:fill-slate-200'
                }`}
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CfgStudio() {
  const [selectedPreset, setSelectedPreset] = useState('Arithmetic Expressions');
  const [grammar, setGrammar] = useState(CFG_PRESETS['Arithmetic Expressions']);
  const [inputStr, setInputStr] = useState('a+a*a');
  const [derivationResult, setDerivationResult] = useState(null);

  const handleSelectPreset = (key) => {
    const p = CFG_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setGrammar(p);
    setInputStr(p.sampleInputs?.[0] || '');
  };

  const handleParse = () => {
    const res = findLeftmostDerivation(grammar, inputStr);
    setDerivationResult(res);
  };

  useEffect(() => {
    handleParse();
  }, [grammar, inputStr]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Context-Free Grammar
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Start Symbol: {grammar.startSymbol}
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mt-1">
              Context-Free Grammar (CFG) & Parse Tree Studio
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Preset:</span>
            <select
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {Object.keys(CFG_PRESETS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input & parse */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-center">
          <div className="md:col-span-8 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Test String (w):
            </label>
            <input
              type="text"
              value={inputStr}
              onChange={e => setInputStr(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleParse(); }}
              placeholder="e.g. a+a*a"
              className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={handleParse}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              Generate Parse Tree
            </button>
          </div>

          <div className="md:col-span-4 flex items-center justify-end">
            {derivationResult && (
              derivationResult.found ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Valid Derivation ({derivationResult.derivationSteps.length - 1} steps)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-semibold">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Cannot be generated by grammar
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Grammar Rules + Derivation Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Grammar productions & Derivation history */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Grammar Production Rules (P)
            </h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre leading-relaxed text-slate-700 dark:text-slate-300">
              {grammar.rawRules}
            </div>
          </div>

          {/* Derivation sequence */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Leftmost Derivation Sequence
            </h3>
            {derivationResult?.found ? (
              <div className="space-y-1.5 font-mono text-xs max-h-72 overflow-y-auto">
                {derivationResult.derivationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">#{idx}</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {step.form.join(' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {step.rule}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No derivation found for this input.</p>
            )}
          </div>
        </div>

        {/* Right: SVG Parse Tree Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-purple-500" />
                Concrete Syntax Tree (Parse Tree)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Leaf nodes (terminals): <span className="text-teal-500 font-bold">{inputStr}</span>
              </span>
            </div>

            {derivationResult?.found && derivationResult.tree ? (
              <ParseTreeSvg node={derivationResult.tree} width={620} height={280} />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                Enter an accepted string to render the derivation parse tree
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
