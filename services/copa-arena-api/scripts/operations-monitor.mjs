import {appendStepSummary,numeric,queryAnalytics,writeReport} from "../../ghost-club-api/scripts/analytics-client.mjs";

const result=await queryAnalytics(`
  SELECT
    sumIf(_sample_interval * double1, blob1 = 'arena_match_delivery_failed') AS delivery_failures,
    sumIf(_sample_interval * double1, blob1 = 'arena_result_write_failed') AS result_write_failures,
    sumIf(_sample_interval * double1, blob1 = 'arena_result_finalize_failed') AS finalize_failures,
    sumIf(_sample_interval * double1, blob1 = 'arena_practice_finalize_failed') AS practice_finalize_failures,
    sumIf(_sample_interval * double1, blob1 = 'arena_alarm_delay') AS delayed_alarms
  FROM copa_life_arena_events
  WHERE timestamp >= NOW() - INTERVAL '1' HOUR
`);
const row=result.rows[0]||{};
const metrics={
  delivery_failures:numeric(row.delivery_failures),
  result_write_failures:numeric(row.result_write_failures),
  finalize_failures:numeric(row.finalize_failures),
  practice_finalize_failures:numeric(row.practice_finalize_failures),
  delayed_alarms:numeric(row.delayed_alarms)
};
const alerts=Object.entries(metrics).filter(([,value])=>value>0).map(([name,value])=>`${name}: ${value.toFixed(0)}`);
const report={
  schema_version:1,
  generated_at:new Date().toISOString(),
  period_minutes:60,
  status:!result.configured?"not_configured":!result.available?"waiting_for_first_data":alerts.length?"alert":"healthy",
  metrics,
  alerts
};
writeReport(process.env.ARENA_MONITOR_OUTPUT||"outputs/arena/operations-monitor.json",report);
appendStepSummary(`
# COPA ARENA operations monitor

Status: **${report.status}**

Match delivery failures: ${metrics.delivery_failures.toFixed(0)}

Result write/finalize failures: ${(metrics.result_write_failures+metrics.finalize_failures+metrics.practice_finalize_failures).toFixed(0)}

Durable Object alarms delayed over five seconds: ${metrics.delayed_alarms.toFixed(0)}
${alerts.length?`\nAlerts: ${alerts.join("; ")}`:""}
`);
if(alerts.length)process.exitCode=1;
