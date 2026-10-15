/**
 * Report Generation Service for LogLens AI
 * Exports structured JSON and comprehensive Markdown/Text incident reports.
 */

import { AnalysisResult, Incident } from '../types';

export function generateMarkdownReport(result: AnalysisResult, specificIncident?: Incident): string {
  const timestamp = new Date().toISOString();
  const summary = result.summary;

  let report = `# LOGLENS AI — INCIDENT INVESTIGATION REPORT
Generated: ${timestamp}
Analysis Engine: Rule-Based Heuristic Evaluation v1.0 (Zero External Leakage)
Mode: Client-Side Heuristic Verification

================================================================================
EXECUTIVE TELEMETRY SUMMARY
================================================================================
Total Log Events Analyzed : ${summary.totalLogs}
Critical Severity Events  : ${summary.criticalCount}
Error Severity Events     : ${summary.errorCount}
Warning Events            : ${summary.warningCount}
Informational Events      : ${summary.infoCount}
Distinct Services Scanned : ${summary.serviceCount}
Identified Incidents      : ${summary.incidentCount}
Observation Time Span     : ${summary.timeSpanFormatted} (${summary.earliestTimestamp} to ${summary.latestTimestamp})

================================================================================
SERVICE HEALTH STATUS
================================================================================
`;

  for (const s of result.serviceHealthList) {
    const errorPct = s.totalLogs > 0 ? ((s.errorCount / s.totalLogs) * 100).toFixed(1) : '0.0';
    report += `• [${s.status}] ${s.serviceName.padEnd(24)} | Errors: ${s.errorCount.toString().padStart(3)} (${errorPct}%) | Incidents: ${s.incidentCount}\n`;
  }

  const incidentsToReport = specificIncident ? [specificIncident] : result.incidents;

  report += `\n================================================================================
DETECTED INCIDENTS & ROOT CAUSE INVESTIGATIONS (${incidentsToReport.length})
================================================================================\n`;

  if (incidentsToReport.length === 0) {
    report += `No anomalous incident patterns detected in the provided log stream.\n`;
  }

  incidentsToReport.forEach((inc, index) => {
    report += `
--------------------------------------------------------------------------------
INCIDENT #${index + 1}: ${inc.title}
--------------------------------------------------------------------------------
Severity               : ${inc.severity}
Category               : ${inc.category}
Primary Service        : ${inc.service}
Occurrences Detected   : ${inc.occurrences}
Time Range             : ${inc.firstSeen} -> ${inc.lastSeen} (${inc.durationSeconds}s duration)
Heuristic Confidence   : ${inc.confidenceLabel}
Evidence Sufficiency   : ${inc.evidenceSufficiency}
${inc.evidenceWarning ? `Evidence Warning       : [!] ${inc.evidenceWarning}\n` : ''}
PROBABLE ROOT-CAUSE HYPOTHESIS:
${inc.probableCause}

DISCLAIMER:
${inc.confidenceDisclaimer}

SUPPORTING EVIDENCE EXCERPTS:
${inc.supportingLogLines
  .map(
    line =>
      `  [Line ${line.lineNumber.toString().padStart(3)}] ${line.timestamp} [${line.severity}] [${line.service}] ${line.message}`
  )
  .join('\n')}

SUGGESTED DIAGNOSTIC COMMANDS:
${inc.diagnosticCommands
  .map(
    cmd =>
      `  • [${cmd.category}] ${cmd.purpose}\n    $ ${cmd.command} (Safe to run: ${cmd.safeToRun ? 'YES' : 'CAUTION'})`
  )
  .join('\n\n')}

IMMEDIATE MITIGATION ACTIONS:
${inc.immediateMitigations.map((step, sIdx) => `  ${sIdx + 1}. ${step}`).join('\n')}

LONG-TERM ROOT CAUSE REMEDIATION:
${inc.remediationSteps.map((step, sIdx) => `  ${sIdx + 1}. ${step}`).join('\n')}
`;
  });

  report += `\n================================================================================
END OF REPORT — LogLens AI (Intelligent Log Analysis & Incident Investigation)
================================================================================\n`;

  return report;
}

export function generateJsonReport(result: AnalysisResult, specificIncident?: Incident): string {
  const payload = {
    reportMetadata: {
      generator: 'LogLens AI',
      generatedAt: new Date().toISOString(),
      engine: 'Deterministic Heuristic Rule-Based Pattern Analysis',
      classification: 'Confidential Diagnostics'
    },
    summary: result.summary,
    serviceHealth: result.serviceHealthList,
    targetIncident: specificIncident ? specificIncident.id : 'ALL',
    incidents: specificIncident ? [specificIncident] : result.incidents,
    evidenceSample: specificIncident
      ? specificIncident.supportingLogLines
      : result.incidents.flatMap(i => i.supportingLogLines.slice(0, 3))
  };

  return JSON.stringify(payload, null, 2);
}

export function downloadReportFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
