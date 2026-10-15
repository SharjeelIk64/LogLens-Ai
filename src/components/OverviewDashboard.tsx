import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  FileCode2,
  Activity,
  ArrowRight,
  Server,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { AnalysisResult, Incident } from '../types';
import { NavigationTab } from './Sidebar';

interface OverviewDashboardProps {
  analysisResult: AnalysisResult | null;
  onNavigateTab: (tab: NavigationTab) => void;
  onSelectIncident: (incident: Incident) => void;
  onLoadSample: (datasetId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analysisResult,
  onNavigateTab,
  onSelectIncident,
  onLoadSample
}) => {
  const [hoveredBucketIndex, setHoveredBucketIndex] = useState<number | null>(null);

  if (!analysisResult || analysisResult.summary.totalLogs === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-950/40">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">No Active Log Stream Loaded</h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          LogLens AI provides evidence-backed incident triage and failure pattern detection.
          Select a realistic demo incident dataset below or import custom application logs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full">
          <button
            onClick={() => onLoadSample('db-pool-exhaustion')}
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
              <span>Database Pool Exhaustion</span>
              <Database className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Postgres connection saturation, 30s Hikari timeouts, and concurrent row deadlocks.
            </p>
          </button>

          <button
            onClick={() => onLoadSample('api-503-retry-storm')}
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
              <span>503 Retry Storm</span>
              <Server className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Gateway 504 timeout cascading into unjittered worker retries and circuit breaker trips.
            </p>
          </button>

          <button
            onClick={() => onLoadSample('memory-oom-crash')}
            className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
              <span>Memory Pressure & OOM</span>
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              JVM heap exhaustion, 4s GC Stop-The-World stalls, and Linux kernel OOMKilled Signal 137.
            </p>
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={() => onNavigateTab('explorer')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-medium"
          >
            <span>Or paste custom raw log lines in Log Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const { summary, incidents, timeBuckets, serviceHealthList, detectedPatterns } = analysisResult;

  // Chart max value for scaling
  const maxBucketVolume = Math.max(...timeBuckets.map(b => b.total), 1);

  // Severity totals
  const totalSeverities = summary.criticalCount + summary.errorCount + summary.warningCount + summary.infoCount;
  const criticalPct = totalSeverities > 0 ? (summary.criticalCount / totalSeverities) * 100 : 0;
  const errorPct = totalSeverities > 0 ? (summary.errorCount / totalSeverities) * 100 : 0;
  const warningPct = totalSeverities > 0 ? (summary.warningCount / totalSeverities) * 100 : 0;
  const infoPct = totalSeverities > 0 ? (summary.infoCount / totalSeverities) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Log Events</span>
            <FileCode2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {summary.totalLogs.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              in {summary.timeSpanFormatted}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>{summary.serviceCount} distinct services</span>
          </div>
        </div>

        {/* Card 2: Error & Critical Volume */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Errors & Criticals</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-red-400">
              {(summary.criticalCount + summary.errorCount).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">
              ({totalSeverities > 0 ? (((summary.criticalCount + summary.errorCount) / totalSeverities) * 100).toFixed(0) : 0}% of stream)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-red-400 font-semibold">{summary.criticalCount} Critical</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold">{summary.errorCount} Error</span>
          </div>
        </div>

        {/* Card 3: Detected Incidents */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Triage Incidents</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-indigo-300">
              {summary.incidentCount}
            </span>
            <span className="text-[11px] text-slate-400">
              correlated cascades
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Evidence-backed hypotheses</span>
          </div>
        </div>

        {/* Card 4: Recurring Patterns */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Failure Signatures</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-cyan-300">
              {detectedPatterns.length}
            </span>
            <span className="text-[11px] text-slate-400">
              active patterns
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Deterministic heuristic rules</span>
          </div>
        </div>
      </div>

      {/* 2. Charts Section: Error Volume Over Time & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Error Volume Over Time Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Event Volume Over Time Window
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Severity distribution across synchronized temporal slices
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Critical
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Error
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Info
                </span>
              </div>
            </div>

            {/* SVG / Stacked Bar Visualization */}
            <div className="mt-6 h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
              {timeBuckets.map((bucket, idx) => {
                const totalH = (bucket.total / maxBucketVolume) * 100;
                const critH = bucket.total > 0 ? (bucket.critical / bucket.total) * totalH : 0;
                const errH = bucket.total > 0 ? (bucket.error / bucket.total) * totalH : 0;
                const warnH = bucket.total > 0 ? (bucket.warning / bucket.total) * totalH : 0;
                const infoH = bucket.total > 0 ? (bucket.info / bucket.total) * totalH : 0;

                const isHovered = hoveredBucketIndex === idx;

                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBucketIndex(idx)}
                    onMouseLeave={() => setHoveredBucketIndex(null)}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-20 p-2 rounded bg-slate-950 border border-slate-700 text-[10px] text-slate-200 shadow-xl whitespace-nowrap pointer-events-none">
                        <div className="font-mono font-semibold text-indigo-300">{bucket.timeLabel}</div>
                        <div className="mt-1 space-y-0.5 text-slate-300 font-mono">
                          <div>Total: {bucket.total} events</div>
                          {bucket.critical > 0 && <div className="text-red-400">Critical: {bucket.critical}</div>}
                          {bucket.error > 0 && <div className="text-amber-400">Error: {bucket.error}</div>}
                          {bucket.warning > 0 && <div className="text-yellow-400">Warning: {bucket.warning}</div>}
                          {bucket.info > 0 && <div className="text-blue-400">Info: {bucket.info}</div>}
                        </div>
                      </div>
                    )}

                    {/* Stacked bar */}
                    <div
                      className={`w-full max-w-[36px] rounded-t flex flex-col justify-end overflow-hidden transition-all duration-150 ${
                        isHovered ? 'ring-2 ring-indigo-400' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ height: `${Math.max(totalH, 4)}%` }}
                    >
                      {critH > 0 && <div style={{ height: `${critH}%` }} className="bg-red-500 w-full" />}
                      {errH > 0 && <div style={{ height: `${errH}%` }} className="bg-amber-500 w-full" />}
                      {warnH > 0 && <div style={{ height: `${warnH}%` }} className="bg-yellow-500 w-full" />}
                      {infoH > 0 && <div style={{ height: `${infoH}%` }} className="bg-blue-600/80 w-full" />}
                    </div>

                    <span className="text-[9px] font-mono text-slate-500 mt-2 truncate w-full text-center">
                      {bucket.timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2">
            <span>Peak window load: {maxBucketVolume} events</span>
            <span className="font-mono">Time span: {summary.timeSpanFormatted}</span>
          </div>
        </div>

        {/* Severity Distribution & Stream Health (1 col) */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Severity Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Proportion of anomalous log levels
            </p>

            {/* Stacked Segment Bar */}
            <div className="mt-5 h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {criticalPct > 0 && (
                <div style={{ width: `${criticalPct}%` }} className="bg-red-500 h-full" title={`Critical: ${summary.criticalCount}`} />
              )}
              {errorPct > 0 && (
                <div style={{ width: `${errorPct}%` }} className="bg-amber-500 h-full" title={`Error: ${summary.errorCount}`} />
              )}
              {warningPct > 0 && (
                <div style={{ width: `${warningPct}%` }} className="bg-yellow-500 h-full" title={`Warning: ${summary.warningCount}`} />
              )}
              {infoPct > 0 && (
                <div style={{ width: `${infoPct}%` }} className="bg-blue-600 h-full" title={`Info: ${summary.infoCount}`} />
              )}
            </div>

            {/* Metric breakdown list */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Critical
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {summary.criticalCount} <span className="text-slate-500 text-[11px]">({criticalPct.toFixed(1)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Error
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {summary.errorCount} <span className="text-slate-500 text-[11px]">({errorPct.toFixed(1)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Warning
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {summary.warningCount} <span className="text-slate-500 text-[11px]">({warningPct.toFixed(1)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Info / Notice
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {summary.infoCount} <span className="text-slate-500 text-[11px]">({infoPct.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Incident-to-log ratio: <span className="font-mono text-indigo-300 font-semibold">1:{(summary.totalLogs / Math.max(summary.incidentCount, 1)).toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* 3. Service Health Overview Matrix */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Service Health Matrix
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Service status, error density, and incident associations
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {serviceHealthList.length} services monitored
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {serviceHealthList.map(service => {
            const isCritical = service.status === 'CRITICAL';
            const isDegraded = service.status === 'DEGRADED';
            const isHealthy = service.status === 'HEALTHY';

            return (
              <div
                key={service.serviceName}
                className={`p-3.5 rounded-lg border transition-colors ${
                  isCritical
                    ? 'bg-red-950/20 border-red-900/50'
                    : isDegraded
                    ? 'bg-amber-950/20 border-amber-900/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                    {service.serviceName}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isCritical
                        ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                        : isDegraded
                        ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                        : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Errors: <strong className={service.errorCount > 0 ? 'text-red-400' : 'text-slate-300'}>{service.errorCount}</strong></span>
                  <span>Total: {service.totalLogs}</span>
                  <span>Incidents: <strong className={service.incidentCount > 0 ? 'text-amber-400' : 'text-slate-300'}>{service.incidentCount}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Detected Incidents Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Prioritized Incidents Triage
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Identified failures ranked by heuristic severity and occurrence frequency
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('incidents')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>View All ({incidents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-2.5 font-medium">Severity</th>
                <th className="pb-2.5 font-medium">Incident Name</th>
                <th className="pb-2.5 font-medium">Affected Service</th>
                <th className="pb-2.5 font-medium">Occurrences</th>
                <th className="pb-2.5 font-medium">Heuristic Confidence</th>
                <th className="pb-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.slice(0, 5).map(inc => (
                <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-mono">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-red-950/70 text-red-300 border border-red-800/60'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                          : 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-slate-100 max-w-xs truncate">
                    {inc.title}
                  </td>
                  <td className="py-3 font-mono text-slate-300">
                    {inc.service}
                  </td>
                  <td className="py-3 font-mono tabular-nums text-slate-200">
                    {inc.occurrences} events
                  </td>
                  <td className="py-3 text-slate-300">
                    <span className="font-mono text-indigo-300 font-semibold">{inc.confidenceScore}%</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">(heuristic)</span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
