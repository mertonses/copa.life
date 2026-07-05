# Copa Agent Campaign Report
**Session:** `83d5d5c4` | **Generated:** 2026-07-04T12:39:38.871Z

## Summary
| Metric | Value |
|--------|-------|
| Runs | 5 |
| Wins | 0 (0%) |
| Losses | 2 |
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
- [x] shout:push
- [x] shout:calm
- [x] shout:hold
- [x] shout:more
- [x] reward:0
- [ ] reward:1
- [ ] theme:dark
- [x] theme:light
- [ ] outcome:win
- [x] outcome:loss
- [ ] outcome:sacked
- [ ] allChairsUnlocked

## Issues
### [MAJOR] Hub loop did not reach result
**Category:** bug | **Screen:** hub | **Occurrences:** 3 | **Confirmed:** true

40 iterations without reaching result screen.

**Reproduction steps:**
1. Play through hub


---
### [OBSERVATION] Unclassified modal encountered
**Category:** ux | **Screen:** modal | **Occurrences:** 2 | **Confirmed:** true

Modal with unrecognised content appeared: "Risk/Ödül DraftıGüçlü ödül, gerçek bedel. Gerek yoksa pas geç.Yüksek TempoBu tur"

**Reproduction steps:**
1. Play through hub and observe modals

