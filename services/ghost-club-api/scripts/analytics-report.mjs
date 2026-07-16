import { appendStepSummary, numeric, queryAnalytics, writeReport } from "./analytics-client.mjs";

const output=process.env.ANALYTICS_REPORT_OUTPUT||"outputs/analytics/weekly.json";
const generatedAt=new Date().toISOString();
const eventOrder=["session_started","draft_started","xi_completed","run_finished","profile_open_error"];

const [funnel,countries,profileErrors,worker,workerRoutes]=await Promise.all([queryAnalytics(`
  SELECT blob1 AS event, SUM(_sample_interval * double1) AS total
  FROM copa_life_product_events
  WHERE timestamp >= NOW() - INTERVAL '7' DAY
    AND blob1 IN ('${eventOrder.join("','")}')
  GROUP BY event
`),queryAnalytics(`
  SELECT blob4 AS game_country, SUM(_sample_interval * double1) AS completed_runs
  FROM copa_life_product_events
  WHERE timestamp >= NOW() - INTERVAL '7' DAY AND blob1 = 'run_finished'
  GROUP BY game_country ORDER BY completed_runs DESC LIMIT 20
`),queryAnalytics(`
  SELECT blob8 AS build_version, blob6 AS detail, SUM(_sample_interval * double1) AS errors
  FROM copa_life_product_events
  WHERE timestamp >= NOW() - INTERVAL '7' DAY AND blob1 = 'profile_open_error'
  GROUP BY build_version, detail ORDER BY errors DESC LIMIT 20
`),queryAnalytics(`
  SELECT
    SUM(_sample_interval * double1) AS requests,
    sumIf(_sample_interval * double1, blob3 = '5xx') AS server_errors,
    SUM(_sample_interval * double2) / SUM(_sample_interval * double1) AS avg_latency_ms
  FROM copa_life_worker_health
  WHERE timestamp >= NOW() - INTERVAL '7' DAY
`),queryAnalytics(`
  SELECT blob1 AS route, SUM(_sample_interval * double1) AS requests,
    sumIf(_sample_interval * double1, blob3 = '5xx') AS server_errors
  FROM copa_life_worker_health
  WHERE timestamp >= NOW() - INTERVAL '7' DAY
  GROUP BY route ORDER BY requests DESC
`)]);

const queries=[funnel,countries,profileErrors,worker,workerRoutes];
const configured=queries.every(query=>query.configured);
const ready=queries.every(query=>query.available);
const totals=Object.fromEntries(eventOrder.map(event=>[event,0]));
for(const row of funnel.rows)if(Object.hasOwn(totals,row.event))totals[row.event]=numeric(row.total);
const sessions=totals.session_started;
const workerSummary=worker.rows[0]||{};
const report={
  schema_version:1,
  generated_at:generatedAt,
  period_days:7,
  status:!configured?"not_configured":ready?"ready":"waiting_for_first_data",
  funnel:{
    ...totals,
    draft_rate:sessions?totals.draft_started/sessions:0,
    xi_rate:sessions?totals.xi_completed/sessions:0,
    completion_rate:sessions?totals.run_finished/sessions:0,
    profile_error_rate:sessions?totals.profile_open_error/sessions:0
  },
  completed_runs_by_country:countries.rows.map(row=>({game_country:row.game_country||"unknown",completed_runs:numeric(row.completed_runs)})),
  profile_errors_by_build:profileErrors.rows.map(row=>({build_version:row.build_version||"unknown",detail:row.detail||"unknown",errors:numeric(row.errors)})),
  worker:{requests:numeric(workerSummary.requests),server_errors:numeric(workerSummary.server_errors),avg_latency_ms:numeric(workerSummary.avg_latency_ms),routes:workerRoutes.rows.map(row=>({route:row.route,requests:numeric(row.requests),server_errors:numeric(row.server_errors)}))}
};
writeReport(output,report);
const percent=value=>`${(value*100).toFixed(1)}%`;
appendStepSummary(`
# copa.life weekly KPI report

Status: **${report.status}**

Period: last 7 days

Generated: ${generatedAt}

| KPI | Value |
| --- | ---: |
| Sessions | ${totals.session_started.toFixed(0)} |
| Draft starts | ${totals.draft_started.toFixed(0)} (${percent(report.funnel.draft_rate)}) |
| Completed XI | ${totals.xi_completed.toFixed(0)} (${percent(report.funnel.xi_rate)}) |
| Completed runs | ${totals.run_finished.toFixed(0)} (${percent(report.funnel.completion_rate)}) |
| Profile open errors | ${totals.profile_open_error.toFixed(0)} (${percent(report.funnel.profile_error_rate)}) |
| Worker requests | ${report.worker.requests.toFixed(0)} |
| Worker 5xx | ${report.worker.server_errors.toFixed(0)} |
| Worker average latency | ${report.worker.avg_latency_ms.toFixed(1)} ms |
`);
