/**
 * Core Type Definitions for LogLens AI
 */

export type LogSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

export interface LogEntry {
  id: string;
  lineNumber: number;
  raw: string;
  timestamp: string;
  timeUnix: number;
  severity: LogSeverity;
  service: string;
  message: string;
  matchedPatternId?: string;
  metadata?: Record<string, string | number>;
}

export type IncidentCategory =
  | 'DATABASE_EXHAUSTION'
  | 'GATEWAY_TIMEOUT_503'
  | 'MEMORY_PRESSURE_OOM'
  | 'AUTHENTICATION_FAILURE'
  | 'LATENCY_DEGRADATION'
  | 'RETRY_STORM'
  | 'CIRCUIT_BREAKER';

export interface SupportingEvidence {
  lineNumber: number;
  timestamp: string;
  message: string;
  raw: string;
  severity: LogSeverity;
  service: string;
}

export interface DiagnosticCommand {
  command: string;
  purpose: string;
  safeToRun: boolean;
  category: 'KUBERNETES' | 'DATABASE' | 'NETWORK' | 'RUNTIME' | 'SYSTEM';
}

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  service: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  durationSeconds: number;
  supportingLogLines: SupportingEvidence[];
  probableCause: string;
  confidenceScore: number; // 0 to 100 heuristic score
  confidenceLabel: string;
  confidenceDisclaimer: string;
  evidenceSufficiency: 'SUFFICIENT' | 'INSUFFICIENT' | 'MODERATE';
  evidenceWarning?: string;
  diagnosticCommands: DiagnosticCommand[];
  immediateMitigations: string[];
  remediationSteps: string[];
  relatedIncidentIds: string[];
}

export interface TimeBucket {
  timeLabel: string;
  timestamp: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  total: number;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  errorCount: number;
  warningCount: number;
  totalLogs: number;
  incidentCount: number;
  lastErrorTimestamp?: string;
}

export interface AnalysisSummary {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  criticalCount: number;
  incidentCount: number;
  serviceCount: number;
  earliestTimestamp: string;
  latestTimestamp: string;
  timeSpanFormatted: string;
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  logs: LogEntry[];
  incidents: Incident[];
  timeBuckets: TimeBucket[];
  serviceHealthList: ServiceHealth[];
  detectedPatterns: Array<{
    id: string;
    title: string;
    count: number;
    severity: string;
    category: IncidentCategory;
  }>;
}

export interface SampleDataset {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  primaryService: string;
  expectedPattern: string;
  logText: string;
}
