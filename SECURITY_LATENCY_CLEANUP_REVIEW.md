# MedSync security, latency, and file cleanup review

Date: 12 October 2026

## Scope and limitations

Initial static inspection of the FastAPI backend, React frontend, SQL setup, dependency manifests, and deployment files, followed by the isolated runtime validation documented below. Existing source changes and deletions were left untouched. Disposable dependencies and test harnesses were created for validation; the disposable workspace runtime was removed afterward. This report is the only retained new file in the repository. No shared Neon database was contacted or modified. Paths below are relative to the repository root.

## Follow-up: executed security tests, app checks, latency, and dependency audits

Executed on 12 October 2026. Findings in this section supersede the initial statements below that testing, timing, or dependency audits remain outstanding.

### What ran

- The real FastAPI application through HTTPX's ASGI transport, with database dependencies/pools replaced by controlled fixtures and environment variables set to an unreachable dummy local database. This exercised request routing, authentication, authorization, validation, and response handling. It did not exercise real pool startup or database-backed business workflows.
- The repository's actual login-attempt SQL function in an isolated in-memory PGlite PostgreSQL engine, with a synthetic staff table. This engine is not the deployed Neon instance.
- Existing backend tests: **15 passed, 4 skipped**, using dummy database configuration, no pytest cache provider, and bytecode writing disabled. Skipped tests were not counted as validated workflows.
- Vite 8.3.0 frontend development server and HTTP smoke/timing checks. The initial installed launcher was missing, and direct startup failed because the Windows Rolldown binding was absent. A matching 1.2.9 binding was installed in a separate artifact directory and exposed via NODE_PATH. Project manifests and lockfiles were not changed.
- npm advisory scans of both lockfiles, including a production-only frontend scan; pip-audit of a disposable Python environment resolved from backend requirements. Scans did not run fix commands.

### Reproduced security behavior

| Probe | Observed result | Conclusion |
|---|---|---|
| Six failed attempts recorded with an email string | Staff failure count stayed **0** | Email input does not update the username-based SQL counter. The application accepts email login. |
| Five failed username attempts, then a success during active lockout | Counter reached **5** and future lock was set; success returned `is_locked=false`, `locked_until=null` | Correct-password success clears an active lock rather than enforcing it. |
| Transaction-local role setting followed by a separate query | Role was empty after the implicit transaction; `Doctor` remained visible inside an explicit transaction | RLS context lifetime defect reproduced in PostgreSQL engine. |
| Inactive account fixture | Protected dashboard returned **401** | Ordinary deactivation rejection works when lookup succeeds. |
| Missing account and account-lookup exception fixtures | Protected dashboard returned **200** in both cases | Fail-open account checks reproduced through application requests. |
| Mutation with attacker Origin and no CSRF tokens | Staff POST returned **403** | Baseline CSRF rejection worked. |
| Same mutation with `Referer: https://attacker.invalid/docs` | Returned **422** for missing business fields | CSRF protection was bypassed; request reached payload validation. No record was written. |
| Invalid login with dummy secret in a wrongly typed password | Dummy secret was present in captured logging | Sensitive-body logging reproduced without real credentials. |
| Invoice patient-name field containing an injected image tag | Tag survived rendering; renderer attempted its resource fetch; PDF generation completed | HTML injection and resource-fetch reachability reproduced. Every fetch was intercepted and replaced with harmless data. No external host or private file was fetched. |

The Referer probe confirms server-side acceptance of a hostile Referer, not a complete browser-based victim exploit. Browser referrer policy, cookie delivery, data-entry restrictions, network egress, and deployed DB roles still affect exploitability.

### Measured local timings

