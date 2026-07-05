# Copa Agent Campaign Report
**Session:** `d0a4c513` | **Generated:** 2026-07-04T12:58:00.991Z

## Summary
| Metric | Value |
|--------|-------|
| Runs | 5 |
| Wins | 0 (0%) |
| Losses | 1 |
| Sacks | 0 |
| Chairs unlocked | babacan |
| All chairs unlocked | no |
| Issues (critical/major/minor/obs) | 0/1/0/1 |

## Coverage
- [x] screen:intro
- [x] screen:draft
- [x] screen:hub
- [ ] screen:sim
- [x] screen:result
- [x] screen:modal
- [x] chair:babacan
- [ ] chair:leydi
- [ ] chair:pinti
- [ ] chair:sansasyoncu
- [ ] chair:torpilci
- [ ] chair:cilgin
- [ ] shout:push
- [ ] shout:calm
- [ ] shout:hold
- [ ] shout:more
- [x] reward:0
- [x] reward:1
- [ ] theme:dark
- [x] theme:light
- [ ] outcome:win
- [x] outcome:loss
- [ ] outcome:sacked
- [ ] allChairsUnlocked

## Issues
### [MAJOR] Hub loop did not reach result
**Category:** bug | **Screen:** hub | **Occurrences:** 4 | **Confirmed:** true

40 iterations without reaching result screen.

**Reproduction steps:**
1. Play through hub


---
### [OBSERVATION] Unclassified modal encountered
**Category:** ux | **Screen:** modal | **Occurrences:** 4 | **Confirmed:** true

Modal with unrecognised content appeared: "Oyun Anlayışını Seçküçük stil bonusunu belirlerGegenpressingkoşulsuz +2 güçKontr"

**Reproduction steps:**
1. Play through hub and observe modals

