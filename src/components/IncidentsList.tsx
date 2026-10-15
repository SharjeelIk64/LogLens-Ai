import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  Microscope,
  ShieldAlert,
  Terminal,
  Info
} from 'lucide-react';
import { Incident } from '../types';

interface IncidentsListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenExplorer: () => void;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({
  incidents,
  onSelectIncident,
  onOpenExplorer
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredIncidents = incidents.filter(inc => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0b0f19]">
      {/* 1. Header & Severity Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight">
            Detected Incident Triage ({incidents.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Grouped failure signatures and evidence-backed root cause hypotheses
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-md transition-colors ${
                severityFilter === sev
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Incidents Cards Grid */}
      {filteredIncidents.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">No Incidents Found</p>
          <p className="text-xs text-slate-400 mt-1">
            {incidents.length === 0
              ? 'No failure patterns were detected in the currently loaded log stream.'
              : 'No incidents match the active severity filter.'}
          </p>
          {incidents.length === 0 && (
            <button
              onClick={onOpenExplorer}
              className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Open Log Explorer to Load Logs
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredIncidents.map(inc => {
            const isCritical = inc.severity === 'CRITICAL';
            const isHigh = inc.severity === 'HIGH';

            return (
              <div
                key={inc.id}
                className={`p-5 rounded-xl border transition-all ${
                  isCritical
                    ? 'bg-slate-900/90 border-red-900/50 hover:border-red-700/80 shadow-md shadow-red-950/20'
                    : isHigh
                    ? 'bg-slate-900/90 border-amber-900/40 hover:border-amber-700/70 shadow-md shadow-amber-950/15'
                    : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          isCritical
                            ? 'bg-red-900/70 text-red-300 border border-red-700/60'
                            : isHigh
                            ? 'bg-amber-900/70 text-amber-300 border border-amber-700/60'
                            : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="text-xs font-mono text-cyan-400 font-semibold">
                        {inc.service}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {inc.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                      {inc.title}
                    </h3>
                  </div>

                  {/* Right: Heuristic Confidence & CTA */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-indigo-300">
                        {inc.confidenceScore}% Confidence
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Heuristic Estimate
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                    >
                      <Microscope className="w-3.5 h-3.5" />
                      <span>Investigate</span>
                    </button>
                  </div>
                </div>

                {/* Evidence Warning if insufficient */}
                {inc.evidenceWarning && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{inc.evidenceWarning}</span>
                  </div>
                )}

                {/* Probable Cause Hypothesis */}
                <div className="mt-3.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>Probable Root Cause Hypothesis (Heuristic)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {inc.probableCause}
                  </p>
                </div>

                {/* Metadata & Key Metrics Bar */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-2">
                  <div className="flex items-center gap-4">
                    <span>
                      Occurrences: <strong className="text-slate-200">{inc.occurrences}</strong> events
                    </span>
                    <span className="hidden sm:inline" aria-hidden="true">·</span>
                    <span className="hidden sm:inline">
                      Duration: <strong className="text-slate-200">{inc.durationSeconds}s</strong>
                    </span>
                    <span className="hidden md:inline" aria-hidden="true">·</span>
                    <span className="hidden md:inline text-[11px]">
                      Span: {inc.firstSeen.split('T')[1]?.replace('Z', '')} → {inc.lastSeen.split('T')[1]?.replace('Z', '')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {inc.diagnosticCommands.length} diagnostic commands available
                    </span>
                  </div>
                </div>

                {/* Evidence Excerpt Preview */}
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Supporting Log Excerpt
                  </div>
                  <div className="space-y-1">
                    {inc.supportingLogLines.slice(0, 2).map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className="text-[11px] font-mono text-slate-300 bg-black/40 p-1.5 rounded border border-slate-800/60 truncate"
                      >
                        <span className="text-slate-500 mr-2">#{ev.lineNumber}</span>
                        <span className="text-slate-400 mr-2">{ev.timestamp.split('T')[1]}</span>
                        <span>{ev.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
