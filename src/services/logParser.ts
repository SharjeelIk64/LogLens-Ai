/**
 * Log Parser Engine for LogLens AI
 * Parses raw multiline logs into structured LogEntry records.
 * Handles JSON, ISO timestamps, standard brackets, syslog, and raw text lines safely.
 */
import { LogEntry, LogSeverity } from '../types';

export function parseRawLogs(rawText: string): LogEntry[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const parsedEntries: LogEntry[] = [];
  let baseTimestamp = Date.now() - lines.length * 2000;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) {
      continue;
    }

    const lineNumber = i + 1;
    const entry = parseSingleLine(rawLine, lineNumber, baseTimestamp);
    if (entry) {
      parsedEntries.push(entry);
      // Keep monotonic forward time if timestamp was parsed
      if (entry.timeUnix > 0) {
        baseTimestamp = entry.timeUnix;
      }
    }
  }

  return parsedEntries;
}

function parseSingleLine(raw: string, lineNumber: number, fallbackBaseTime: number): LogEntry {
  const trimmed = raw.trim();

  // 1. Try parsing JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const json = JSON.parse(trimmed);
      const timestampStr = json.timestamp || json.time || json['@timestamp'] || new Date(fallbackBaseTime).toISOString();
      const timeUnix = parseTimeToUnix(timestampStr, fallbackBaseTime);
      const severity = normalizeSeverity(json.level || json.severity || json.log_level || 'INFO');
      const service = json.service || json.app || json.component || 'application';
      const message = json.message || json.msg || json.log || JSON.stringify(json);

      return {
        id: `log-${lineNumber}-${timeUnix}`,
        lineNumber,
        raw,
        timestamp: timestampStr,
        timeUnix,
        severity,
        service,
        message,
        metadata: {
          format: 'json',
          ...extractKeyValues(message)
        }
      };
    } catch {
      // Fallback to regex parsing if not valid JSON
    }
  }

  // 2. Bracketed Format:
  // e.g., 2026-10-14T21:40:02.104Z [INFO] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 ...
  // or [2026-10-14 21:40:02] [ERROR] [checkout-service] ...
  const bracketMatch = trimmed.match(
    /^(?:\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?)?\s*(?:\[(CRITICAL|FATAL|ERROR|ERR|WARN|WARNING|INFO|DEBUG|TRACE)\])?\s*(?:\[([a-zA-Z0-9_\-./]+)\])?\s*(.*)$/i
  );

  if (bracketMatch && (bracketMatch[1] || bracketMatch[2] || bracketMatch[3])) {
    const rawTimestamp = bracketMatch[1] || new Date(fallbackBaseTime).toISOString();
    const rawSeverity = bracketMatch[2] || detectSeverityFromText(bracketMatch[4] || raw);
    const service = bracketMatch[3] || detectServiceFromText(bracketMatch[4] || raw) || 'system';
    const message = bracketMatch[4] || trimmed;
    const timeUnix = parseTimeToUnix(rawTimestamp, fallbackBaseTime);

    return {
      id: `log-${lineNumber}-${timeUnix}`,
      lineNumber,
      raw,
      timestamp: rawTimestamp,
      timeUnix,
      severity: normalizeSeverity(rawSeverity),
      service,
      message,
      metadata: extractKeyValues(message)
    };
  }

  // 3. Syslog style: "Oct 14 21:40:02 hostname service[123]: message"
  const syslogMatch = trimmed.match(
    /^([A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+([a-zA-Z0-9_\-]+)\s+([a-zA-Z0-9_\-]+)(?:\[\d+\])?:\s*(.*)$/
  );

  if (syslogMatch) {
    const timeStr = syslogMatch[1];
    const service = syslogMatch[3] || syslogMatch[2];
    const message = syslogMatch[4];
    const timeUnix = parseTimeToUnix(timeStr, fallbackBaseTime);
    const severity = detectSeverityFromText(message);

    return {
      id: `log-${lineNumber}-${timeUnix}`,
      lineNumber,
      raw,
      timestamp: new Date(timeUnix).toISOString(),
      timeUnix,
      severity,
      service,
      message,
      metadata: extractKeyValues(message)
    };
  }

  // 4. Fallback unstructured raw line:
  const detectedSev = detectSeverityFromText(trimmed);
  const detectedSvc = detectServiceFromText(trimmed) || 'app';
  const inferredTime = new Date(fallbackBaseTime + lineNumber * 1000).toISOString();

  return {
    id: `log-${lineNumber}-${fallbackBaseTime}`,
    lineNumber,
    raw,
    timestamp: inferredTime,
    timeUnix: fallbackBaseTime + lineNumber * 1000,
    severity: detectedSev,
    service: detectedSvc,
    message: trimmed,
    metadata: extractKeyValues(trimmed)
  };
}

function parseTimeToUnix(timeStr: string, fallbackBase: number): number {
  if (!timeStr) return fallbackBase;
  try {
    const parsed = Date.parse(timeStr);
    if (!isNaN(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore error
  }
  return fallbackBase;
}

export function normalizeSeverity(sevStr: string): LogSeverity {
  const upper = (sevStr || '').toUpperCase().trim();
  if (upper === 'CRITICAL' || upper === 'FATAL' || upper === 'EMERGENCY') {
    return 'CRITICAL';
  }
  if (upper === 'ERROR' || upper === 'ERR' || upper === 'FAILURE' || upper === 'SEVERE') {
    return 'ERROR';
  }
  if (upper === 'WARN' || upper === 'WARNING') {
    return 'WARNING';
  }
  if (upper === 'INFO' || upper === 'NOTICE') {
    return 'INFO';
  }
  if (upper === 'DEBUG' || upper === 'TRACE') {
    return 'DEBUG';
  }
  return 'INFO';
}

function detectSeverityFromText(text: string): LogSeverity {
  const lower = text.toLowerCase();
  if (
    lower.includes('critical') ||
    lower.includes('fatal') ||
    lower.includes('oomkilled') ||
    lower.includes('outofmemoryerror') ||
    lower.includes('signal 137') ||
    lower.includes('deadlock detected')
  ) {
    return 'CRITICAL';
  }
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('timeout') ||
    lower.includes('exception') ||
    lower.includes('500 internal') ||
    lower.includes('502 bad gateway') ||
    lower.includes('503 service unavailable') ||
    lower.includes('504 gateway timeout')
  ) {
    return 'ERROR';
  }
  if (
    lower.includes('warn') ||
    lower.includes('retry') ||
    lower.includes('slow') ||
    lower.includes('high latency') ||
    lower.includes('saturation')
  ) {
    return 'WARNING';
  }
  if (lower.includes('debug') || lower.includes('trace')) {
    return 'DEBUG';
  }
  return 'INFO';
}

function detectServiceFromText(text: string): string | null {
  const match = text.match(/\b([a-zA-Z0-9_\-]+(?:-service|-api|-worker|-db|-gateway|-indexer|-nginx|-ingress))\b/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}

function extractKeyValues(text: string): Record<string, string | number> {
  const metadata: Record<string, string | number> = {};
  const kvRegex = /([a-zA-Z0-9_\-]+)=([^\s]+)/g;
  let match;
  while ((match = kvRegex.exec(text)) !== null) {
    const key = match[1];
    const val = match[2];
    const num = Number(val);
    metadata[key] = !isNaN(num) ? num : val.replace(/^["']|["']$/g, '');
  }
  return metadata;
}
