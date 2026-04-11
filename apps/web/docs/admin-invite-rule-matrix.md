# Admin Invite Rule Matrix

This document tracks invite behavior and constraints across admin roles and account states.

## Purpose
- Define who can send each invite type.
- Define who can accept each invite type.
- Document edge cases and expected API/UI behavior.

## Rule Matrix

| Invite Type | Sender Role | Recipient Requirement | One-Time Token | Expiry | Acceptance Outcome | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Global Admin Invite | Global Admin | Email must not already hold global-admin role | Yes | TBD | Grants global-admin privileges | |
| Enterprise Admin Invite | Global Admin / Enterprise Owner | Recipient belongs to target enterprise (or invited into it) | Yes | TBD | Grants enterprise-admin privileges | |
| Workspace Admin Invite | Enterprise Admin / Workspace Owner | Recipient has workspace membership (or invited into it) | Yes | TBD | Grants workspace-admin privileges | |

## Validation Rules
- Invites are single-use and invalidated after successful acceptance.
- Expired tokens must return a clear, non-ambiguous error.
- Existing equivalent-or-higher role should short-circuit acceptance safely.

## Audit and Logging
- Record issuer, recipient email, target scope, issued-at, and accepted-at.
- Record failed acceptance reasons (expired, revoked, already used, role conflict).

## Test Coverage Checklist
- Happy-path acceptance for each invite type.
- Expired token rejection.
- Reused token rejection.
- Role conflict behavior.
- Cross-scope authorization rejection.
