import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  Search,
  Filter,
  RotateCcw,
  Play,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  AlertTriangle,
  Info,
  Check,
  Copy
} from 'lucide-react';
import { LogEntry, LogSeverity, Incident } from '../types';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface LogExplorerProps {
  logs: LogEntry[];
  rawText: string;
  onRawTextChange: (text: string) => void;
  onAnalyze: (customText?: string) => void;
  onClear: () => void;
  onLoadSample: (datasetId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectIncidentForPattern?: (patternId: string) => void;
  onCopyText: (text: string, label: string) => void;
}

export const LogExplorer: React.FC<LogExplorerProps> = ({
  logs,
  rawText,
  onRawTextChange,
  onAnalyze,
  onClear,
  onLoadSample,
  searchQuery,
  onSearchChange,
  onSelectIncidentForPattern,
  onCopyText
}) => {
  const [isInputExpanded, setIsInputExpanded] = useState<boolean>(logs.length === 0);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract distinct services for filtering
  const distinctServices = useMemo(() => {
    const services = new Set<string>();
    logs.forEach(l => {
      if (l.service) services.add(l.service);
    });
    return Array.from(services).sort();
  }, [logs]);

  // Handle Drag & Drop file upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.log') || file.name.endsWith('.txt') || file.type.includes('text')) {
        const reader = new FileReader();
        reader.onload = event => {
          const content = event.target?.result as string;
          if (content) {
            onRawTextChange(content);
            onAnalyze(content);
            setIsInputExpanded(false);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        if (content) {
          onRawTextChange(content);
          onAnalyze(content);
          setIsInputExpanded(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // Filter logs by search, severity, and service
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Severity filter
      if (selectedSeverity !== 'ALL' && log.severity !== selectedSeverity) {
        return false;
      }
      // Service filter
      if (selectedService !== 'ALL' && log.service !== selectedService) {
        return false;
      }
      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(query);
        const matchesSvc = log.service.toLowerCase().includes(query);
        const matchesRaw = log.raw.toLowerCase().includes(query);
        if (!matchesMsg && !matchesSvc && !matchesRaw) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedSeverity, selectedService, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0f19]">
      {/* 1. Ingestion Control Card (Collapsible) */}
      <div className="p-4 bg-[#0e1320] border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Log Stream Ingestion
            </h2>
            <span className="text-[11px] text-slate-400">
              {logs.length > 0 ? `${logs.length} events loaded` : 'No logs ingested'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInputExpanded(!isInputExpanded)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              {isInputExpanded ? 'Hide Ingestion Box' : 'Import / Ingest Logs'}
            </button>
          </div>
        </div>

        {isInputExpanded && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Drag & Drop Zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900/90 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,text/plain"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Drop .log or .txt files here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                or click to browse local filesystem
              </p>
            </div>

            {/* Middle: Paste Text Area */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              <textarea
                value={rawText}
                onChange={e => onRawTextChange(e.target.value)}
                placeholder="Paste raw server logs here (JSON, Syslog, Spring Boot, Nginx, or unstructured)..."
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Built-in sample buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 mr-1 font-medium">Load Demo:</span>
                  {SAMPLE_DATASETS.map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        onLoadSample(d.id);
                        setIsInputExpanded(false);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    >
                      {d.id === 'db-pool-exhaustion' && 'DB Pool Timeout'}
                      {d.id === 'api-503-retry-storm' && '503 Retry Storm'}
                      {d.id === 'memory-oom-crash' && 'Memory OOM'}
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClear();
                      onRawTextChange('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      onAnalyze();
                      setIsInputExpanded(false);
                    }}
                    disabled={!rawText.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Analyze Logs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter & Control Toolbar */}
      <div className="px-6 py-3 bg-[#0e1320]/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        {/* Severity Segmented Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium">
          {['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'].map(sev => (
            <button
              key={sev}
              onClick={() => {
                setSelectedSeverity(sev);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedSeverity === sev
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Service filter & Text filter */}
        <div className="flex items-center gap-3">
          {/* Service Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-medium text-[11px]">Service:</span>
            <select
              value={selectedService}
              onChange={e => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Services ({distinctServices.length})</option>
              {distinctServices.map(svc => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Counter */}
          <span className="text-[11px] text-slate-400 font-mono">
            Showing <strong className="text-slate-200">{filteredLogs.length}</strong> of {logs.length}
          </span>
        </div>
      </div>

      {/* 3. High-Density Log Table */}
      <div className="flex-1 overflow-auto">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-300">No log entries match the active filters</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try adjusting the severity filter, service dropdown, or clear your search query.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0e1320] sticky top-0 z-10 border-b border-slate-800 text-[11px] text-slate-400 font-medium font-mono select-none">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-44">Timestamp</th>
                <th className="py-2.5 px-3 w-24">Severity</th>
                <th className="py-2.5 px-3 w-40">Service</th>
                <th className="py-2.5 px-3">Message & Signature</th>
                <th className="py-2.5 px-3 w-16 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
              {paginatedLogs.map(log => {
                const isExpanded = expandedRowId === log.id;
                const isCritical = log.severity === 'CRITICAL';
                const isError = log.severity === 'ERROR';
                const isWarning = log.severity === 'WARNING';

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleRow(log.id)}
                      className={`cursor-pointer transition-colors ${
                        isCritical
                          ? 'bg-red-950/20 hover:bg-red-950/35'
                          : isError
                          ? 'bg-amber-950/15 hover:bg-amber-950/25'
                          : isWarning
                          ? 'bg-yellow-950/10 hover:bg-yellow-950/20'
                          : 'hover:bg-slate-850/50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-500 tabular-nums">
                        {log.lineNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-400 tabular-nums whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isCritical
                              ? 'bg-red-900/60 text-red-300 border border-red-700/60'
                              : isError
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                              : isWarning
                              ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                              : 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-300 whitespace-nowrap truncate max-w-[160px]">
                        {log.service}
                      </td>
                      <td className="py-2 px-3 text-slate-200 break-all">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isCritical ? 'text-red-300 font-semibold' : isError ? 'text-amber-200' : 'text-slate-300'
                            }
                          >
                            {log.message}
                          </span>

                          {log.matchedPatternId && (
                            <span className="shrink-0 text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                              Pattern: {log.matchedPatternId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 inline text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 inline text-slate-600" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detailed Log Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-900/90 border-y border-slate-700">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-3 font-sans">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200">
                                Raw Log Record — Line #{log.lineNumber}
                              </span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onCopyText(log.raw, `Raw Log #${log.lineNumber}`);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Line</span>
                              </button>
                            </div>

                            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {log.raw}
                            </pre>

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Parsed Attributes
                                </span>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {Object.entries(log.metadata).map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-slate-300"
                                    >
                                      <span className="text-indigo-400">{k}:</span> {String(v)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Table Pagination Footer */}
      {filteredLogs.length > 0 && (
        <div className="px-6 py-2.5 bg-[#0e1320] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none">
          <div>
            Page <strong className="text-slate-200">{currentPage}</strong> of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
