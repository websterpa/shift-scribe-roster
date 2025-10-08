# Release Checklist - No-Regressions Protocol

## 1. Code Freeze
- [ ] Create release branch: `git checkout -b release/$(date +%Y-%m-%d)`
- [ ] Tag current version: `git tag -a v1.x.x -m "Release v1.x.x"`
- [ ] Push branch and tags: `git push origin release/YYYY-MM-DD --tags`

## 2. Environment Pins
- [x] Package versions locked in `package-lock.json` (read-only, managed by npm)
- [ ] Document feature flags in `.env.example`
- [ ] Export seed data: `npx tsx scripts/export-seed-data.ts`
- [ ] Commit seed data snapshots to repo

## 3. Snapshot Tests
Run regression snapshot tests:
```bash
npm test -- -t @snapshot
```

Expected outcomes:
- ✅ `October 2025 12h roster: consistent staff counts and coverage`
- ✅ `8h roster: E/L/N coverage consistency`
- ✅ No duplicate assignments per staff per day
- ✅ Coverage bars within expected ranges

Files: `src/__tests__/snapshot.roster.test.ts`

## 4. WTD Rules Tests
Run comprehensive WTD compliance tests:
```bash
npm test -- -t @wtd-rules
```

Expected outcomes:
- ✅ 11-hour daily rest validation
- ✅ Max consecutive working days detection
- ✅ Night shift caps enforced
- ✅ Weekly hours limits respected
- ✅ Rest enforcement after violations

Files: `src/__tests__/wtd.rules.comprehensive.test.ts`

## 5. WTD Acceptance Tests
Run WTD acceptance tests (locks rostering behavior):
```bash
npm test -- -t @wtd-acceptance
```

Expected outcomes:
- ✅ Coverage exactness (all required shifts filled)
- ✅ Rest-matrix tests (no invalid L→E, N→E, N→L transitions)
- ✅ Weekly rest (≤6 working days per 7-day window)
- ✅ 48-hour average compliance (over reference period)
- ✅ Night average (≤8h per 24h period)
- ✅ Utilisation (all staff used)
- ✅ Fairness (std-dev within threshold)
- ✅ Consecutive days & nights limits enforced

Files: `src/__tests__/wtd.acceptance.test.ts`

## 6. WTD Generator Tests
Run WTD generator tests:
```bash
npm test -- -t @wtd-generator
```

Expected outcomes:
- ✅ Generates roster for 11 staff over 28 days
- ✅ Ensures all staff are utilized
- ✅ Respects night eligibility
- ✅ Respects availability constraints
- ✅ Achieves fair distribution
- ✅ Reports violations
- ✅ Seeds night blocks first
- ✅ Calculates coverage correctly

Files: `src/__tests__/wtd.generator.test.ts`

## 7. E2E Smoke Tests
Run end-to-end smoke tests:
```bash
npx playwright test e2e/smoke.roster-generation.spec.ts
```

Expected outcomes:
- ✅ Generate October 2025 roster and verify UI renders
- ✅ Filters work on generated roster
- ✅ Export functionality works
- ✅ No duplicate assignments per staff per day
- ✅ Coverage bars render correctly

Files: `e2e/smoke.roster-generation.spec.ts`

## 8. Full CI Pipeline
Run complete CI pipeline locally:
```bash
npm run lint && npm run typecheck && npm test && npm run e2e
```

All must exit with code 0.

## 9. Branch Protection (GitHub Settings)
Configure branch protection for `main`:
- [ ] Require pull request reviews (1+ approver)
- [ ] Require status checks to pass:
  - `lint`
  - `typecheck`
  - `test`
  - `e2e`
- [ ] Require branches to be up to date
- [ ] Include administrators in restrictions

Steps:
1. Go to GitHub repo → Settings → Branches
2. Add rule for `main` branch
3. Enable all required checks

## 10. Roll-Back Plan
- [ ] Tag Docker image: `docker tag app:latest app:v1.x.x`
- [ ] Push to registry: `docker push registry/app:v1.x.x`
- [ ] Document rollback command:
  ```bash
  # Revert to previous version
  git revert <commit-hash>
  # OR checkout previous tag
  git checkout v1.x.x-previous
  ```
- [ ] Keep build artifacts for last 3 releases

## Verification Matrix

| Test Category | Command | Expected Result | Status |
|--------------|---------|----------------|--------|
| Unit Tests | `npm test` | All pass | ⬜ |
| Snapshot Tests | `npm test -- -t @snapshot` | All pass | ⬜ |
| WTD Rules | `npm test -- -t @wtd-rules` | All pass | ⬜ |
| WTD Acceptance | `npm test -- -t @wtd-acceptance` | All pass | ⬜ |
| WTD Generator | `npm test -- -t @wtd-generator` | All pass | ⬜ |
| E2E Smoke | `npx playwright test smoke` | All pass | ⬜ |
| Lint | `npm run lint` | 0 errors | ⬜ |
| TypeCheck | `npm run typecheck` | 0 errors | ⬜ |

## WTD Compliance Checklist

Legal requirements verified:
- [x] 11 hours uninterrupted daily rest between shifts
- [x] Weekly rest: 24h in each 7 days
- [x] 48-hour average weekly limit (over 17 weeks)
- [x] Night work average ≤ 8 hours per 24h period
- [x] Max consecutive days (6 default)
- [x] Max consecutive nights (3 default)
- [x] Days off after night block (2 default)

## Sign-off
- [ ] All tests passing
- [ ] Seed data exported and committed
- [ ] Release notes prepared
- [ ] Stakeholders notified
- [ ] Rollback plan tested
- [ ] WTD compliance verified

**Release Manager:** _________________  
**Date:** _________________  
**Version:** _________________
