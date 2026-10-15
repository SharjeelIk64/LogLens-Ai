/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { LogExplorer } from './components/LogExplorer';
import { IncidentsList } from './components/IncidentsList';
import { IncidentInvestigation } from './components/IncidentInvestigation';
import { SettingsView } from './components/SettingsView';
import { ToastContainer, ToastMessage } from './components/Toast';

import { LogEntry, AnalysisResult, Incident } from './types';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { parseRawLogs } from './services/logParser';
import { analyzeLogs } from './services/analyzer';
import {
  generateMarkdownReport,
  generateJsonReport,
  downloadReportFile
} from './services/reportGenerator';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [rawText, setRawText] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>('db-pool-exhaustion');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');

  // Toast notification helper
  const addToast = useCallback((type: 'success' | 'warning' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Perform Analysis on raw text
  const performAnalysis = useCallback((inputText: string, isSample = false, datasetName?: string) => {
    try {
      const parsedLogs = parseRawLogs(inputText);
      const result = analyzeLogs(parsedLogs);

      setLogs(parsedLogs);
      setAnalysisResult(result);
      setSelectedIncident(result.incidents.length > 0 ? result.incidents[0] : null);

      if (isSample) {
        setIsDemoMode(true);
        addToast(
          'info',
          'Demo Dataset Loaded',
          `Loaded ${parsedLogs.length} events for ${datasetName || 'sample dataset'}`
        );
      } else {
        setIsDemoMode(false);
        addToast(
          'success',
          'Log Stream Ingested & Analyzed',
          `Parsed ${parsedLogs.length} entries, identified ${result.incidents.length} failure patterns`
        );
      }
    } catch (err) {
      console.error('Failed to parse and analyze logs:', err);
      addToast('warning', 'Analysis Warning', 'Some malformed lines could not be fully parsed.');
    }
  }, [addToast]);

  // Load a built-in dataset
  const handleLoadDataset = useCallback((datasetId: string) => {
    const dataset = SAMPLE_DATASETS.find(d => d.id === datasetId);
    if (!dataset) return;

    setActiveDatasetId(datasetId);
    setRawText(dataset.logText);
    performAnalysis(dataset.logText, true, dataset.name);
  }, [performAnalysis]);

  // Initial load: Boot with Dataset 1 (Database Pool Exhaustion) so the user has immediate rich data
  useEffect(() => {
    handleLoadDataset('db-pool-exhaustion');
  }, [handleLoadDataset]);

  // Clear all logs
  const handleClearLogs = () => {
    setRawText('');
    setLogs([]);
    setAnalysisResult(null);
    setSelectedIncident(null);
    setActiveDatasetId(null);
    setIsDemoMode(false);
    addToast('info', 'Workspace Reset', 'All loaded logs and incidents have been cleared.');
  };

  // Export report
  const handleExportReport = (format: 'markdown' | 'json') => {
    if (!analysisResult || logs.length === 0) {
      addToast('warning', 'No Logs to Export', 'Load or paste logs before exporting an incident report.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'markdown') {
      const report = generateMarkdownReport(analysisResult, selectedIncident || undefined);
      downloadReportFile(report, `loglens-incident-report-${timestamp}.md`, 'text/markdown');
      addToast('success', 'Report Exported', 'Downloaded incident report as Markdown (.md)');
    } else {
      const report = generateJsonReport(analysisResult, selectedIncident || undefined);
      downloadReportFile(report, `loglens-incident-report-${timestamp}.json`, 'application/json');
      addToast('success', 'Report Exported', 'Downloaded incident report as JSON (.json)');
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      addToast('success', 'Copied to Clipboard', label);
    } else {
      addToast('info', 'Clipboard Unavailable', 'Browser prevented clipboard write.');
    }
  };

  // Navigate to Incident Investigation
  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setCurrentTab('investigation');
  };

  const activeDataset = SAMPLE_DATASETS.find(d => d.id === activeDatasetId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        analysisResult={analysisResult}
        activeDatasetName={activeDataset?.name}
        isDemoMode={isDemoMode}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeDatasetId={activeDatasetId}
          onSelectDataset={handleLoadDataset}
          onExportReport={handleExportReport}
          onClearLogs={handleClearLogs}
          totalLogs={logs.length}
        />

        {/* Viewport Content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {currentTab === 'overview' && (
            <OverviewDashboard
              analysisResult={analysisResult}
              onNavigateTab={setCurrentTab}
              onSelectIncident={handleSelectIncident}
              onLoadSample={handleLoadDataset}
            />
          )}

          {currentTab === 'explorer' && (
            <LogExplorer
              logs={logs}
              rawText={rawText}
              onRawTextChange={setRawText}
              onAnalyze={(custom) => performAnalysis(custom || rawText, false)}
              onClear={handleClearLogs}
              onLoadSample={handleLoadDataset}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectIncidentForPattern={(patternId) => {
                const found = analysisResult?.incidents.find(i => i.category.toLowerCase().includes(patternId.toLowerCase()));
                if (found) handleSelectIncident(found);
              }}
              onCopyText={handleCopyText}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsList
              incidents={analysisResult?.incidents || []}
              onSelectIncident={handleSelectIncident}
              onOpenExplorer={() => setCurrentTab('explorer')}
            />
          )}

          {currentTab === 'investigation' && (
            <IncidentInvestigation
              incident={selectedIncident}
              allIncidents={analysisResult?.incidents || []}
              analysisResult={analysisResult}
              onSelectIncident={setSelectedIncident}
              onCopyText={handleCopyText}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              isDemoMode={isDemoMode}
            />
          )}
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
