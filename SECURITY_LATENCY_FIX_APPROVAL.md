# Approval request: MedSync security, latency, and cleanup solutions

Date: 12 October 2026

Status: **Proposed — awaiting approval. No fixes implemented.**

Based on `SECURITY_LATENCY_CLEANUP_REVIEW.md`, including its isolated runtime tests and dependency audits. This document defines the proposed work and how completion will be checked. Approving a section authorizes its implementation and relevant local tests; production deployment, shared-database migrations, destructive history changes, and credential rotation require separate explicit authorization.

## A. Priority 1: security corrections

### A1. Enforce login lockout consistently

**Solution:** Resolve username/email to the same immutable staff user ID. Update the login-attempt function and caller to use that ID. Check `locked_until` before accepting a login, reject a correct password during an active lock, and reset expired lockouts consistently. Serialize attempt updates to prevent concurrent bypasses. Apply bounded account/IP throttling at an appropriate application or gateway layer; keep unknown-account responses generic.

**Files:** `backend/app/routers/auth.py`, authentication SQL module, relevant tests; an additive migration if the deployed function signature must change.

**Acceptance:** Username and email share the same counter; the fifth failure locks the account; correct passwords cannot bypass active lockout; expired locks recover; concurrent attempts cannot lose increments; existing login behavior works for unlocked users.

**Deployment dependency:** Validate migration and lockout behavior on a dedicated test database before applying SQL to the shared Neon instance.

### A2. Keep RLS context inside the transaction

**Solution:** Begin a transaction before setting user ID, role, and branch context. Set all values in one parameterized SQL statement, explicitly resetting an absent branch. Keep that transaction open through route database work, with rollback on errors. Review existing route transactions for compatibility with nested savepoints. Keep ordinary requests on a restricted application role.

**Files:** `backend/app/db.py`, relevant dependencies and integration tests.

**Acceptance:** Context remains visible to route queries; it does not leak between pooled users; doctor and branch-manager isolation works using actual restricted PostgreSQL roles; failed operations roll back; existing multi-statement routes remain atomic.

**Deployment dependency:** Requires a dedicated test database and verification of deployed role grants/ownership. Do not remove RLS or broaden database privileges to make failing routes work.

### A3. Remove sensitive input from logs and errors

**Solution:** Replace raw-body/error-input logging with request ID, route, field location, and sanitized error codes/messages. Strip submitted values from client validation responses where they may contain sensitive information. Replace raw PDF exception responses with a generic message and sanitized diagnostic logging.

**Files:** `backend/app/main.py`, `backend/app/routers/invoices.py`, validation/error handling tests.

**Acceptance:** Invalid dummy passwords, patient identifiers, clinical notes, and payment data appear in neither logs nor returned validation details. Useful field-level feedback remains available. PDF failures reveal no internal paths or raw exceptions.

### A4. Escape PDF content and restrict resource access

**Solution:** Enable HTML autoescaping for all HTML template environments. Audit intentional safe markup. Centralize a renderer resource-fetch policy that permits only required trusted local assets and explicitly approved resources; block arbitrary HTTP, file, and redirect destinations. Match the fetcher API to the pinned WeasyPrint version. Bound render size, time, and concurrency; use a worker process if hard termination is required.

**Files:** PDF routers, template configuration, renderer helper if justified, requirements, PDF tests.

**Acceptance:** Markup in patient/catalogue fields renders as text; attacker URLs and private filesystem resources are never fetched; logos/fonts and existing invoice/report layouts still render correctly; oversized jobs fail predictably.

### A5. Fail closed on account and authorization checks

**Solution:** Reject missing or inactive accounts. Treat account-lookup failures as service failures instead of accepting the JWT. Read current role/branch authorization from trusted database state, or introduce a session/version check with explicit invalidation on authorization changes. Use a consistent session-revocation policy for deactivation and logout.

**Files:** `backend/app/dependencies.py`, auth/session handling, staff update paths, relevant SQL if session versioning is chosen.

**Acceptance:** Missing/inactive users receive 401; database failures cannot grant access and return an appropriate service error; role reductions and branch changes take effect under the chosen documented policy; captured old tokens cannot retain revoked privileges.

### A6. Remove the Referer CSRF bypass

**Solution:** Remove `/docs` and `/redoc` substring exemptions. Require exact trusted Origin checks and/or a consistently verified CSRF token for cookie-authenticated mutations. Include login/logout protection. Define bearer-only API behavior separately from cookie authentication. Ensure the selected token flow works when frontend and backend use different origins; the frontend cannot assume it can read the backend's host-only cookie.

**Files:** `backend/app/dependencies.py`, `backend/app/routers/auth.py`, frontend API/auth client if needed, security tests.

**Acceptance:** Attacker Referers, attacker Origins, absent/null Origins, and missing/invalid tokens cannot bypass the selected policy. Approved frontend and API workflows work without broad origin allowances or security exceptions.

## B. Priority 2: latency corrections

