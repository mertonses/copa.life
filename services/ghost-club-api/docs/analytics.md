# Product analytics schema

The `copa_life_product_events` dataset contains allowlisted, aggregate gameplay events.

`blob1..20`:

1. event name
2. platform
3. locale
4. game country
5. outcome
6. detail
7. page path
8. app/build version
9. final model version
10. coarse power-gap band
11. final end type
12. tactic
13. schema version
14. chairman
15. formation
16. style
17. reward
18. card kind
19. economy band
20. tournament, group-matchday and Side Field dimensions

`double1..4` are count, round, schema version and a coarse numeric fingerprint of the daily rotating random visitor token. The token rotates at UTC day boundaries, is not written as an Analytics Engine index, and is only used with `COUNT(DISTINCT double4)` for aggregate DAU/WAU. It is not joined to Ghost, Arena, leaderboard, save, account or device data.

Useful queries:

```sql
SELECT COUNT(DISTINCT double4) AS daily_active
FROM copa_life_product_events
WHERE timestamp >= NOW() - INTERVAL '1' DAY
  AND blob1 = 'session_started'
```

```sql
SELECT COUNT(DISTINCT double4) AS weekly_active
FROM copa_life_product_events
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob1 = 'session_started'
```
