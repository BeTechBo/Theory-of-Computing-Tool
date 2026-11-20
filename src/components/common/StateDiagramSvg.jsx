import React, { useMemo } from 'react';

export default function StateDiagramSvg({
  states = [],
  transitions = [],
  activeState = null,
  activeStates = [],
  activeTransition = null,
  initialState = '',
  finalStates = new Set(),
  width = 720,
  height = 320
}) {
  const activeSet = useMemo(() => {
    const s = new Set();
    if (activeState) s.add(activeState);
    if (activeStates && activeStates.length) {
      activeStates.forEach(st => s.add(st));
    }
    return s;
  }, [activeState, activeStates]);

  const finalSet = useMemo(() => {
    if (finalStates instanceof Set) return finalStates;
    if (Array.isArray(finalStates)) return new Set(finalStates);
    return new Set();
  }, [finalStates]);

  // Layout positions
  const layout = useMemo(() => {
    const pos = {};
    const n = states.length;
    if (n === 0) return pos;

    if (n <= 4) {
      const margin = 100;
      const step = n > 1 ? (width - 2 * margin) / (n - 1) : 0;
      const y = height / 2 + 10;
      states.forEach((st, idx) => {
        pos[st] = [n === 1 ? width / 2 : margin + idx * step, y];
      });
    } else {
      const cx = width / 2;
      const cy = height / 2 + 10;
      const rx = Math.min(width / 2 - 80, 240);
      const ry = Math.min(height / 2 - 60, 110);
      states.forEach((st, idx) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * idx) / n;
        pos[st] = [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
      });
    }
    return pos;
  }, [states, width, height]);

  // Group transitions by from -> to
  const groups = useMemo(() => {
    const grp = {};
    transitions.forEach((t, i) => {
      const k = `${t.from}>${t.to}`;
      if (!grp[k]) grp[k] = [];
      grp[k].push({ ...t, index: i });
    });
    return grp;
  }, [transitions]);

  const R = 25; // state circle radius

  return (
    <div className="relative w-full overflow-x-auto select-none bg-slate-50/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[500px] transition-all"
        role="img"
        aria-label="Automaton state diagram"
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-current text-slate-400 dark:text-slate-500" />
          </marker>
          <marker
            id="arrowhead-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-current text-amber-500" />
          </marker>
        </defs>

        {/* Initial state entry arrow */}
        {initialState && layout[initialState] && (
          <g className="text-slate-400 dark:text-slate-500">
            <line
              x1={layout[initialState][0] - 65}
              y1={layout[initialState][1]}
              x2={layout[initialState][0] - R - 3}
              y2={layout[initialState][1]}
              stroke="currentColor"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={layout[initialState][0] - 50}
              y={layout[initialState][1] - 8}
              className="text-[11px] font-mono fill-slate-400 dark:fill-slate-500 text-center"
            >
              start
            </text>
          </g>
        )}

        {/* Edges & Transitions */}
        {Object.entries(groups).map(([k, groupList]) => {
          const [from, to] = k.split('>');
          if (!layout[from] || !layout[to]) return null;

          const [x1, y1] = layout[from];
          const [x2, y2] = layout[to];
          const isLoop = from === to;
          const hasActive = groupList.some(
            t => activeTransition && (t.index === activeTransition || (t.from === activeTransition.from && t.to === activeTransition.to && t.label === activeTransition.label))
          );

          if (isLoop) {
            // Self-loop on top
            const loopPath = `M ${x1 - 14} ${y1 - 21} C ${x1 - 42} ${y1 - 80}, ${x1 + 42} ${y1 - 80}, ${x1 + 14} ${y1 - 21}`;
            return (
              <g key={k}>
                <path
                  d={loopPath}
                  fill="none"
                  className={hasActive ? 'stroke-amber-500 stroke-[3]' : 'stroke-slate-300 dark:stroke-slate-700 stroke-[1.6]'}
                  markerEnd={hasActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                />
                {groupList.map((t, idx) => {
                  const isActive = activeTransition && (t.index === activeTransition || (t.from === activeTransition.from && t.to === activeTransition.to && t.label === activeTransition.label));
                  return (
                    <text
                      key={idx}
                      x={x1}
                      y={y1 - 66 - (groupList.length - 1 - idx) * 14}
                      textAnchor="middle"
                      className={`text-[11px] font-mono font-medium ${
                        isActive
                          ? 'fill-amber-600 dark:fill-amber-400 font-bold'
                          : 'fill-slate-600 dark:fill-slate-300'
                      }`}
                      style={{ paintOrder: 'stroke', stroke: 'var(--tw-stroke-paint, rgba(255,255,255,0.8))', strokeWidth: 3 }}
                    >
                      {t.label}
                    </text>
                  );
                })}
              </g>
            );
          } else {
            // Between two distinct states
            const dx = x2 - x1;
            const dy = y2 - y1;
            const L = Math.hypot(dx, dy) || 1;
            const ux = dx / L;
            const uy = dy / L;
            const px = -uy;
            const py = ux;

            const hasReverse = groups[`${to}>${from}`] !== undefined;
            const isFar = Math.abs(L) > 280;
            const offset = hasReverse ? 32 : (isFar ? 24 : 0);

            const sx = x1 + ux * R;
            const sy = y1 + uy * R;
            const ex = x2 - ux * (R + 4);
            const ey = y2 - uy * (R + 4);
            const cx = (x1 + x2) / 2 + px * offset * 2;
            const cy = (y1 + y2) / 2 + py * offset * 2;

            const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
            const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
            const my = 0.25 * sy + 0.5 * cy + 0.25 * ey;

            return (
              <g key={k}>
                <path
                  d={pathD}
                  fill="none"
                  className={hasActive ? 'stroke-amber-500 stroke-[3]' : 'stroke-slate-300 dark:stroke-slate-700 stroke-[1.6]'}
                  markerEnd={hasActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                />
                {groupList.map((t, idx) => {
                  const isActive = activeTransition && (t.index === activeTransition || (t.from === activeTransition.from && t.to === activeTransition.to && t.label === activeTransition.label));
                  return (
                    <text
                      key={idx}
                      x={mx + px * 12}
                      y={my + py * 12 - 4 + idx * 14 - (groupList.length - 1) * 7}
                      textAnchor="middle"
                      className={`text-[11px] font-mono font-medium ${
                        isActive
                          ? 'fill-amber-600 dark:fill-amber-400 font-bold'
                          : 'fill-slate-600 dark:fill-slate-300'
                      }`}
                      style={{ paintOrder: 'stroke', stroke: 'var(--tw-stroke-paint, rgba(255,255,255,0.8))', strokeWidth: 3 }}
                    >
                      {t.label}
                    </text>
                  );
                })}
              </g>
            );
          }
        })}

        {/* Nodes (States) */}
        {states.map(s => {
          if (!layout[s]) return null;
          const [x, y] = layout[s];
          const isCur = activeSet.has(s);
          const isFin = finalSet.has(s);

          return (
            <g key={s} className="transition-all duration-200">
              {/* Outer circle if final state */}
              {isFin && (
                <circle
                  cx={x}
                  cy={y}
                  r={R + 5}
                  fill="none"
                  className={isCur ? 'stroke-amber-500 stroke-2' : 'stroke-slate-400 dark:stroke-slate-600 stroke-[1.8]'}
                />
              )}

              {/* Main state circle */}
              <circle
                cx={x}
                cy={y}
                r={R}
                className={`transition-colors duration-200 ${
                  isCur
                    ? 'fill-amber-400 dark:fill-amber-500 stroke-amber-600 dark:stroke-amber-400 stroke-2 shadow-lg'
                    : 'fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-600 stroke-2'
                }`}
              />

              {/* State label */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-[13px] font-mono font-semibold select-none ${
                  isCur
                    ? 'fill-slate-950 font-bold'
                    : 'fill-slate-800 dark:fill-slate-200'
                }`}
              >
                {s}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
