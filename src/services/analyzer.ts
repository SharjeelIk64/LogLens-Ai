/**
 * Rule-Based Log Analysis & Heuristic Incident Recognition Engine
 * Evaluates log streams against deterministic signature rules, groups failure cascades,
 * scores evidence sufficiency, and derives actionable diagnostic commands and mitigations.
 */

import {
  AnalysisResult,
  AnalysisSummary,
  DiagnosticCommand,
  Incident,
  IncidentCategory,
  LogEntry,
  ServiceHealth,
  SupportingEvidence,
  TimeBucket
} from '../types';

interface PatternRule {
  id: string;
  category: IncidentCategory;
  title: string;
  defaultSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  matchRegex: RegExp;
  rootCauseTemplate: (matchedLogs: LogEntry[], primaryService: string) => string;
  diagnosticCommands: DiagnosticCommand[];
  immediateMitigations: string[];
  remediationSteps: string[];
}

const PATTERN_RULES: PatternRule[] = [
  // 1. Database Connection Pool Exhaustion & Deadlocks
  {
    id: 'db-pool-exhaustion',
    category: 'DATABASE_EXHAUSTION',
    title: 'Database Connection Pool Exhaustion & Concurrency Contention',
    defaultSeverity: 'CRITICAL',
    matchRegex: /(HikariPool|ConnectionPool|connection slots are reserved|Connection is not available|deadlock detected|connection checkout timeout|remaining connection slots|CannotAcquireLockException)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation indicates connection pool exhaustion in '${service}'. All active connection slots (${logs.length > 5 ? '100% capacity' : 'high saturation'}) were claimed, causing thread starvation, 30s connection acquisition timeouts, and downstream transaction deadlocks on concurrent row updates.`,
    diagnosticCommands: [
      {
        command: "SELECT count(*), state FROM pg_stat_activity GROUP BY state;",
        purpose: "Inspect active vs idle Postgres database connection states and verify connection pool leak",
        safeToRun: true,
        category: 'DATABASE'
      },
      {
        command: "SELECT pid, query_start, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;",
        purpose: "Identify long-running blocking queries holding locks or connections",
        safeToRun: true,
        category: 'DATABASE'
      },
      {
        command: "SELECT blocked_locks.pid AS blocked_pid, blocking_locks.pid AS blocking_pid, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid;",
        purpose: "Display live transaction lock dependency graph and deadlock chain",
        safeToRun: true,
        category: 'DATABASE'
      }
    ],
    immediateMitigations: [
      "Temporarily increase PostgreSQL max_connections or pool size if database CPU and memory allow.",
      "Deploy a connection pooler like PgBouncer in transaction pooling mode to multiplex client connections.",
      "Terminate orphan idle-in-transaction connections holding shared locks (`SELECT pg_terminate_backend(pid)`)."
    ],
    remediationSteps: [
      "Review ORM transaction boundaries to guarantee connections are released in `finally` blocks.",
      "Tune HikariCP `connectionTimeout` (reduce to 5000ms to fail fast) and configure `leakDetectionThreshold`.",
      "Ensure consistent row-lock ordering across `orders` and `order_items` tables to prevent concurrent deadlocks."
    ]
  },

  // 2. HTTP 504 Gateway Timeout & Upstream Latency
  {
    id: 'gateway-timeout-504',
    category: 'GATEWAY_TIMEOUT_503',
    title: 'Upstream Partner Gateway Timeout (HTTP 504)',
    defaultSeverity: 'HIGH',
    matchRegex: /(504 Gateway Timeout|upstream_connect_status=TIMEOUT|upstream latency warning|threshold=30000ms|timed? ?out while proxying)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation indicates third-party partner or upstream service degradation. Outbound HTTP requests from '${service}' timed out after exceeding timeout limits (e.g. 30s), blocking worker threads.`,
    diagnosticCommands: [
      {
        command: "curl -Iv -m 5 https://partner.stripe-mock.internal/healthz",
        purpose: "Verify egress network connectivity and upstream gateway latency directly",
        safeToRun: true,
        category: 'NETWORK'
      },
      {
        command: "kubectl logs -l app=payment-gateway --tail=100 --since=15m | grep -E '(504|timeout)'",
        purpose: "Check recent gateway timeout error distribution across pods",
        safeToRun: true,
        category: 'KUBERNETES'
      }
    ],
    immediateMitigations: [
      "Activate payment failover / secondary merchant routing if multi-region fallback is configured.",
      "Reduce client-side outbound HTTP request timeout from 30s down to 5s to avoid tying up worker threads."
    ],
    remediationSteps: [
      "Implement asynchronous webhook processing for payment authorizations instead of synchronous blocking calls.",
      "Enforce rigorous circuit breaking before upstream latency cascades into internal worker pools."
    ]
  },

  // 3. Retry Storm & Thundering Herd
  {
    id: 'retry-storm',
    category: 'RETRY_STORM',
    title: 'Cascade Retry Storm & Queue Saturation',
    defaultSeverity: 'CRITICAL',
    matchRegex: /(retry \d of \d failed|exponential backoff maxed|thundering herd|ThreadPoolExecutor|RejectedExecutionException|queue size reached|shedding .* retries)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation detects a retry storm in '${service}'. Downstream workers retried failed requests with minimal or zero randomized jitter, creating an amplified thundering herd that saturated worker queues and triggered RejectedExecutionExceptions.`,
    diagnosticCommands: [
      {
        command: "redis-cli LLEN retry-queue:payments",
        purpose: "Check backlog depth in asynchronous retry queues to assess saturation",
        safeToRun: true,
        category: 'RUNTIME'
      },
      {
        command: "kubectl top pods -n default -l app=billing-worker",
        purpose: "Inspect CPU and thread utilization across billing worker replicas",
        safeToRun: true,
        category: 'KUBERNETES'
      }
    ],
    immediateMitigations: [
      "Enable upstream rate-limiting to shed excess retry traffic.",
      "Temporarily pause non-critical background retry queues while upstream recovers."
    ],
    remediationSteps: [
      "Add Full Jitter (decorrelated jitter) to exponential backoff algorithms (`sleep = rand(0, min(cap, base * 2^attempt))`).",
      "Set a strict maximum retry cap of 2 attempts for external transient failures."
    ]
  },

  // 4. Circuit Breaker Tripped & HTTP 503 Service Unavailable
  {
    id: 'circuit-breaker-503',
    category: 'CIRCUIT_BREAKER',
    title: 'Circuit Breaker OPEN & HTTP 503 Service Unavailable',
    defaultSeverity: 'HIGH',
    matchRegex: /(Circuit breaker .* state changed to OPEN|Circuit breaker .* is OPEN|503 Service Unavailable|Circuit open|short-circuiting .* requests)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation indicates circuit breaker protection activated in '${service}'. High consecutive error rates breached thresholds, flipping the breaker to OPEN to prevent complete system collapse. Requests are being short-circuited with HTTP 503.`,
    diagnosticCommands: [
      {
        command: "curl -s http://localhost:8080/actuator/health | jq .components.circuitBreakers",
        purpose: "Query Spring/Resilience4j circuit breaker state and metrics endpoint",
        safeToRun: true,
        category: 'RUNTIME'
      }
    ],
    immediateMitigations: [
      "Verify if downstream dependency has stabilized before manually resetting the breaker.",
      "Ensure graceful degraded response (e.g. cached data or queued confirmation) is returned instead of bare 503."
    ],
    remediationSteps: [
      "Calibrate circuit breaker failure rate threshold (e.g., minimum 50 calls in ring buffer before evaluation).",
      "Configure fallback handlers to queue checkout requests for offline processing."
    ]
  },

  // 5. Memory Pressure, Long GC Pauses & OOMKilled Signal 137
  {
    id: 'memory-oom-crash',
    category: 'MEMORY_PRESSURE_OOM',
    title: 'Heap Memory Exhaustion & Kernel OOMKilled (Signal 137)',
    defaultSeverity: 'CRITICAL',
    matchRegex: /(OutOfMemoryError|OOMKilled|Signal 137|Long GC pause|Stop-The-World|heap 9[0-9]%|CrashLoopBackOff|Dumping heap)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation indicates unconstrained memory allocation in '${service}'. JVM/Node heap usage surged past 95%, driving GC pause times above 4000ms. When memory limits were exceeded, the Linux kernel terminated the container with OOMKilled (Signal 137).`,
    diagnosticCommands: [
      {
        command: "kubectl describe pod -l app=search-indexer | grep -A 5 -E '(Last State|OOMKilled|Exit Code)'",
        purpose: "Verify container exit code 137 and exact memory limit termination from Kubernetes event log",
        safeToRun: true,
        category: 'KUBERNETES'
      },
      {
        command: "jcmd 1 GC.heap_info || ps aux --sort=-%mem | head -n 10",
        purpose: "Inspect current memory consumption and top memory processes",
        safeToRun: true,
        category: 'SYSTEM'
      },
      {
        command: "jhat -J-Xmx4g /var/log/dumps/java_pid1.hprof",
        purpose: "Analyze generated heap dump to identify object retention dominators and memory leaks",
        safeToRun: true,
        category: 'RUNTIME'
      }
    ],
    immediateMitigations: [
      "Increase Kubernetes memory limit for the container (e.g., from 1024Mi to 2048Mi) as a temporary band-aid.",
      "Reduce batch document ingestion chunk size (e.g., from 25,000 documents down to 2,500 documents)."
    ],
    remediationSteps: [
      "Inspect heap dump `.hprof` to locate byte buffer retention or unbounded cache accumulation.",
      "Implement streaming backpressure: do not load entire batch payloads into memory before indexing.",
      "Ensure JVM `-XX:MaxRAMPercentage=75.0` is configured so container memory limits account for native memory."
    ]
  },

  // 6. Generic HTTP 500 & 502 Errors
  {
    id: 'http-500-502-cascade',
    category: 'GATEWAY_TIMEOUT_503',
    title: 'Internal Server Error (HTTP 500 / 502)',
    defaultSeverity: 'HIGH',
    matchRegex: /(HTTP\/1\.[01] 500|HTTP 500|HTTP 502|Bad Gateway|upstream_status=500|502 Bad Gateway)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation detected unhandled application errors or bad gateway responses in '${service}'. Downstream clients received HTTP 500/502 indicating unhandled exceptions or proxy failures.`,
    diagnosticCommands: [
      {
        command: "kubectl logs -l app=ingress-nginx --tail=100 | grep -E '( 500 | 502 )'",
        purpose: "Inspect ingress proxy access logs for failure paths and upstream response codes",
        safeToRun: true,
        category: 'NETWORK'
      }
    ],
    immediateMitigations: [
      "Check error logs for unhandled exception stack traces.",
      "Verify upstream reverse proxy route definitions and keepalive timeouts."
    ],
    remediationSteps: [
      "Add standardized error middleware to return structured error responses with correlation IDs.",
      "Ensure database and service connection failures are mapped to appropriate status codes."
    ]
  },

  // 7. Authentication / Authorization Failures
  {
    id: 'auth-jwt-failures',
    category: 'AUTHENTICATION_FAILURE',
    title: 'Authentication & Security Token Validation Failures',
    defaultSeverity: 'MEDIUM',
    matchRegex: /(401 Unauthorized|JWT expired|invalid signature|TokenExpiredException|AuthenticationFailed|signature verification failed|Forbidden 403)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation indicates authentication token rejection in '${service}'. Requests failed due to expired signing certificates, invalid JWT signatures, or clock skew between authentication providers.`,
    diagnosticCommands: [
      {
        command: "openssl s_client -connect auth.internal:443 -servername auth.internal </dev/null 2>/dev/null | openssl x509 -noout -dates",
        purpose: "Verify SSL/TLS certificate validity dates and check for expiration",
        safeToRun: true,
        category: 'NETWORK'
      },
      {
        command: "timedatectl status || ntpstat",
        purpose: "Verify system clock synchronization and NTP status across cluster nodes",
        safeToRun: true,
        category: 'SYSTEM'
      }
    ],
    immediateMitigations: [
      "Verify if auth signing keys or JWKS endpoints were recently rotated without cached key refresh.",
      "Check client system clock skew."
    ],
    remediationSteps: [
      "Implement JWKS key caching with background refresh and multi-key grace period support.",
      "Ensure tokens include reasonable leeway (e.g. 60 seconds) for minor clock drifts."
    ]
  },

  // 8. High Latency & Slow Operations
  {
    id: 'latency-degradation',
    category: 'LATENCY_DEGRADATION',
    title: 'Latency Degradation & Slow Query SLA Breach',
    defaultSeverity: 'MEDIUM',
    matchRegex: /(High latency|statement_timeout|exceeding \d+ms|waited \d+ms|duration \d+ms|slow query)/i,
    rootCauseTemplate: (logs, service) =>
      `Heuristic evaluation detected elevated operation latencies in '${service}'. Requests or database statements exceeded configured duration thresholds, creating pipeline backpressure.`,
    diagnosticCommands: [
      {
        command: "kubectl top nodes",
        purpose: "Check CPU and memory saturation across Kubernetes worker nodes",
        safeToRun: true,
        category: 'KUBERNETES'
      }
    ],
    immediateMitigations: [
      "Check if slow statements can be indexed or canceled.",
      "Scale worker replicas horizontally if CPU throttled."
    ],
    remediationSteps: [
      "Analyze query EXPLAIN plans for missing table indexes or sequential table scans.",
      "Implement read-replica offloading for analytical queries."
    ]
  }
];

export function analyzeLogs(logs: LogEntry[]): AnalysisResult {
  if (!logs || logs.length === 0) {
    return createEmptyAnalysisResult();
  }

  // 1. Group logs by matched pattern rules
  const ruleMatchesMap = new Map<string, LogEntry[]>();
  const logsWithMatchedRules: LogEntry[] = logs.map(entry => {
    let matchedRuleId: string | undefined;

    for (const rule of PATTERN_RULES) {
      if (rule.matchRegex.test(entry.raw) || rule.matchRegex.test(entry.message)) {
        matchedRuleId = rule.id;
        const currentList = ruleMatchesMap.get(rule.id) || [];
        currentList.push(entry);
        ruleMatchesMap.set(rule.id, currentList);
        break;
      }
    }

    return matchedRuleId ? { ...entry, matchedPatternId: matchedRuleId } : entry;
  });

  // 2. Synthesize Incidents from matched patterns
  const incidents: Incident[] = [];
  const detectedPatternsList: Array<{
    id: string;
    title: string;
    count: number;
    severity: string;
    category: IncidentCategory;
  }> = [];

  for (const rule of PATTERN_RULES) {
    const matchedLogs = ruleMatchesMap.get(rule.id);
    if (!matchedLogs || matchedLogs.length === 0) continue;

    // Determine primary service
    const serviceCounts = new Map<string, number>();
    for (const log of matchedLogs) {
      const s = log.service || 'unknown';
      serviceCounts.set(s, (serviceCounts.get(s) || 0) + 1);
    }
    let primaryService = 'system';
    let maxCount = 0;
    serviceCounts.forEach((cnt, s) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        primaryService = s;
      }
    });

    // Time window calculation
    const timestamps = matchedLogs.map(l => l.timeUnix).filter(t => t > 0);
    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const durationSeconds = Math.max(1, Math.round((maxTime - minTime) / 1000));

    // Supporting evidence (exact lines)
    const supportingLogLines: SupportingEvidence[] = matchedLogs.slice(0, 15).map(l => ({
      lineNumber: l.lineNumber,
      timestamp: l.timestamp,
      message: l.message,
      raw: l.raw,
      severity: l.severity,
      service: l.service
    }));

    // Evidence sufficiency calculation
    const occurrenceCount = matchedLogs.length;
    let evidenceSufficiency: 'SUFFICIENT' | 'INSUFFICIENT' | 'MODERATE' = 'SUFFICIENT';
    let evidenceWarning: string | undefined;

    if (occurrenceCount < 2) {
      evidenceSufficiency = 'INSUFFICIENT';
      evidenceWarning = 'Only 1 log line matched this pattern. Evidence is limited; treat this hypothesis as preliminary.';
    } else if (occurrenceCount < 4) {
      evidenceSufficiency = 'MODERATE';
      evidenceWarning = 'Sparse occurrence count (2-3 lines). Multiple correlated lines would increase confidence.';
    }

    // Heuristic confidence calculation (transparently heuristic, NOT probability)
    // Formula: baseline 60 + occurrence boost (up to 25) + specific keywords boost (up to 10)
    let score = 65;
    if (occurrenceCount >= 10) score += 25;
    else if (occurrenceCount >= 5) score += 18;
    else if (occurrenceCount >= 3) score += 10;
    else if (occurrenceCount === 1) score -= 25;

    // Cap between 30 and 96
    const confidenceScore = Math.min(96, Math.max(30, score));
    const confidenceLabel = `${confidenceScore}% Heuristic Confidence (${occurrenceCount} matching signatures)`;
    const confidenceDisclaimer =
      'Heuristic estimate based on rule-matching frequency and signature precision. This is a triage hypothesis, not a mathematically verified certainty.';

    // Dynamic severity elevation if many occurrences
    let incidentSeverity = rule.defaultSeverity;
    if (occurrenceCount > 15 && incidentSeverity === 'HIGH') {
      incidentSeverity = 'CRITICAL';
    }

    const probableCause = rule.rootCauseTemplate(matchedLogs, primaryService);

    incidents.push({
      id: `inc-${rule.id}-${Date.now().toString(36)}`,
      title: rule.title,
      category: rule.category,
      severity: incidentSeverity,
      service: primaryService,
      occurrences: occurrenceCount,
      firstSeen: new Date(minTime).toISOString(),
      lastSeen: new Date(maxTime).toISOString(),
      durationSeconds,
      supportingLogLines,
      probableCause,
      confidenceScore,
      confidenceLabel,
      confidenceDisclaimer,
      evidenceSufficiency,
      evidenceWarning,
      diagnosticCommands: rule.diagnosticCommands,
      immediateMitigations: rule.immediateMitigations,
      remediationSteps: rule.remediationSteps,
      relatedIncidentIds: []
    });

    detectedPatternsList.push({
      id: rule.id,
      title: rule.title,
      count: occurrenceCount,
      severity: incidentSeverity,
      category: rule.category
    });
  }

  // Cross-reference related incidents
  for (let i = 0; i < incidents.length; i++) {
    for (let j = 0; j < incidents.length; j++) {
      if (i !== j) {
        // Correlated if same service or known cascade pairs
        const incA = incidents[i];
        const incB = incidents[j];
        if (
          incA.service === incB.service ||
          (incA.category === 'GATEWAY_TIMEOUT_503' && incB.category === 'RETRY_STORM') ||
          (incA.category === 'DATABASE_EXHAUSTION' && incB.category === 'CIRCUIT_BREAKER')
        ) {
          incA.relatedIncidentIds.push(incB.id);
        }
      }
    }
  }

  // Sort incidents by severity: CRITICAL > HIGH > MEDIUM > LOW
  const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  incidents.sort((a, b) => {
    const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (rankDiff !== 0) return rankDiff;
    return b.occurrences - a.occurrences;
  });

  // 3. Compute Summary Metrics
  let criticalCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const log of logs) {
    if (log.severity === 'CRITICAL') criticalCount++;
    else if (log.severity === 'ERROR') errorCount++;
    else if (log.severity === 'WARNING') warningCount++;
    else infoCount++;
  }

  const allTimestamps = logs.map(l => l.timeUnix).filter(t => t > 0);
  const minTime = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  const maxTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();
  const totalSeconds = Math.max(1, Math.round((maxTime - minTime) / 1000));

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = totalSeconds % 60;
  const timeSpanFormatted = minutes > 0 ? `${minutes}m ${remainingSecs}s` : `${remainingSecs}s`;

  // 4. Time Buckets for Volume Over Time chart
  const timeBuckets = generateTimeBuckets(logs, minTime, maxTime);

  // 5. Service Health Overview
  const serviceHealthList = computeServiceHealth(logs, incidents);

  return {
    summary: {
      totalLogs: logs.length,
      errorCount,
      warningCount,
      infoCount,
      criticalCount,
      incidentCount: incidents.length,
      serviceCount: serviceHealthList.length,
      earliestTimestamp: new Date(minTime).toISOString(),
      latestTimestamp: new Date(maxTime).toISOString(),
      timeSpanFormatted
    },
    logs: logsWithMatchedRules,
    incidents,
    timeBuckets,
    serviceHealthList,
    detectedPatterns: detectedPatternsList
  };
}

function generateTimeBuckets(logs: LogEntry[], minTime: number, maxTime: number): TimeBucket[] {
  const BUCKET_COUNT = 8;
  const duration = Math.max(1000, maxTime - minTime);
  const bucketSize = Math.max(1000, Math.ceil(duration / BUCKET_COUNT));

  const buckets: TimeBucket[] = [];
  for (let b = 0; b < BUCKET_COUNT; b++) {
    const bucketStart = minTime + b * bucketSize;
    const bucketDate = new Date(bucketStart);
    const hours = bucketDate.getUTCHours().toString().padStart(2, '0');
    const mins = bucketDate.getUTCMinutes().toString().padStart(2, '0');
    const secs = bucketDate.getUTCSeconds().toString().padStart(2, '0');
    const timeLabel = `${hours}:${mins}:${secs}`;

    buckets.push({
      timeLabel,
      timestamp: bucketStart,
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
      total: 0
    });
  }

  for (const log of logs) {
    if (log.timeUnix <= 0) continue;
    let bucketIndex = Math.floor((log.timeUnix - minTime) / bucketSize);
    if (bucketIndex >= BUCKET_COUNT) bucketIndex = BUCKET_COUNT - 1;
    if (bucketIndex < 0) bucketIndex = 0;

    const b = buckets[bucketIndex];
    if (b) {
      b.total++;
      if (log.severity === 'CRITICAL') b.critical++;
      else if (log.severity === 'ERROR') b.error++;
      else if (log.severity === 'WARNING') b.warning++;
      else b.info++;
    }
  }

  return buckets;
}

function computeServiceHealth(logs: LogEntry[], incidents: Incident[]): ServiceHealth[] {
  const serviceMap = new Map<
    string,
    {
      errorCount: number;
      warningCount: number;
      totalLogs: number;
      lastErrorTime?: string;
    }
  >();

  for (const log of logs) {
    const s = log.service || 'system';
    const current = serviceMap.get(s) || {
      errorCount: 0,
      warningCount: 0,
      totalLogs: 0
    };

    current.totalLogs++;
    if (log.severity === 'CRITICAL' || log.severity === 'ERROR') {
      current.errorCount++;
      current.lastErrorTime = log.timestamp;
    } else if (log.severity === 'WARNING') {
      current.warningCount++;
    }

    serviceMap.set(s, current);
  }

  const result: ServiceHealth[] = [];
  serviceMap.forEach((stats, serviceName) => {
    // Count incidents affecting this service
    const incCount = incidents.filter(i => i.service.includes(serviceName) || serviceName.includes(i.service)).length;

    let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    const errorRate = stats.totalLogs > 0 ? stats.errorCount / stats.totalLogs : 0;

    if (stats.errorCount > 0 || incCount > 0) {
      if (stats.errorCount > 8 || errorRate > 0.35 || incCount > 1) {
        status = 'CRITICAL';
      } else {
        status = 'DEGRADED';
      }
    }

    result.push({
      serviceName,
      status,
      errorCount: stats.errorCount,
      warningCount: stats.warningCount,
      totalLogs: stats.totalLogs,
      incidentCount: incCount,
      lastErrorTimestamp: stats.lastErrorTime
    });
  });

  // Sort: CRITICAL first, then DEGRADED, then HEALTHY
  const statusRank: Record<string, number> = { CRITICAL: 3, DEGRADED: 2, HEALTHY: 1 };
  result.sort((a, b) => {
    const diff = statusRank[b.status] - statusRank[a.status];
    if (diff !== 0) return diff;
    return b.errorCount - a.errorCount;
  });

  return result;
}

function createEmptyAnalysisResult(): AnalysisResult {
  return {
    summary: {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      criticalCount: 0,
      incidentCount: 0,
      serviceCount: 0,
      earliestTimestamp: '-',
      latestTimestamp: '-',
      timeSpanFormatted: '0s'
    },
    logs: [],
    incidents: [],
    timeBuckets: [],
    serviceHealthList: [],
    detectedPatterns: []
  };
}
