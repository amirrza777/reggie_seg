#!/usr/bin/env node

const apiBaseUrl = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const joinCode = (process.env.JOIN_CODE ?? "").trim();
const requests = parsePositiveInt(process.env.REQUESTS, 200);
const concurrency = Math.max(1, Math.min(parsePositiveInt(process.env.CONCURRENCY, 25), requests));
const timeoutMs = parsePositiveInt(process.env.TIMEOUT_MS, 10_000);
const rotateForwardedIp = process.env.ROTATE_X_FORWARDED_FOR === "true";
const maxErrorRate = parseFloat(process.env.MAX_ERROR_RATE ?? "0.1");

const authTokens = buildAuthTokens();

if (!joinCode) {
  console.error("Missing JOIN_CODE. Example: JOIN_CODE=ABCD2345");
  process.exit(1);
}

if (authTokens.length === 0) {
  console.error("Missing auth tokens. Set AUTH_TOKEN or AUTH_TOKENS (comma-separated).");
  process.exit(1);
}

console.log(`[loadtest:modulejoin] target=${apiBaseUrl}/module-join/join`);
console.log(
  `[loadtest:modulejoin] requests=${requests} concurrency=${concurrency} tokens=${authTokens.length} timeoutMs=${timeoutMs}`,
);

const startedAt = Date.now();
const outcomes = [];
let nextIndex = 0;

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const durationMs = Date.now() - startedAt;
const summary = summarize(outcomes, durationMs);

console.log("\n[loadtest:modulejoin] Summary");
console.log(`- total requests: ${summary.total}`);
console.log(`- duration: ${summary.durationMs}ms`);
console.log(`- throughput: ${summary.requestsPerSecond.toFixed(2)} req/s`);
console.log(`- success (2xx): ${summary.successCount}`);
console.log(`- failures (non-2xx + network): ${summary.failureCount}`);
console.log(`- error rate: ${(summary.errorRate * 100).toFixed(2)}%`);
console.log(`- latency p50: ${summary.p50Ms}ms`);
console.log(`- latency p95: ${summary.p95Ms}ms`);
console.log(`- latency max: ${summary.maxMs}ms`);
console.log("- status counts:");
for (const [status, count] of summary.statusCounts) {
  console.log(`  - ${status}: ${count}`);
}

if (summary.errorRate > maxErrorRate) {
  console.error(
    `[loadtest:modulejoin] Failed threshold: error rate ${(summary.errorRate * 100).toFixed(2)}% > ${(maxErrorRate * 100).toFixed(2)}%`,
  );
  process.exitCode = 1;
}

async function worker() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= requests) return;
    outcomes[index] = await runRequest(index);
  }
}

async function runRequest(index) {
  const token = authTokens[index % authTokens.length];
  const headers = {
    "content-type": "application/json",
    authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
  if (rotateForwardedIp) {
    headers["x-forwarded-for"] = syntheticForwardedIp(index);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(`${apiBaseUrl}/module-join/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: joinCode }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    return { status: response.status, latencyMs };
  } catch {
    const latencyMs = Date.now() - started;
    return { status: "NETWORK_ERROR", latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

function buildAuthTokens() {
  const raw = process.env.AUTH_TOKENS ?? process.env.AUTH_TOKEN ?? "";
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function syntheticForwardedIp(index) {
  const octet3 = Math.floor(index / 250) % 250;
  const octet4 = (index % 250) + 1;
  return `10.0.${octet3}.${octet4}`;
}

function summarize(results, durationMs) {
  const statusCounts = new Map();
  const latencies = [];
  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    const statusKey = String(result?.status ?? "UNKNOWN");
    statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
    const latencyMs = Number.isFinite(result?.latencyMs) ? result.latencyMs : 0;
    latencies.push(latencyMs);

    if (typeof result?.status === "number" && result.status >= 200 && result.status < 300) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  latencies.sort((a, b) => a - b);
  const p50Ms = percentile(latencies, 0.5);
  const p95Ms = percentile(latencies, 0.95);
  const maxMs = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
  const total = results.length;
  const errorRate = total > 0 ? failureCount / total : 0;
  const requestsPerSecond = durationMs > 0 ? (total * 1000) / durationMs : 0;

  return {
    total,
    durationMs,
    successCount,
    failureCount,
    errorRate,
    requestsPerSecond,
    p50Ms,
    p95Ms,
    maxMs,
    statusCounts: [...statusCounts.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.max(0, Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * p) - 1));
  return sortedValues[index];
}
