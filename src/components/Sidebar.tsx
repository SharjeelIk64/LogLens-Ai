import React from 'react';
import {
  LayoutDashboard,
  FileCode2,
  AlertOctagon,
  Microscope,
  Sliders,
  Database,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { AnalysisResult } from '../types';

export type NavigationTab = 'overview' | 'explorer' | 'incidents' | 'investigation' | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  analysisResult: AnalysisResult | null;
  activeDatasetName?: string;
  isDemoMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  analysisResult,
  activeDatasetName,
  isDemoMode
}) => {
  const incidentCount = analysisResult?.summary.incidentCount || 0;
  const criticalCount = analysisResult?.summary.criticalCount || 0;
  const totalLogs = analysisResult?.summary.totalLogs || 0;

  const navItems = [
    {
      id: 'overview' as NavigationTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'explorer' as NavigationTab,
      label: 'Log Explorer',
      icon: FileCode2,
      badge: totalLogs > 0 ? `${totalLogs}` : null
    },
    {
      id: 'incidents' as NavigationTab,
      label: 'Incidents',
      icon: AlertOctagon,
      badge: incidentCount > 0 ? `${incidentCount}` : null,
      badgeColor: criticalCount > 0 ? 'text-red-400 bg-red-950/60' : 'text-amber-400 bg-amber-950/60'
    },
    {
      id: 'investigation' as NavigationTab,
      label: 'Root Cause Analysis',
      icon: Microscope,
      badge: null
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings & Architecture',
      icon: Sliders,
      badge: null
    }
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0e1320] border-r border-slate-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Zone */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Microscope className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
              LogLens AI
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Incident Investigation
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Workspace
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      item.badgeColor || 'text-slate-300 bg-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dataset & Engine Status Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Dataset Card */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3 h-3 text-cyan-400" />
              Source Mode
            </span>
            {isDemoMode ? (
              <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/60">
                DEMO DATA
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/60">
                USER LOGS
              </span>
            )}
          </div>
          <p className="text-slate-300 font-medium truncate text-[11px]">
            {activeDatasetName || 'Custom Ingestion Stream'}
          </p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span>{totalLogs} events</span>
            <span aria-hidden="true">·</span>
            <span>{incidentCount} incidents</span>
          </div>
        </div>

        {/* Security / Engine badge */}
        <div className="px-2 py-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            100% Client-Side Engine
          </span>
          <span className="text-slate-400">v1.0</span>
        </div>
      </div>
    </aside>
  );
};
