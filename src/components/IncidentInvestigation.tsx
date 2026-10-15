import React, { useState } from 'react';
import {
  Microscope,
  Terminal,
  Copy,
  Check,
  AlertOctagon,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Layers,
  FileText,
  Download,
  Info
} from 'lucide-react';
import { Incident, AnalysisResult } from '../types';
import { generateMarkdownReport, downloadReportFile } from '../services/reportGenerator';

interface IncidentInvestigationProps {
  incident: Incident | null;
  allIncidents: Incident[];
  analysisResult: AnalysisResult | null;
  onSelectIncident: (incident: Incident) => void;
  onCopyText: (text: string, label: string) => void;
}

export const IncidentInvestigation: React.FC<IncidentInvestigationProps> = ({
  incident,
  allIncidents,
  analysisResult,
  onSelectIncident,
  onCopyText
}) => {
  const [copiedCmdIdx, setCopiedCmdIdx] = useState<number | null>(null);

  if (!incident) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0b0f19]">
        <Microscope className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-bold text-slate-100">No Incident Selected</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
          Select an incident from the list to inspect the failure timeline, supporting evidence lines, diagnostic commands, and remediation steps.
        </p>
        {allIncidents.length > 0 && (
          <div className="flex flex-col gap-2 max-w-md w-full">
            {allIncidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left text-xs transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200">{inc.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{inc.service} · {inc.occurrences} events</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {inc.severity}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleCopyEvidence = () => {
    const formattedEvidence = incident.supportingLogLines
      .map(line => `[Line #${line.lineNumber}] ${line.timestamp} [${line.severity}] [${line.service}] ${line.message}`)
      .join('\n');
    onCopyText(formattedEvidence, `Evidence for ${incident.title}`);
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const report = generateMarkdownReport(analysisResult, incident);
    onCopyText(report, `Full Report for ${incident.title}`);
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const report = generateMarkdownReport(analysisResult, incident);
    downloadReportFile(report, `incident-report-${incident.category.toLowerCase()}.md`, 'text/markdown');
  };

  const handleCopyCommand = (cmd: string, index: number) => {
    onCopyText(cmd, `Command: ${cmd}`);
    setCopiedCmdIdx(index);
    setTimeout(() => setCopiedCmdIdx(null), 2000);
  };

  // Find related incident objects
  const relatedIncidents = allIncidents.filter(i => incident.relatedIncidentIds.includes(i.id));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0b0f19]">
      {/* 1. Incident Selector & Quick Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0e1320] border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shrink-0">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  incident.severity === 'CRITICAL'
                    ? 'bg-red-950/80 text-red-300 border border-red-800'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                }`}
              >
                {incident.severity}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">{incident.service}</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-mono">{incident.occurrences} events detected</span>
            </div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
              {incident.title}
            </h2>
          </div>
        </div>

        {/* Switch Incident Dropdown & Actions */}
        <div className="flex items-center gap-2">
          {allIncidents.length > 1 && (
            <select
              value={incident.id}
              onChange={e => {
                const selected = allIncidents.find(i => i.id === e.target.value);
                if (selected) onSelectIncident(selected);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              {allIncidents.map(i => (
                <option key={i.id} value={i.id}>
                  [{i.severity}] {i.title.slice(0, 35)}...
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleCopyEvidence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Evidence</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Copy Report</span>
          </button>
        </div>
      </div>

      {/* 2. Probable Root-Cause Hypothesis Banner */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-indigo-900/40 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Probable Root-Cause Hypothesis
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 font-semibold">
              {incident.confidenceLabel}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Sufficiency: <strong className="text-slate-200">{incident.evidenceSufficiency}</strong>
          </span>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          {incident.probableCause}
        </p>

        {/* Heuristic Disclaimer Warning */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong>Engineering Notice:</strong> {incident.confidenceDisclaimer} Always cross-examine supporting log timestamps and underlying infrastructure before executing destructive procedures.
          </span>
        </div>

        {incident.evidenceWarning && (
          <div className="mt-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{incident.evidenceWarning}</span>
          </div>
        )}
      </div>

      {/* 3. Chronological Failure Timeline */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Chronological Failure Progression Timeline
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Step-by-step causality chain reconstructed from logged event sequence
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Span: {incident.durationSeconds}s
          </span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {incident.supportingLogLines.slice(0, 6).map((line, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === Math.min(incident.supportingLogLines.length - 1, 5);

            return (
              <div key={idx} className="relative group">
                {/* Dot */}
                <div
                  className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 transition-all ${
                    line.severity === 'CRITICAL'
                      ? 'bg-red-500 border-slate-900'
                      : line.severity === 'ERROR'
                      ? 'bg-amber-500 border-slate-900'
                      : 'bg-indigo-500 border-slate-900'
                  }`}
                />

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span className="text-indigo-400 font-semibold">
                      Step {idx + 1} · {line.timestamp.split('T')[1]}
                    </span>
                    <span className="text-slate-500 text-[11px]">Line #{line.lineNumber}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-200 break-all">
                    {line.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Supporting Evidence Terminal Box */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Corroborating Log Evidence ({incident.supportingLogLines.length} lines)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Exact timestamped raw log lines linked to this failure signature
            </p>
          </div>
          <button
            onClick={handleCopyEvidence}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>Copy All Lines</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-black/80 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto space-y-1.5 leading-relaxed">
          {incident.supportingLogLines.map((line, idx) => (
            <div key={idx} className="hover:bg-slate-900/70 p-1 rounded flex items-start gap-3">
              <span className="text-slate-600 select-none w-8 text-right shrink-0">
                {line.lineNumber}
              </span>
              <span className="text-slate-500 shrink-0 select-none">
                {line.timestamp}
              </span>
              <span
                className={`font-semibold shrink-0 ${
                  line.severity === 'CRITICAL' ? 'text-red-400' : line.severity === 'ERROR' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                [{line.severity}]
              </span>
              <span className="text-cyan-400 shrink-0">[{line.service}]</span>
              <span className="text-slate-200 break-all">{line.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Diagnostic Commands */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200">
              Suggested Diagnostic Commands
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Copyable command-line recipes to inspect cluster and database state safely
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {incident.diagnosticCommands.length} commands available
          </span>
        </div>

        <div className="space-y-3">
          {incident.diagnosticCommands.map((diag, idx) => {
            const isCopied = copiedCmdIdx === idx;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                      {diag.category}
                    </span>
                    <span className="text-slate-300 font-medium">{diag.purpose}</span>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      diag.safeToRun
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    }`}
                  >
                    {diag.safeToRun ? 'Safe Read-Only' : 'Caution / Mutates'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 p-2 rounded bg-black/60 border border-slate-800/80 font-mono text-xs text-indigo-200">
                  <code className="overflow-x-auto truncate text-slate-200">
                    $ {diag.command}
                  </code>
                  <button
                    onClick={() => handleCopyCommand(diag.command, idx)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors shrink-0"
                    title="Copy command to clipboard"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Actionable Remediation Checklist (Immediate & Long Term) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Immediate Mitigations */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-200">
              Immediate Mitigation Actions
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {incident.immediateMitigations.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                <span className="w-4 h-4 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Long-term Remediation */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200">
              Long-Term Root Cause Prevention
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {incident.remediationSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                <span className="w-4 h-4 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7. Related Incidents */}
      {relatedIncidents.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-200 mb-3">
            Correlated Incidents ({relatedIncidents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedIncidents.map(rel => (
              <button
                key={rel.id}
                onClick={() => onSelectIncident(rel)}
                className="p-3 rounded-lg bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-100">{rel.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{rel.service} · {rel.occurrences} events</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Export Bar */}
      <div className="pt-2 flex items-center justify-end gap-3 text-xs">
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors font-medium"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Download Incident File (.md)</span>
        </button>
      </div>
    </div>
  );
};
