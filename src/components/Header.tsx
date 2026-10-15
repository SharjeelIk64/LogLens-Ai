import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Download,
  RotateCcw,
  Database,
  ChevronDown,
  FileText,
  FileCode,
  Check
} from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeDatasetId: string | null;
  onSelectDataset: (datasetId: string) => void;
  onExportReport: (format: 'markdown' | 'json') => void;
  onClearLogs: () => void;
  totalLogs: number;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  overview: { title: 'Overview Dashboard', subtitle: 'System-wide health telemetry and error pattern synthesis' },
  explorer: { title: 'Log Explorer', subtitle: 'Stream ingestion, high-density filtering, and pattern matching' },
  incidents: { title: 'Detected Incidents', subtitle: 'Correlated failure cascades and heuristic triage' },
  investigation: { title: 'Root Cause Analysis', subtitle: 'Deep evidence timeline, diagnostics, and remediation' },
  settings: { title: 'Settings & Architecture', subtitle: 'Engine privacy, limitations, and optional AI proxy design' }
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  activeDatasetId,
  onSelectDataset,
  onExportReport,
  onClearLogs,
  totalLogs
}) => {
  const [isDatasetMenuOpen, setIsDatasetMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const datasetRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datasetRef.current && !datasetRef.current.contains(event.target as Node)) {
        setIsDatasetMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDataset = SAMPLE_DATASETS.find(d => d.id === activeDatasetId);

  return (
    <header className="h-16 px-6 bg-[#0e1320]/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* Zone 1: Contextual Title & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-100 tracking-tight whitespace-nowrap">
            {TAB_TITLES[currentTab].title}
          </h1>
          <p className="text-[11px] text-slate-400 whitespace-nowrap hidden sm:block">
            {TAB_TITLES[currentTab].subtitle}
          </p>
        </div>
      </div>

      {/* Zone 2: Global Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search error messages, services, or status codes..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Actions & Demo Switcher */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Demo Dataset Selector */}
        <div className="relative" ref={datasetRef}>
          <button
            onClick={() => setIsDatasetMenuOpen(!isDatasetMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors whitespace-nowrap"
            title="Switch Demo Dataset"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[130px] truncate">
              {activeDataset ? activeDataset.name : 'Select Dataset'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDatasetMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 p-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 z-50 text-xs">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Built-in Demo Datasets
              </div>
              {SAMPLE_DATASETS.map(d => {
                const isSelected = d.id === activeDatasetId;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDataset(d.id);
                      setIsDatasetMenuOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-md transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                        {d.name}
                        {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{d.shortDesc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Export Report Dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            disabled={totalLogs === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              totalLogs > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
            <ChevronDown className="w-3 h-3 text-indigo-200" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-44 p-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 z-50 text-xs">
              <button
                onClick={() => {
                  onExportReport('markdown');
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Download as .txt / .md</span>
              </button>
              <button
                onClick={() => {
                  onExportReport('json');
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download as .json</span>
              </button>
            </div>
          )}
        </div>

        {/* Clear / Reset button */}
        <button
          onClick={onClearLogs}
          disabled={totalLogs === 0}
          title="Clear all currently loaded log streams"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Clear loaded logs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
