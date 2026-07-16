import { appendStepSummary, numeric, queryAnalytics, writeReport } from "./analytics-client.mjs";

const numberFromEnv=(name,fallback)=>{const raw=String(process.env[name]||"").trim();if(!raw)return fallback;const value=Number(raw);return Number.isFinite(value)&&value>=0?value:fallback;};
const thresholds={
  profile_error_min_count:numberFromEnv("PROFILE_ERROR_MIN_COUNT",5),
  profile_error_rate:numberFromEnv("PROFILE_ERROR_RATE",0.05),
  worker_5xx_min_count:numberFromEnv("WORKER_5XX_MIN_COUNT",5),
  worker_5xx_rate:numberFromEnv("WORKER_5XX_RATE",0.02)
};
const [product,worker]=await Promise.all([queryAnalytics(`
  SELECT
    sumIf(_sample_interval * double1, blob1 = 'session_started') AS sessions,
    sumIf(_sample_interval * double1, blob1 = 'profile_open_error') AS profile_errors
  FROM copa_life_product_events
  WHERE timestamp >= NOW() - INTERVAL '1' HOUR
`),queryAnalytics(`
  SELECT
    SUM(_sample_interval * double1) AS requests,
    sumIf(_sample_interval * double1, blob3 = '5xx') AS server_errors
  FROM copa_life_worker_health
  WHERE timestamp >= NOW() - INTERVAL '1' HOUR
`)]);
const productRow=product.rows[0]||{},workerRow=worker.rows[0]||{};
const metrics={sessions:numeric(productRow.sessions),profile_errors:numeric(productRow.profile_errors),worker_requests:numeric(workerRow.requests),worker_5xx:numeric(workerRow.server_errors)};
metrics.profile_error_rate=metrics.sessions?metrics.profile_errors/metrics.sessions:metrics.profile_errors?1:0;
metrics.worker_5xx_rate=metrics.worker_requests?metrics.worker_5xx/metrics.worker_requests:0;
const configured=product.configured&&worker.configured;
const ready=product.available&&worker.available;
const alerts=[];
if(ready&&metrics.profile_errors>=thresholds.profile_error_min_count&&metrics.profile_error_rate>=thresholds.profile_error_rate)alerts.push(`profile_open_error rate ${(metrics.profile_error_rate*100).toFixed(1)}%`);
if(ready&&metrics.worker_5xx>=thresholds.worker_5xx_min_count&&metrics.worker_5xx_rate>=thresholds.worker_5xx_rate)alerts.push(`Worker 5xx rate ${(metrics.worker_5xx_rate*100).toFixed(1)}%`);
const report={schema_version:1,generated_at:new Date().toISOString(),period_minutes:60,status:!configured?"not_configured":!ready?"waiting_for_first_data":alerts.length?"alert":"healthy",thresholds,metrics,alerts};
writeReport(process.env.ANALYTICS_MONITOR_OUTPUT||"outputs/analytics/monitor.json",report);
appendStepSummary(`
# copa.life analytics monitor

Status: **${report.status}**

Sessions: ${metrics.sessions.toFixed(0)}

Profile errors: ${metrics.profile_errors.toFixed(0)} (${(metrics.profile_error_rate*100).toFixed(1)}%)

Worker requests: ${metrics.worker_requests.toFixed(0)}

Worker 5xx: ${metrics.worker_5xx.toFixed(0)} (${(metrics.worker_5xx_rate*100).toFixed(1)}%)
${alerts.length?`\nAlerts: ${alerts.join("; ")}`:""}
`);
if(alerts.length)process.exitCode=1;