| ID | Proposed solution | Acceptance check |
|---|---|---|
| B1 | Move bcrypt verification/hashing and synchronous PDF work out of the async event loop. Use bounded executors for bcrypt and a bounded render queue/worker for PDFs. Release database connections before expensive rendering when route consistency permits. | Ordinary authenticated requests stay responsive during concurrent login/PDF jobs; event-loop lag is measured against the current baseline; hashing strength is unchanged. |
| B2 | Combine context-setting round trips and avoid redundant account lookups while preserving fail-closed checks and correct RLS lifetime. Tune connection pools only after measuring acquisition wait and database capacity. | Measure pool wait, DB round trips, error rate, and API p95; demonstrate reduced overhead without weakening authorization. |
| B3 | Debounce patient search by approximately 300 ms; cancel or ignore obsolete requests. Add optional AbortSignal/timeout support to the API client. | Rapid typing produces fewer requests; delayed older responses never overwrite newer results; timeouts clear loading states; payment/booking mutations are not blindly retried. |
| B4 | Bound report date ranges and paginate large detail lists. Consolidate compatible aggregates and examine timestamp predicates/index usage using representative EXPLAIN plans. | Report totals remain correct; date/timezone boundaries are preserved; payload size and query time improve on realistic test data. |
| B5 | Add asset caching/compression where absent from the deployment layer. Review duplicate/external font and prototype Tailwind CDN requests in the frontend entry point. | Built pages retain their styling; hashed assets receive correct cache headers; HTML stays refreshable; transferred bytes and browser loading are measured. |

No numeric speedup is promised before implementation and comparison. Local fixture timings in the review exclude production network and database latency.

## C. Priority 2: dependency remediation

**Solution:** Review scanner advisory applicability, then upgrade compatible groups rather than running a blanket forced fix. Upgrade FastAPI and its compatible Starlette version together. Review PyJWT advisories against the actual HS256 authentication path. Update required multipart/configuration packages, pin required PDF runtime dependencies, and remove unused auth libraries only after reference checks. Address the Tailwind/PostCSS/glob/source-map development dependency chain with a tested upgrade strategy.

**Acceptance:** Re-run full and production-only npm audits and a reproducible Python dependency audit; document remaining matches and why any are unreachable or accepted. Run frontend checks, backend tests, security probes, and PDF visual checks. Separate application dependencies from installer/test-tool findings and deduplicate advisory records.

**Compatibility risk:** Tailwind and framework major upgrades may require source changes. Proposed version choices must be verified during implementation; scanner fix suggestions alone do not establish compatibility.

## D. Cleanup candidates: approve individually

Approval of security or performance fixes does **not** approve deletion of every candidate below.

| Candidate | Proposed action | Condition |
|---|---|---|
| `cookies.txt` | Remove from tracked source and add an ignore rule. | Check exposure; session revocation/history cleanup is a separate decision. |
| `frontend/tsconfig.tsbuildinfo` | Remove tracked generated metadata and ignore future output. | Confirm build regenerates it. |
| `temp_profile.txt`, `temp_directory.txt` | Remove development snapshots. | Confirm no unrecovered work. |
| `merge-conflicts.txt`, `merge_conflicts.diff` | Remove historical merge artifacts. | Confirm intended resolutions are incorporated. |
| One-off fix scripts and DB diagnostic helpers listed in the review | Remove only individually confirmed obsolete scripts. | Preserve useful maintenance tools; do not execute DB scripts just to classify them. |
| Root npm manifests and unused PDF libraries | Remove redundant manifests/dependencies if no workflow consumes them. | Check source, CI, developer tooling, and documentation references. |
| Legacy pages and auth guard candidates | Remove proven unreachable entry points. | Complete reference analysis and frontend verification first. |
| Design prototypes and `Blank diagram.pdf` | Archive if the team no longer needs them. | Separate explicit approval; retain useful design documentation. |

Keep routed wrapper implementations, invoice pages, compatibility re-exports still in use, SQL includes, migrations, active tests, required lockfiles, and template assets.

## E. Validation and rollout

1. Implement approved security fixes and targeted regression tests locally.
2. Validate auth/RLS SQL with a dedicated test database and restricted roles. Use synthetic users and patient data.
3. Run frontend checks, backend tests, dependency scans, and PDF rendering/layout checks.
4. Compare latency under representative concurrent test workloads; report methodology and limitations.
5. Present the final diff, migration plan, results, and remaining risks for deployment approval.

No production exploits, production load tests, shared-database writes, destructive Git-history changes, or credential rotations are included in local implementation approval.

## Approval record

Check the exact work to authorize. Unchecked items remain proposed.

- [ ] A1–A6: implement security fixes and local regression tests.
- [ ] B1–B5: implement latency improvements and measure test results.
- [ ] C: remediate dependencies with compatibility verification.
- [ ] D: delete only the following confirmed cleanup candidates: ____________________.
- [ ] Dedicated test database is available/authorized for integration tests: ____________________.

Approved by: ____________________

Date: ____________________

Constraints or exclusions: ____________________

Shared database migration / production deployment approval: **separate approval required after review of the concrete implementation.**
