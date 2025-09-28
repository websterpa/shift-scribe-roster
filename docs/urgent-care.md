# Urgent Care MVP Stabilization

## Overview

This document describes the token contract and system stabilization for the Urgent Care roster management system.

## Tokens Contract

The system uses single-character tokens for shift codes, enforced at database level:

- **D**: Day (12h system)
- **E**: Early (8h system) 
- **L**: Late (8h system)
- **N**: Night (both systems)
- **R**: Rest/Off/Leave
- **S**: Sickness

### Key Rules

1. **Write Time**: Only tokens (D,E,L,N,R,S) are written to `shift_code` column
2. **Display Time**: Use `LABEL_FROM_TOKEN` mapping for UI display
3. **System Enforcement**: 8h uses [E,L,N], 12h uses [D,N]
4. **Night Anchoring**: Night shifts anchor to start day using `site_start_time`

## Removed Mocks

- All demo/mock data fallbacks in RPC error handling
- Runtime mock patterns and staff data
- Fallback rates and settings - explicit errors now thrown

## Scripts

### Seeding
```bash
pnpm urgent:seed
```
Creates test site, settings, staff, and patterns for development.

### Triage  
```bash
pnpm urgent:triage
```
Generates test roster and validates token counts, exits non-zero on Night shortfall.

## Database Views

- `vw_assignments_tokens`: Normalizes assignments to tokens
- `vw_requirements_tokens`: Normalizes requirements to tokens  
- `rpc_requirements_token_counts(version_id)`: Token counts from requirements
- `rpc_version_token_counts(version_id)`: Token counts from assignments
- `rpc_night_gap(version_id)`: Night demand vs supply gap

## Generator Logic

1. **Pool Selection**: Day→all staff, Night→eligible only (respects supervisor flag)
2. **Day-0 Rest**: No previous assignment = eligible (still check availability)
3. **Night Priority**: Assign nights first, then other shifts
4. **Validation**: Specific errors for Night shortfall or eligibility issues

## Testing

- Unit tests cover token mapping, demand building, night windows
- E2E tests cover full Builder v2 and Legacy Create flows
- All tests must pass for deployment