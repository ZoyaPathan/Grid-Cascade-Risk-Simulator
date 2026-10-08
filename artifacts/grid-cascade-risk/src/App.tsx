import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGetGridCase,
  useGetGridOverview,
  useRunGridSimulation,
  getGetGridOverviewQueryKey,
} from '@workspace/api-client-react';
import type { GridBus, GridLine, SimulationInput, SimulationResult } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Download, Gauge, GitBranch, Moon, Play, Printer, RefreshCw, ShieldCheck, Sun,
  Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart,
} from 'recharts';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});
const REFRESH_OPTIONS = [
  { label: '5 minutes', ms: 5 * 60 * 1000 },
  { label: '15 minutes', ms: 15 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
];

function asPercent(value: number) {
  return value <= 1 ? value * 100 : value;
}
function fmt(value?: number, decimals = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: decimals }) : '—';
}
function saveCsv(name: string, rows: object[]) {
  if (!rows.length) return;
  const records = rows as Array<Record<string, unknown>>;
  const keys = Object.keys(records[0]);
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [keys.map(quote).join(','), ...records.map(row => keys.map(key => quote(row[key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function lineLabel(line: GridLine) {
  return `${line.id} · Bus ${line.fromBus}—${line.toBus}`;
}
function StatusPill({ value }: { value: string }) {
  const text = value || 'Unknown';
  const tone = /high|critical|severe|unstable/i.test(text) ? 'danger' : /risk|moderate|watch|medium|elevated/i.test(text) ? 'watch' : 'safe';
  return <span className={`status-pill ${tone}`} data-testid="status-risk">{text}</span>;
}
function DownloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="icon-button print-hidden" onClick={onClick} aria-label={`Download ${label} CSV`} title={`Download ${label} CSV`} data-testid={`download-${label}`}><Download size={14} /></button>;
}
function ErrorBox({ title, retry }: { title: string; retry: () => void }) {
  return <div className="error-box" role="alert"><AlertTriangle size={17} /><span>{title}</span><button className="retry-btn" onClick={retry}>Try again</button></div>;
}

function NetworkMap({ buses, lines, result, selected, onSelect }: {
  buses: GridBus[];
  lines: GridLine[];
  result?: SimulationResult;
  selected: string;
  onSelect: (line: string) => void;
}) {
  const pointMap = useMemo(() => {
    const xs = buses.map(b => b.x); const ys = buses.map(b => b.y);
    const minX = Math.min(...xs, 0); const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0); const maxY = Math.max(...ys, 1);
    return new Map(buses.map(b => [b.id, {
      x: 38 + ((b.x - minX) / (maxX - minX || 1)) * 424,
      y: 30 + ((b.y - minY) / (maxY - minY || 1)) * 236,
    }]));
  }, [buses]);
  const lineRisks = new Map((result?.lineRisks || []).map(row => [row.lineId, row]));
  if (!buses.length || !lines.length) return <div className="empty-chart">No network topology is available for this case.</div>;
  return <div className="network-wrap">
    <svg className="network-svg" viewBox="0 0 500 300" role="img" aria-label="Synthetic 14-bus transmission network">
      <defs><pattern id="mapgrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 22 0 L 0 0 0 22" fill="none" stroke="currentColor" strokeOpacity=".055" strokeWidth=".6" /></pattern></defs>
      <rect width="500" height="300" fill="url(#mapgrid)" />
      {lines.map(line => {
        const a = pointMap.get(line.fromBus); const b = pointMap.get(line.toBus);
        if (!a || !b) return null;
        const risk = lineRisks.get(line.id);
        const failed = /fail|outage/i.test(risk?.state || '');
        const hot = risk ? risk.loadingPercent >= 90 : Math.abs(line.flowMW) / Math.max(line.capacityMW, 1) >= .8;
        const isSelected = selected === line.id;
        return <g key={line.id} onClick={() => onSelect(line.id)} className="network-line" tabIndex={0} role="button" aria-label={`Select line ${line.id}, bus ${line.fromBus} to ${line.toBus}`} data-testid={`network-line-${line.id}`}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`network-link ${failed ? 'failed' : hot ? 'hot' : ''} ${isSelected ? 'selected' : ''}`} />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="network-hit" />
        </g>;
      })}
      {buses.map(bus => {
        const p = pointMap.get(bus.id); if (!p) return null;
        const isGen = /gen|plant|source/i.test(bus.kind);
        return <g key={bus.id} className="bus-node" data-testid={`network-bus-${bus.id}`}>
          <circle cx={p.x} cy={p.y} r={isGen ? 9 : 7} className={isGen ? 'bus-circle generator' : 'bus-circle'} />
          <text x={p.x} y={p.y - 13} textAnchor="middle" className="bus-label">{bus.id}</text>
        </g>;
      })}
    </svg>
    <div className="map-legend"><span><i className="legend-dot normal" />Normal</span><span><i className="legend-dot strained" />High loading</span><span><i className="legend-dot selected-dot" />Selected contingency</span><span className="map-hint">Select a line to set contingency</span></div>
  </div>;
}

function Dashboard() {
  const caseQuery = useGetGridCase();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshMs, setRefreshMs] = useState(5 * 60 * 1000);
  const [refreshMenu, setRefreshMenu] = useState(false);
  const [dark, setDark] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem('grid-theme') === 'dark');
  const [selectedLine, setSelectedLine] = useState('');
  const [loadMultiplier, setLoadMultiplier] = useState(1);
  const [failureThreshold, setFailureThreshold] = useState(1);
  const [samples, setSamples] = useState(500);
  const [resultSamples, setResultSamples] = useState(500);
  const [result, setResult] = useState<SimulationResult | undefined>();
  const [hasRun, setHasRun] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initialRun = useRef(false);
  const simulation = useRunGridSimulation({ mutation: { onSuccess: (output, variables) => { setResult(output); setResultSamples(variables.data.samples); setHasRun(true); } } });
  const overviewQuery = useGetGridOverview({ query: { queryKey: getGetGridOverviewQueryKey(), refetchInterval: autoRefresh ? Math.max(refreshMs, 5 * 60 * 1000) : false } });
  const refresh = async () => {
    setRefreshBusy(true);
    try { await Promise.all([caseQuery.refetch(), overviewQuery.refetch()]); }
    finally { window.setTimeout(() => setRefreshBusy(false), 550); }
  };
  useEffect(() => {
    if (!caseQuery.data) return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('grid-theme', dark ? 'dark' : 'light');
  }, [dark, caseQuery.data]);
  useEffect(() => {
    if (caseQuery.data && !selectedLine) setSelectedLine(caseQuery.data.defaultContingency);
  }, [caseQuery.data, selectedLine]);
  useEffect(() => {
    if (!caseQuery.data || initialRun.current || simulation.isPending) return;
    const contingency = caseQuery.data.defaultContingency || overviewQuery.data?.defaultContingency;
    if (!contingency) return;
    initialRun.current = true;
    simulation.mutate({ data: { contingencyLineId: contingency, loadMultiplier: 1, failureThreshold: 1, samples: 500 } });
  }, [caseQuery.data, overviewQuery.data, simulation]);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setRefreshMenu(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, []);
  const lines = caseQuery.data?.lines || [];
  const selectedLineData = lines.find(line => line.id === selectedLine);
  const submitScenario = () => {
    if (!selectedLine) return;
    const input: SimulationInput = { contingencyLineId: selectedLine, loadMultiplier, failureThreshold, samples };
    simulation.mutate({ data: input });
  };
  const onRefresh = () => { void refresh(); };
  const updatedAt = overviewQuery.dataUpdatedAt ? new Date(overviewQuery.dataUpdatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const gridStroke = dark ? '#31404a' : '#e6e4dc';
  const axisColor = dark ? '#a1adb0' : '#7b8583';
  const error = caseQuery.error || overviewQuery.error;
  const overview = overviewQuery.data;
  const topologyRows = lines.map(line => ({ lineId: line.id, fromBus: line.fromBus, toBus: line.toBus, flowMW: line.flowMW, capacityMW: line.capacityMW, status: line.status }));
  const riskChartRows = (result?.lineRisks || []).map(line => ({ ...line, failureProbabilityPercent: asPercent(line.failureProbability) }));

  return <main className="app-shell">
    <div className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><Zap size={19} fill="currentColor" /></div><div><div className="brand-name">GRID / CASCADE</div><div className="brand-sub">SYNTHETIC CONTINGENCY LAB</div></div></div>
      <div className="topbar-right">
        <span className="environment"><span className="live-dot" />DEMO ENVIRONMENT</span>
        <div className="refresh-group" ref={dropdownRef}>
          <button onClick={onRefresh} disabled={refreshBusy || caseQuery.isFetching || overviewQuery.isFetching} className="refresh-main print-hidden" data-testid="button-refresh"><RefreshCw size={14} className={refreshBusy ? 'spin' : ''} />Refresh</button>
          <button className="refresh-caret print-hidden" onClick={() => setRefreshMenu(open => !open)} aria-label="Refresh settings" data-testid="button-refresh-settings"><ChevronDown size={14} /></button>
          {refreshMenu && <div className="refresh-popover">
            <label className="auto-row"><span><strong>Auto-refresh</strong><small>Updates case overview only</small></span><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} data-testid="toggle-auto-refresh" /></label>
            <div className="popover-divider" />
            {REFRESH_OPTIONS.map(option => <button key={option.ms} className="interval-option" onClick={() => { setRefreshMs(option.ms); setAutoRefresh(true); setRefreshMenu(false); }} data-testid={`refresh-interval-${option.ms}`}>{option.label}{refreshMs === option.ms && autoRefresh && <Check size={14} />}</button>)}
            <p className="refresh-note">Minimum interval: 5 minutes. Simulation runs are always manual.</p>
          </div>}
        </div>
        <button className="top-icon print-hidden" onClick={() => window.print()} aria-label="Print or save as PDF" data-testid="button-print"><Printer size={15} /></button>
        <button className="top-icon print-hidden" onClick={() => setDark(value => !value)} aria-label="Toggle dark mode" data-testid="button-theme">{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
      </div>
    </div>
    <div className="page-frame">
      <aside className="rail print-hidden">
        <div className="rail-label">WORKSPACE</div>
        <a className="rail-link active" href="#overview"><Activity size={16} />Overview</a>
        <a className="rail-link" href="#network"><GitBranch size={16} />Network map</a>
        <a className="rail-link" href="#risk"><Gauge size={16} />Line risk</a>
        <a className="rail-link" href="#propagation"><ArrowDownRight size={16} />Propagation</a>
        <div className="rail-foot"><div className="rail-case-mark">14</div><span>IEEE-style<br />synthetic case</span></div>
      </aside>
      <div className="content">
        <header className="page-heading" id="overview">
          <div>
            <div className="breadcrumb">POWER SYSTEMS <span>/</span> CONTINGENCY ANALYSIS</div>
            <h1 className="font-display">Grid cascade <em>risk</em></h1>
            <p className="intro">Explore how a single line outage can move through a synthetic transmission network.</p>
          </div>
          <div className="case-stamp">
            <span className="eyebrow">ACTIVE CASE</span>
            <strong data-testid="text-case-name">{caseQuery.data?.name || overview?.caseName || 'Loading synthetic case'}</strong>
            <span className="mono">{caseQuery.data?.version ? `MODEL ${caseQuery.data.version}` : '14-BUS SYSTEM'}</span>
          </div>
        </header>
        {error && <ErrorBox title="Could not load the synthetic grid data." retry={() => { void refresh(); }} />}
        {(caseQuery.isLoading || overviewQuery.isLoading) && <div className="loading-banner"><div className="skeleton-line wide" /><div className="skeleton-line" /><span>Loading case topology and overview…</span></div>}
        {!caseQuery.isLoading && !caseQuery.error && caseQuery.data && !lines.length && <div className="empty-banner"><CircleHelp size={18} /><span>This case has no transmission line data to explore.</span></div>}
        <section className="summary-strip" aria-label="Grid overview metrics">
          <div className="summary-cell"><span className="eyebrow">NETWORK FOOTPRINT</span><strong className="metric-value" data-testid="value-network">{overview ? `${overview.buses} / ${overview.lines}` : '—'}</strong><small>buses <i>·</i> transmission lines</small></div>
          <div className="summary-cell"><span className="eyebrow">TOTAL LOAD</span><strong className="metric-value">{overview ? <>{fmt(overview.totalLoadMW, 0)} <small>MW</small></> : '—'}</strong><small>synthetic demand baseline</small></div>
          <div className="summary-cell"><span className="eyebrow">GENERATION</span><strong className="metric-value">{overview ? <>{fmt(overview.totalGenerationMW, 0)} <small>MW</small></> : '—'}</strong><small>modeled system supply</small></div>
          <div className="summary-cell summary-risk"><span className="eyebrow">DEFAULT CONTINGENCY RISK</span>{overview ? <StatusPill value={overview.riskStatus} /> : <strong className="metric-value">—</strong>}<small>{overview ? `${fmt(asPercent(overview.estimatedProbability), 1)}% for ${overview.defaultContingency} · ${overview.overloadedLines} intact-grid overloads` : 'Awaiting overview'}</small></div>
        </section>
        <section className="workbench" aria-label="Contingency scenario controls">
          <div className="workbench-copy"><span className="eyebrow"><span className="step-index">01</span> SCENARIO SETUP</span><h2>Set the conditions.</h2><p>Choose one line outage, adjust demand and sampling assumptions, then run the model.</p></div>
          <div className="scenario-fields">
            <label className="field wide-field"><span>Contingency line</span><select className="control" value={selectedLine} onChange={e => setSelectedLine(e.target.value)} disabled={!lines.length} data-testid="select-contingency">{lines.map(line => <option value={line.id} key={line.id}>{lineLabel(line)} · {fmt(line.flowMW, 0)} MW</option>)}</select></label>
            <label className="field"><span>Load multiplier <b>{loadMultiplier.toFixed(2)}×</b></span><input type="range" min="0.7" max="1.5" step="0.05" value={loadMultiplier} onChange={e => setLoadMultiplier(Number(e.target.value))} data-testid="input-load-multiplier" /><small>70% — 150%</small></label>
            <label className="field"><span>Failure threshold <b>{failureThreshold.toFixed(2)}×</b></span><input type="range" min="0.5" max="1.5" step="0.05" value={failureThreshold} onChange={e => setFailureThreshold(Number(e.target.value))} data-testid="input-failure-threshold" /><small>Model sensitivity</small></label>
            <label className="field samples-field"><span>Monte Carlo samples</span><select className="control" value={samples} onChange={e => setSamples(Number(e.target.value))} data-testid="select-samples"><option value={100}>100 samples</option><option value={250}>250 samples</option><option value={500}>500 samples</option><option value={750}>750 samples</option><option value={1000}>1,000 samples</option></select></label>
            <button className="action-btn primary-btn run-button" onClick={submitScenario} disabled={!selectedLine || simulation.isPending || !caseQuery.data} data-testid="button-run-simulation">{simulation.isPending ? <><RefreshCw size={15} className="spin" />Running model…</> : <><Play size={15} fill="currentColor" />Run simulation <span className="run-arrow">↗</span></>}</button>
          </div>
        </section>
        {simulation.error && <ErrorBox title="Simulation did not complete. Your previous result is still shown." retry={submitScenario} />}
        <div className="section-line"><span className="eyebrow">ANALYSIS OUTPUT</span><span className="rule" /><span className="result-caption">{hasRun ? `RESULT · ${result?.scenarioName || 'Scenario complete'}` : 'DEFAULT CONTINGENCY · INITIAL RUN'}</span></div>
        {simulation.isPending && !result && <div className="simulation-skeleton"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div>}
        {result && <>
          <section className="result-hero">
            <div className="risk-verdict">
              <div className="verdict-top"><span className="eyebrow">CASCADE ASSESSMENT</span><StatusPill value={result.riskStatus} /></div>
              <h2 className="font-display">{result.cascadePredicted ? 'Cascade indicated' : 'System holds'}</h2>
              <p>{result.stable ? 'Model remains stable under this scenario.' : 'Model indicates a loss of stability under this scenario.'}</p>
              <div className="verdict-bottom"><span className={`verdict-icon ${result.cascadePredicted ? 'warning' : 'ok'}`}>{result.cascadePredicted ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}</span><span>{result.cascadePredicted ? 'Potential propagation detected' : 'No cascading propagation predicted'}</span></div>
            </div>
            <div className="probability-panel">
              <span className="eyebrow">ESTIMATED CASCADE PROBABILITY</span>
              <div className="probability-number metric-value">{fmt(asPercent(result.estimatedProbability), 1)}<span>%</span></div>
              <div className="probability-track"><span style={{ width: `${Math.min(100, Math.max(0, asPercent(result.estimatedProbability)))}%` }} /></div>
              <div className="confidence-line"><span>Confidence interval</span><strong>{fmt(asPercent(result.confidenceLower), 1)}–{fmt(asPercent(result.confidenceUpper), 1)}%</strong></div>
              <small>Returned run · {resultSamples.toLocaleString()} Monte Carlo samples</small>
            </div>
            <div className="result-kpis">
              <div><span className="eyebrow">AFFECTED LOAD</span><strong className="metric-value">{fmt(result.affectedLoadMW, 1)} <small>MW</small></strong><small>modeled interrupted demand</small></div>
              <div><span className="eyebrow">CASCADE SEVERITY</span><strong className="metric-value">{fmt(result.cascadeSeverity, 1)}<small> / 100</small></strong><small>model-defined index</small></div>
              <div><span className="eyebrow">FAILED COMPONENTS</span><strong className="metric-value">{fmt(result.failedComponents, 0)}</strong><small>components in predicted event</small></div>
            </div>
          </section>
          <section className="analysis-grid">
            <article className="panel map-panel" id="network">
              <div className="panel-head"><div><span className="eyebrow">TOPOLOGY · 14-BUS TEST CASE</span><h3>Network state</h3></div><DownloadButton label="network-topology" onClick={() => saveCsv('network-topology.csv', topologyRows)} /></div>
              <NetworkMap buses={caseQuery.data?.buses || []} lines={lines} result={result} selected={selectedLine} onSelect={setSelectedLine} />
              <div className="map-selected"><span className="selected-line-mark" /><span>Contingency</span><strong>{selectedLineData ? lineLabel(selectedLineData) : `Line ${selectedLine}`}</strong><span className="mono">{selectedLineData ? `${fmt(selectedLineData.flowMW, 1)} / ${fmt(selectedLineData.capacityMW, 1)} MW` : ''}</span></div>
            </article>
            <article className="panel timeline-panel">
              <div className="panel-head"><div><span className="eyebrow">MODEL PROPAGATION</span><h3>Risk across cascade steps</h3></div><DownloadButton label="risk-timeline" onClick={() => saveCsv('risk-timeline.csv', result.timeline)} /></div>
              {result.timeline.length ? <><div className="chart-main"><ResponsiveContainer width="100%" height={205}><AreaChart data={result.timeline} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs><linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c37b38" stopOpacity={.3} /><stop offset="95%" stopColor="#c37b38" stopOpacity={.015} /></linearGradient></defs>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="step" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: dark ? '#1c2930' : '#fffdf8', borderColor: gridStroke, borderRadius: 8, fontSize: 12 }} formatter={(value: number, name: string) => [name === 'riskPercent' ? `${fmt(value, 1)}%` : value, name === 'riskPercent' ? 'Risk' : 'Failed lines']} />
                <Area type="monotone" dataKey="riskPercent" name="riskPercent" stroke="#bf783b" strokeWidth={2.4} fill="url(#riskGradient)" activeDot={{ r: 4 }} isAnimationActive={false} />
              </AreaChart></ResponsiveContainer></div><div className="chart-foot"><span>Risk probability by propagation step</span><span className="chart-legend"><i />Model estimate</span></div></> : <div className="empty-chart">No propagation timeline was returned.</div>}
            </article>
          </section>
          <section className="panel risk-table-panel" id="risk">
            <div className="panel-head risk-table-head"><div><span className="eyebrow">CONTINGENCY SCREENING</span><h3>Risk by transmission line</h3><p>Model-estimated loading and failure likelihood for each component.</p></div><DownloadButton label="risk-by-line" onClick={() => saveCsv('risk-by-line.csv', result.lineRisks)} /></div>
              {result.lineRisks.length ? <>
                <div className="risk-chart"><ResponsiveContainer width="100%" height={180}><BarChart data={riskChartRows} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="lineId" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={id => id} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: dark ? '#1c2930' : '#fffdf8', borderColor: gridStroke, borderRadius: 8, fontSize: 12 }} formatter={(value: number, name: string) => [`${fmt(value, 1)}%`, name === 'Loading' ? 'Loading' : 'Failure probability']} labelFormatter={label => `Line ${label}`} />
                <Bar dataKey="loadingPercent" name="Loading" fill="#3b9278" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="failureProbabilityPercent" name="Failure probability" fill="#c27b3c" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart></ResponsiveContainer></div>
              <div className="table-wrap"><table><thead><tr><th>LINE / ENDPOINTS</th><th>FLOW</th><th>CAPACITY</th><th>LOADING</th><th>FAILURE PROB.</th><th>STATE</th></tr></thead><tbody>
                {result.lineRisks.map(line => <tr key={line.lineId} className="line-row"><td><strong className="mono">L{line.lineId}</strong><span className="endpoint">Bus {line.fromBus} — {line.toBus}</span></td><td>{fmt(line.flowMW, 1)} MW</td><td>{fmt(line.capacityMW, 1)} MW</td><td><div className="loading-cell"><div className="mini-meter"><i style={{ width: `${Math.min(100, Math.max(0, line.loadingPercent))}%` }} /></div><b>{fmt(line.loadingPercent, 1)}%</b></div></td><td>{fmt(asPercent(line.failureProbability), 2)}%</td><td><span className={`line-state ${/fail|outage/i.test(line.state) ? 'failed' : /high|over|strain/i.test(line.state) ? 'strained' : 'normal'}`}>{line.state}</span></td></tr>)}
              </tbody></table></div>
            </> : <div className="empty-chart">The simulation returned no line-level risk results.</div>}
          </section>
          <section className="lower-grid">
            <article className="panel propagation-panel" id="propagation">
              <div className="panel-head"><div><span className="eyebrow">EVENT SEQUENCE</span><h3>Propagation steps</h3></div><DownloadButton label="propagation-steps" onClick={() => saveCsv('propagation-steps.csv', result.steps)} /></div>
              {result.steps.length ? <div className="steps-list">{result.steps.map((step, index) => <div className="step-row" key={`${step.step}-${step.componentId}-${index}`}><div className="step-rail"><span>{String(step.step).padStart(2, '0')}</span><i /></div><div className="step-copy"><div className="step-title"><strong>{step.componentType} {step.componentId}</strong><span className="mono">{fmt(asPercent(step.probability), 1)}% chance</span></div><p>{step.reason}</p><div className="step-meta"><span>Loading <b>{fmt(step.loadingPercent, 1)}%</b></span><span>Stage {step.step}</span></div></div></div>)}</div> : <div className="empty-state"><div className="empty-icon"><ShieldCheck size={21} /></div><strong>No propagation steps returned</strong><p>This scenario did not return a component event sequence.</p></div>}
            </article>
            <article className="panel mitigations-panel">
              <div className="panel-head"><div><span className="eyebrow">OPERATOR DISCUSSION</span><h3>Mitigation ideas</h3></div><span className="recommendation-count">{result.mitigations.length} suggestions</span></div>
              {result.mitigations.length ? <div className="mitigation-list">{result.mitigations.map((item, index) => <div className="mitigation-item" key={`${item.priority}-${index}`}><div className="priority-tag">P{item.priority}</div><div><strong>{item.action}</strong><p>{item.rationale}</p><div className="impact"><ArrowUpRight size={13} />Expected impact: {item.expectedImpact}</div></div></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Check size={21} /></div><strong>No mitigations returned</strong><p>No mitigation recommendations were included for this run.</p></div>}
            </article>
          </section>
          <section className="assumptions-panel"><div className="assumptions-icon"><CircleHelp size={17} /></div><div><span className="eyebrow">MODEL ASSUMPTIONS & LIMITATIONS</span><p>{caseQuery.data?.modelNote || 'This educational synthetic model simplifies grid dynamics and is not calibrated to an operational utility network.'}</p><div className="assumption-tags">{result.assumptions.map((assumption, index) => <span key={`${assumption}-${index}`}>{assumption}</span>)}</div><strong>Estimates are educational only. They do not replace power-flow studies, protection analysis, or qualified operator validation.</strong></div></section>
        </>}
        <footer className="page-footer"><span>GRID / CASCADE <i>·</i> EDUCATIONAL DEMONSTRATION</span><span>{updatedAt ? `Overview refreshed ${updatedAt}` : 'Synthetic model · not for operational use'}</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="back-top">Back to top ↑</button></footer>
      </div>
    </div>
  </main>;
}

function App() {
  return <QueryClientProvider client={queryClient}>
    <WouterRouter>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route><div className="not-found"><strong>404</strong><p>This analysis route does not exist.</p><a href="/">Return to dashboard</a></div></Route>
      </Switch>
    </WouterRouter>
  </QueryClientProvider>;
}

export default App;