| Measurement | Method | Result |
|---|---|---|
| Authenticated dashboard through ASGI | 10 warmups, 100 sequential measured requests; fixture DB, no socket/TLS/real database | p50 **5.34 ms**, p95 **7.25 ms**, p99 **7.64 ms** |
| Synchronous bcrypt verification | Three consecutive verifications with the actual configured bcrypt implementation and default hash cost | **600.51 ms** total; concurrent 10 ms timer delayed by **590.92 ms** |
| Invoice PDF render | One synthetic template, intercepted resources, WeasyPrint 70.0 | **281.99 ms**, 11,617-byte PDF |
| Frontend `/` | Five warmups, 20 measured sequential local HTTP requests | p50 **3.50 ms**, p95 **8.14 ms** |
| Frontend `/src/main.tsx` | Same method | p50 **0.52 ms**, p95 **0.69 ms** |
| Frontend `/src/app/routes.tsx` | Same method | p50 **0.60 ms**, p95 **0.84 ms** |

All 25 requests per frontend resource returned 200. These checks establish server/module delivery, not complete browser rendering or authenticated UI behavior. The PDF is synthetic and its resource fetching was replaced; its timing excludes real fonts/assets/network and is only a component sample. Bcrypt timer delay directly demonstrates event-loop blocking. Dashboard timing excludes actual database round trips. These are **not production performance numbers**, and no before/after improvement was measured.

### Dependency advisory results

Frontend full lockfile audit: **8 affected package entries**, comprising **6 high** and **2 moderate**, with no critical entries. These include propagated dependency effects, not eight independent CVEs. The three underlying advisories reported were:

