/**
 * Built-in Realistic Log Datasets for Demo Mode
 */
import { SampleDataset } from '../types';

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'db-pool-exhaustion',
    name: 'DB Connection Pool Exhaustion & Deadlocks',
    shortDesc: 'Database connection pool starvation, HikariCP timeouts, and deadlock cascade in checkout.',
    fullDesc: 'Simulates a traffic spike during a flash checkout. The primary PostgreSQL connection pool maxes out at 100 connections. Client threads block, wait 30s, and throw pool timeouts, triggering concurrent deadlocks on order tables and cascaded HTTP 500 responses.',
    primaryService: 'checkout-service / postgres-primary',
    expectedPattern: 'Connection Pool Timeout & Deadlock',
    logText: `2026-10-14T21:40:02.104Z [INFO] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 200 48ms client_ip=198.51.100.12 user_id=usr_9021
2026-10-14T21:40:08.512Z [INFO] [checkout-service] Initializing transaction for cart_88291 item_count=3 total_cents=12400
2026-10-14T21:40:15.301Z [INFO] [checkout-service] Acquired DB connection from HikariPool-1 [active=48, idle=52, total=100]
2026-10-14T21:40:32.418Z [WARN] [postgres-primary] High connection count warning: 94 of 100 active connections in use
2026-10-14T21:40:45.902Z [WARN] [checkout-service] Connection pool acquiring delay: thread [http-nio-8080-exec-42] waited 1420ms
2026-10-14T21:41:01.215Z [INFO] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 200 120ms client_ip=198.51.100.44 user_id=usr_9033
2026-10-14T21:41:10.004Z [ERROR] [postgres-primary] FATAL: remaining connection slots are reserved for non-replication superuser connections
2026-10-14T21:41:12.671Z [ERROR] [checkout-service] HikariPool-1 - Connection is not available, request timed out after 30005ms (active=100, idle=0, waiting=28)
2026-10-14T21:41:12.675Z [ERROR] [checkout-service] org.springframework.dao.CannotAcquireLockException: Could not open JPA EntityManager for transaction
2026-10-14T21:41:13.109Z [ERROR] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 500 30052ms client_ip=198.51.100.78 upstream_connect_status=TIMEOUT
2026-10-14T21:41:14.220Z [ERROR] [checkout-service] HikariPool-1 - Connection is not available, request timed out after 30002ms (active=100, idle=0, waiting=41)
2026-10-14T21:41:14.882Z [ERROR] [inventory-service] Error acquiring lock on inventory_sku_49821: connection checkout timeout from pool
2026-10-14T21:41:15.012Z [ERROR] [postgres-primary] ERROR: deadlock detected between PID 8492 and PID 8511 on table "orders"
2026-10-14T21:41:15.015Z [ERROR] [postgres-primary] DETAIL: Process 8492 waits for ShareLock on transaction 9410294; blocked by process 8511.
2026-10-14T21:41:15.018Z [ERROR] [postgres-primary] HINT: See server log for query details. Where: while updating tuple (412,18) in relation "order_items"
2026-10-14T21:41:16.411Z [ERROR] [checkout-service] Transaction rolled back for order_77218 due to DeadlockDetectedException
2026-10-14T21:41:18.990Z [ERROR] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 500 30021ms client_ip=203.0.113.19 upstream_status=500
2026-10-14T21:41:20.318Z [ERROR] [checkout-service] HikariPool-1 - Connection is not available, request timed out after 30008ms (active=100, idle=0, waiting=56)
2026-10-14T21:41:22.404Z [WARN] [postgres-primary] pg_stat_activity shows 38 transactions idle in transaction >60s
2026-10-14T21:41:25.119Z [ERROR] [checkout-service] Failed to execute checkout pipeline: Database connection timeout
2026-10-14T21:41:28.704Z [ERROR] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 500 30018ms client_ip=198.51.100.99 upstream_status=500
2026-10-14T21:41:35.412Z [CRITICAL] [checkout-service] Circuit breaker [PostgresPrimary] state changed to OPEN - 92% failure rate in 60s window
2026-10-14T21:41:36.002Z [ERROR] [checkout-service] Fallback fast-fail triggered for user_req_1082: Service Unavailable
2026-10-14T21:41:38.192Z [ERROR] [ingress-nginx] POST /api/v1/checkout HTTP/1.1 503 4ms client_ip=198.51.100.104 response="Circuit open"
2026-10-14T21:41:45.311Z [INFO] [checkout-service] DB Pool stats: active=98, idle=2, waiting=74, max_lifetime=1800000ms
2026-10-14T21:42:01.092Z [WARN] [postgres-primary] Auto-canceling query PID 8492 due to statement_timeout exceeding 60000ms
2026-10-14T21:42:05.411Z [INFO] [checkout-service] Releasing zombie connection PID 8492 to pool
2026-10-14T21:42:20.180Z [INFO] [checkout-service] Circuit breaker [PostgresPrimary] entering HALF-OPEN test state`
  },
  {
    id: 'api-503-retry-storm',
    name: 'Microservices Cascade Failure & HTTP 503 Retry Storm',
    shortDesc: 'Upstream gateway 504 timeout, non-jittered retry floods, and worker thread pool saturation.',
    fullDesc: 'A third-party payment partner API begins dropping requests, returning HTTP 504 Gateway Timeouts. Downstream billing workers retry synchronously without exponential jitter, creating a thundering herd. Thread pools queue to maximum capacity, tripping circuit breakers and cascading HTTP 503s.',
    primaryService: 'payment-gateway / api-gateway',
    expectedPattern: 'HTTP 504 Timeout & 503 Retry Storm',
    logText: `2026-10-14T18:10:01.102Z [INFO] [api-gateway] Request dispatch: POST /v2/payments/charge payload_size=348b
2026-10-14T18:10:04.290Z [INFO] [payment-gateway] Forwarding payment txn_49182 to external provider [StripeMock-Prod]
2026-10-14T18:10:15.801Z [WARN] [payment-gateway] Upstream latency warning: POST https://partner.stripe-mock.internal/charges elapsed=11200ms
2026-10-14T18:10:34.902Z [ERROR] [payment-gateway] HTTP 504 Gateway Timeout while proxying to partner.stripe-mock.internal/charges (threshold=30000ms)
2026-10-14T18:10:35.001Z [WARN] [billing-worker] Payment execution failed for order_4019: HTTP 504. Scheduling immediate retry 1/5
2026-10-14T18:10:35.210Z [INFO] [billing-worker] Retrying txn_49182 immediately (attempt 1 of 5)
2026-10-14T18:10:48.319Z [ERROR] [payment-gateway] HTTP 504 Gateway Timeout while proxying to partner.stripe-mock.internal/charges
2026-10-14T18:10:48.400Z [WARN] [billing-worker] Payment retry 1 failed. Scheduling immediate retry 2/5 (backoff: 500ms, no jitter)
2026-10-14T18:10:49.002Z [INFO] [billing-worker] Retrying txn_49182 immediately (attempt 2 of 5)
2026-10-14T18:10:55.114Z [WARN] [api-gateway] Worker pool saturation: PaymentWorkerPool queue size reached 320/500
2026-10-14T18:11:05.418Z [ERROR] [payment-gateway] HTTP 504 Gateway Timeout: connection reset by peer partner.stripe-mock.internal
2026-10-14T18:11:05.501Z [ERROR] [billing-worker] Exponential backoff maxed out: retry 4 of 5 failed for txn_49182
2026-10-14T18:11:06.102Z [ERROR] [api-gateway] Thread pool queue full for PaymentWorkerPool (size=200, queued=500, rejected=84)
2026-10-14T18:11:06.105Z [ERROR] [api-gateway] RejectedExecutionException: Task org.platform.PaymentTask rejected from java.util.concurrent.ThreadPoolExecutor
2026-10-14T18:11:07.411Z [CRITICAL] [payment-gateway] Circuit breaker [PaymentBreaker] state transitioned from CLOSED to OPEN
2026-10-14T18:11:07.415Z [CRITICAL] [payment-gateway] Circuit breaker trip reason: Consecutive timeouts exceeded failure rate threshold 75%
2026-10-14T18:11:08.204Z [ERROR] [api-gateway] HTTP 503 Service Unavailable: circuit breaker [PaymentBreaker] is OPEN for upstream payment-gateway
2026-10-14T18:11:09.312Z [ERROR] [api-gateway] HTTP 503 Service Unavailable returned to client 192.0.2.14 on POST /v2/payments/charge
2026-10-14T18:11:10.044Z [ERROR] [api-gateway] HTTP 503 Service Unavailable returned to client 192.0.2.88 on POST /v2/payments/charge
2026-10-14T18:11:12.780Z [WARN] [billing-worker] Thundering herd detected: 142 concurrent retry jobs queued in Redis retry-queue:payments
2026-10-14T18:11:15.901Z [ERROR] [api-gateway] HTTP 503 Service Unavailable: short-circuiting 64 incoming checkout payment requests
2026-10-14T18:11:20.104Z [INFO] [payment-gateway] Health check probe sent to partner.stripe-mock.internal/healthz - timeout after 5000ms
2026-10-14T18:11:35.210Z [WARN] [payment-gateway] Partner status ping: HTTP 502 Bad Gateway from Cloudflare Edge for partner.stripe-mock.internal
2026-10-14T18:12:00.002Z [INFO] [api-gateway] Rate limiter throttling active: shedding 40% of non-critical payment retries`
  },
  {
    id: 'memory-oom-crash',
    name: 'Node/JVM Memory Pressure & OOM Crash',
    shortDesc: 'Heap saturation above 95%, GC pauses over 4 seconds, and Kubernetes OOMKilled Signal 137.',
    fullDesc: 'A bulk search document re-indexing batch consumes unbounded memory in search-indexer. Garbage collection pauses surge to multi-second Stop-The-World stalls, culminating in an OutOfMemoryError and kernel SIGKILL (OOMKilled - Signal 137) followed by container restart flaps.',
    primaryService: 'search-indexer / k8s-kubelet',
    expectedPattern: 'Heap Starvation & OOMKilled (Signal 137)',
    logText: `2026-10-14T14:02:11.002Z [INFO] [search-indexer] Batch job batch_idx_991 started: processing 250000 catalog documents
2026-10-14T14:02:45.312Z [INFO] [search-indexer] Chunk 1/10 completed (25000 docs). JVM Heap: 412MB / 1024MB (40.2%)
2026-10-14T14:03:12.890Z [INFO] [search-indexer] Chunk 3/10 completed (75000 docs). JVM Heap: 780MB / 1024MB (76.1%)
2026-10-14T14:03:30.104Z [WARN] [search-indexer] High memory watermark exceeded: heap 91.4% (936MB/1024MB)
2026-10-14T14:03:42.501Z [WARN] [search-indexer] Garbage collector G1 Young Generation pause duration: 840ms (exceeds target 200ms)
2026-10-14T14:04:01.912Z [WARN] [search-indexer] High memory watermark exceeded: heap 96.2% (985MB/1024MB)
2026-10-14T14:04:15.302Z [WARN] [search-indexer] Concurrent mark cycle failed to reclaim sufficient heap. Triggering Full GC
2026-10-14T14:04:19.610Z [WARN] [search-indexer] Long GC pause detected: Stop-The-World duration 4280ms - threads frozen
2026-10-14T14:04:22.001Z [WARN] [k8s-kubelet] Liveness probe failed for pod search-indexer-prod-789a: HTTP probe failed with status 504 (timeout)
2026-10-14T14:04:24.110Z [ERROR] [search-indexer] java.lang.OutOfMemoryError: Java heap space
2026-10-14T14:04:24.114Z [ERROR] [search-indexer] Exception in thread "batch-worker-3" java.lang.OutOfMemoryError: Java heap space
2026-10-14T14:04:24.116Z [ERROR] [search-indexer] \tat org.elasticsearch.common.bytes.BytesArray.<init>(BytesArray.java:38)
2026-10-14T14:04:24.118Z [ERROR] [search-indexer] \tat org.platform.indexer.BatchIngestor.processChunk(BatchIngestor.java:184)
2026-10-14T14:04:24.120Z [ERROR] [search-indexer] Dumping heap to /var/log/dumps/java_pid1.hprof ...
2026-10-14T14:04:25.402Z [CRITICAL] [k8s-kubelet] Kubelet: Container search-indexer-prod-789a was killed by OS kernel (OOMKilled - Signal 137)
2026-10-14T14:04:25.405Z [CRITICAL] [k8s-kubelet] Memory limit 1073741824 bytes (1024Mi) exceeded. Peak usage: 1073807360 bytes
2026-10-14T14:04:27.102Z [INFO] [k8s-kubelet] Pulling container image registry.internal/search-indexer:v2.14.0
2026-10-14T14:04:30.910Z [INFO] [search-indexer] Container started (restartCount: 1). Initializing JVM with -Xmx1024m
2026-10-14T14:04:35.002Z [WARN] [k8s-kubelet] Pod search-indexer-prod-789a is entering CrashLoopBackOff: back-off 10s restarting failed container
2026-10-14T14:04:45.312Z [INFO] [search-indexer] Resuming uncommitted batches from checkpoint WAL offset 89210
2026-10-14T14:04:58.201Z [WARN] [search-indexer] Heap rapid growth warning: 620MB allocated within 12 seconds of boot`
  }
];