- braces stack exhaustion: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), affecting the Tailwind/chokidar/micromatch/fast-glob chain.
- postcss-selector-parser CPU exhaustion: [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), also propagating through postcss-nested/Tailwind.
- source-map-js denial of service: [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

Frontend **production-only audit: 0** reported vulnerabilities. Root npm lockfile audit: **0**. The affected frontend packages are development/build tools; exploitability depends on processing attacker-controlled patterns, CSS, or source maps. npm suggests some major-version changes; do not blindly run `npm audit fix --force`.

Python audit emitted **66 advisory records across 8 packages**. The response contains repeated IDs: deduplicating by package and advisory ID yields **39 distinct package/advisory pairs**. These are advisory matches, not 39 proven exploitable bugs. Of those, seven concern the temporary runtime's pip/pytest tooling; 32 concern six application dependency packages.

| Package resolved in audit runtime | Version | Distinct advisory IDs | Interpretation |
|---|---|---|---|
| PyJWT | 2.10.1 | 16 | Direct authentication dependency; inspect each advisory against actual HS256 decoding and upgrade within a tested compatible set. Reported fixes vary up to 2.15.0. |
| Starlette | 0.41.3 | 7 | Transitive framework dependency constrained by FastAPI 0.115.6; advisory applicability includes multipart/file serving and platform-specific features. Upgrade FastAPI/Starlette together. |
| python-multipart | 0.0.20 | 6 | Direct dependency; no evident form/upload route in inspected source. Reported fixes vary up to 0.0.31. |
| python-dotenv | 1.0.1 | 1 | Direct configuration dependency; reported fix 1.2.2. |
| python-jose | 3.5.0 | 1 | Unpinned dependency freshly resolved for this audit, apparently unused by application code. No fix listed by scanner. |
| ecdsa | 0.19.2 | 1 | Transitive python-jose dependency; timing advisory concerns signing/key operations. App uses PyJWT HS256, so affected signing path was not established. |
| pytest | 8.3.4 | 1 | Test tooling; reported fix 9.0.3. |
| pip | 24.0 | 6 | Disposable installer tooling, not an app requirement; do not attribute this version to production. |

Representative reported aliases include PyJWT CVE-2026-32597, python-multipart CVE-2026-24486, Starlette CVE-2025-54121, python-dotenv CVE-2026-28684, python-jose CVE-2026-85394, and ecdsa CVE-2024-23342. The full scanner response is retained outside the repository at `C:/Users/ASUS TUF/.codex/visualizations/2026/10/12/01a12e98-c715-7b02-be77-6c5fb5832313/python-dependency-audit.json`. Scanner descriptions and fix ranges are evidence for triage; each requires applicability review before declaring an exploitable deployment vulnerability.

Unpinned and transitive Python versions were freshly resolved on the audit date, so they may differ from an existing deployment. Container OS packages and a production SBOM were not audited.

### Remaining validation boundaries

No live clinic login, booking, payment, payout, migration, patient mutation, or production load test was performed. Real branch isolation requires restricted-role integration tests against a dedicated test database. Production latency requires realistic data, concurrency, remote DB latency, deployment settings, and end-to-end browser measurements. Those results cannot be inferred from the isolated timings above.

## Security findings

### 1. High: login lockout can be bypassed

Evidence: `backend/app/routers/auth.py:18` and `db/modules/dilantha/06_auth_functions.sql:30`.

The login query accepts a username OR email, but the attempt-recording function only resolves `staff.username`. Email login therefore avoids the account's failure counter. The function also resets counters whenever the password is correct without checking whether `locked_until` is still in the future. Failed attempts keep increasing the counter without a clear expired-lock reset.

Recommendation: resolve the account once and record attempts by immutable user ID; enforce active lockout before password acceptance; reset expired lockouts consistently; add account and IP throttling. Verify username and email attempts affect the same counter and that a correct password cannot bypass an active lockout.

### 2. High: RLS context does not survive into route queries

Evidence: `backend/app/db.py:5` and `backend/app/db.py:13`.

The connection dependency executes separate `set_config(..., true)` statements without an enclosing transaction, then yields the connection. PostgreSQL applies these settings only within the current transaction. They expire when each statement's implicit transaction ends, before subsequent route queries or route-owned transactions. Role-aware pool selection does not fix this.

Impact depends on the deployed DB role: correctly restricted connections may reject writes or return missing data; an owner or bypass-capable connection may hide the defect and leave routes relying on application checks. This is not proof that cross-branch access currently succeeds.

Recommendation: open a transaction before setting all context values, keep it through the route's database work, and explicitly initialize the branch value even when absent. Test with real restricted PostgreSQL roles and pooled connections across users. [PostgreSQL documentation](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET).

### 3. High: raw invalid request bodies enter logs

Evidence: `backend/app/main.py:64`.

The validation handler logs the entire body and validation errors. Invalid login, patient, or payment requests can place passwords, health information, personal identifiers, and financial details in logs. Validation errors can also contain submitted input.

Recommendation: record request ID, route, and sanitized field/error metadata; redact credentials and clinical data; return sanitized validation errors. Check with deliberately invalid dummy credentials and patient fields.

### 4. High, conditional exploitability: HTML injection in PDF rendering

Evidence: `backend/app/routers/invoices.py:21`, `:349`, `:371`; `backend/app/routers/reports.py:450` and `:454`.

These Jinja environments omit autoescaping, and their rendered output is passed to WeasyPrint. Invoice fields include patient name/address and treatment names; report fields include catalogue data. If a permitted user can insert markup into such fields, it can change document content and potentially trigger network or local resource reads through the renderer. No exploit was attempted, and data-entry constraints were not exhaustively checked.

Recommendation: enable HTML autoescaping, use a restrictive resource fetcher allowing only required assets, and bound render time/memory. Other report paths already use autoescaping and threadpool rendering at `reports.py:777` and `:801`, providing a useful implementation reference. [WeasyPrint security guidance](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#security).

### 5. Medium: account checks fail open and privileges remain stale

Evidence: `backend/app/dependencies.py:50` through `:72`.

Database errors during the active-account lookup are swallowed. A missing staff row also passes because only the exact value `False` is rejected. Authorization then trusts role and branch claims from the JWT, which remain valid until expiry even after a role/branch change. The default expiry is 60 minutes.

Recommendation: reject absent/inactive accounts, surface DB failures as service failures, and validate current authorization data or a session/version value. Test deactivation, deletion, privilege reduction, branch reassignment, and lookup failure.

### 6. Medium: CSRF protection trusts a Referer substring

Evidence: `backend/app/dependencies.py:35` through `:48`; login/logout routes in `backend/app/routers/auth.py`.

Any Referer containing `/docs` or `/redoc` skips CSRF checks, without validating the Referer's origin. An attacker-controlled page with such a path may satisfy this exception when browsers send that Referer. Secure cookies use SameSite=None, so protection must not depend on SameSite alone. Login and logout do not use the protected dependency; login CSRF and forced logout also need explicit consideration.

Recommendation: remove substring-based exceptions, validate exact origins, and consistently protect cookie-authenticated mutations including auth endpoints. An exact trusted Origin check can be a valid protection; CORS alone does not prevent cross-site requests from being sent.

### 7. Medium: tracked cookie material

Evidence: `cookies.txt` is tracked by Git and contains `access_token` and `csrf_token` entries. Token values were not printed or copied into this report.

Recommendation: remove the cookie jar from version control when cleanup is authorized, ignore future jars, and determine whether any token remains usable or was shared. Revoke exposed sessions where necessary. Review history before deciding whether history cleanup or secret rotation is needed. `frontend/frontend.env` is also tracked and should be classified; its filename alone does not prove it contains secrets.

### 8. Additional deployment checks

- `backend/app/config.py` falls back to the normal database URL for the admin pool. Verify distinct, least-privilege deployed credentials; do not use the DB owner for ordinary requests.
- `backend/app/routers/invoices.py:374` returns raw PDF exception text, which can disclose filesystem or renderer details. Return a generic message and sanitized server diagnostics.
- `docker-compose.yml` runs development Dockerfiles with source mounts and development ports. Use an explicit production deployment configuration.
- Python dependencies mix pinned and unpinned packages. An installed dependency/SBOM audit and frontend lockfile audit are still needed; no CVE claim is made here.

## Potential latency reductions

These are source-supported opportunities, not measured improvements. Removing scratch files alone is unlikely to change API response time.

| Priority | Evidence | Bottleneck | Proposed change and validation |
|---|---|---|---|
| High | `backend/app/routers/invoices.py:371`; `reports.py:454` | Synchronous PDF generation inside async routes blocks the event loop, delaying unrelated requests. | Move rendering to a bounded threadpool or worker queue; measure ordinary API p95 while concurrent exports run. |
| High | `backend/app/routers/auth.py:35`; `backend/app/security.py:12` | Synchronous bcrypt verification blocks the event loop during login. Hashing is synchronous too. | Offload password operations to a bounded executor and throttle login concurrency; retain strong password hashing parameters. |
| High | `backend/app/db.py:5`; `dependencies.py:55`; `main.py:34` | Each authenticated DB route performs a separate active-account checkout and 2–3 context-setting round trips before business queries. Each pool has only five connections. | Set context in one statement inside the correct transaction; consolidate authorization lookup where safe; measure acquire wait and DB RTT before sizing pools. |
| Medium | `frontend/src/pages/receptionist/PatientDirectory.tsx:18` | Every search keystroke fetches patients; requests are neither cancelled nor ordered, allowing stale results to overwrite newer ones. | Debounce search by roughly 250–350 ms and cancel/ignore obsolete responses; count requests during typing and test out-of-order completion. |
| Medium | `backend/app/routers/reports.py:27`, `:208`, `:272` | Reports allow broad/all-history queries; outstanding balances returns every matching row. Some endpoints scan similar joins twice for totals and details. | Set appropriate default date ranges, paginate details, consolidate compatible aggregates, and measure plans on representative data. |
| Medium | `backend/app/routers/reports.py:169` and related queries | Casting `payment_date` to date in predicates may prevent ordinary timestamp indexes from supporting range scans. | Use timestamp bounds or appropriate expression indexes only after EXPLAIN review; preserve timezone/date semantics. |
| Medium | `frontend/src/api/client.ts:116` | Fetches have no timeout or cancellation interface, leaving screens waiting on stalled requests. | Add AbortSignal support and sensible timeouts; avoid automatic retries of payment/booking mutations without idempotency. |
| Low | `frontend/nginx.conf` | No explicit asset compression or hashed-asset caching rules in this file. | Confirm proxy/CDN behavior; add immutable caching for hashed assets and compression where absent, while keeping HTML refreshable. |

Keep the existing lazy route imports in `frontend/src/app/routes.tsx`; code splitting is already present. Do not recommend it as a missing feature.

Suggested baseline: record API p50/p95/p99, error rate, DB pool wait, query duration, PDF duration, response bytes, and frontend request counts under representative concurrent usage. No numerical speedup can be promised from this static review.

## Unnecessary file candidates

No files were removed. Confidence below concerns cleanup suitability, not permission to delete.

| Files | Assessment | Before removing |
|---|---|---|
| `cookies.txt` | High-confidence sensitive local artifact; unsuitable for tracked source. | Check session exposure and preserve no token values in documentation. |
| `frontend/tsconfig.tsbuildinfo` | Generated TypeScript build metadata, tracked in Git. | Confirm it is regenerated by the existing build; ignore it if cleanup is approved. |
| `temp_profile.txt`, `temp_directory.txt` | Likely temporary development snapshots; both tracked. | Compare with current source and check whether they contain unrecovered work. |
| `merge-conflicts.txt`, `merge_conflicts.diff` | Likely historical conflict artifacts; both tracked. | Confirm all intended resolutions are incorporated before deleting. |
| `frontend/fix_ts.py`, `frontend/fix_ts_2.py`, `fix_reports.py` | Likely one-off source-editing helpers. | Check documentation and developer workflow; preserve any still-needed maintenance tooling. |
| `temp_appointments.py`, `test_query.py`, `test_query2.py`, `test_count.py`, `test_invoice.py`, `get_policies.py`, `get_triggers.py`; backend `scratch_db.py`, `query_allergy.py`, `test_db.py`, `verify_db.py` | Diagnostic/scratch candidates, not proven redundant. | Review contents and operational value. Do not execute them merely to classify them: DB helpers may connect or mutate state. |
| Root `package.json` and `package-lock.json` | Root manifest duplicates the PDF packages in the frontend and has no scripts. No imports of html2canvas/jspdf were found under `frontend/src`. | Confirm no external/root workflow consumes them; then consider removing redundant manifests and unused frontend PDF packages together. |
| `frontend/src/pages/reports/TreatmentCategories.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/auth-guard.js` | Possible legacy files; active routes use other report/dashboard entry points. | Complete import/entry-point analysis, including external references, before deleting. |
| `Blank diagram.pdf` and `docs/stitch_enterprise_healthcare_ui_generator/` | Reference/design artifacts rather than runtime code. | Archive separately only if the team no longer needs design history; retain them if useful documentation. |

Do **not** delete the following merely because names look duplicated:

- `frontend/src/pages/doctor/Doctor*.tsx`: the active `Dashboard`, `MySchedule`, `Consultation`, `TreatmentCatalogue`, and `MyEarnings` files wrap/re-export these implementations.
- `frontend/src/pages/receptionist/InvoicePage.tsx`: imported by the routed `Invoices.tsx` wrapper.
- `frontend/src/auth/AuthContext.tsx` and `frontend/src/services/api.ts`: compatibility re-exports; callers must be migrated before removal.
- `db/modules/` or the contributor SQL directories: schema entry points include these files.
- Tests, migrations, lockfiles used by active builds, `.env.example`, and assets referenced by templates.

Dependency cleanup candidates: `python-jose[cryptography]` and `passlib[bcrypt]` have no imports in `backend/app`, which uses PyJWT and bcrypt directly. `pydantic` is declared twice, once with email extras. `python-multipart` has no evident Form/UploadFile usage in the inspected application. Validate tests, tools, and transitive requirements before removal. Pin the required WeasyPrint version for reproducible PDF builds.

## Recommended order

1. Fix login lockout, raw-body logging, RLS transaction lifetime, and PDF HTML escaping/resource access.
2. Make account checks fail closed and remove the Referer CSRF exception; validate real DB role isolation.
3. Address PDF/bcrypt event-loop blocking and search request bursts; measure before tuning queries or pools.
4. Review cookie exposure, then approve individual cleanup candidates and run the relevant build/checks after any future cleanup.

This review does not certify the application as secure or establish that all unused files have been found.
