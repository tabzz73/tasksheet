# Final Requirements Traceability Matrix - 1.0 RC

Status values: Verified = automated evidence exists; Pilot = requires operational evidence; Pending = external/release evidence missing; Blocked = known gate cannot pass yet.

| ID | Requirement | Implementation/evidence | Status |
|---|---|---|---|
| GEN-01 | Generate by configured role and shift | `src/services/generator/index.ts`; generator tests | Verified |
| GEN-02 | Normal shift uses end-exclusive time window | `timeWindow.ts`; 0700/1459/1500/1715/0659 tests | Verified |
| GEN-03 | Overnight shift spans midnight correctly | `timeWindow.ts`; 2300/0000/0659/0700 tests | Verified |
| GEN-04 | Resident timed tasks cannot print outside shift | Generator exception test | Verified |
| GEN-05 | Unit timed tasks cannot print outside shift | Generator exception and leakage tests | Verified |
| GEN-06 | Imported invalid tasks never print on wrong shift | Imported-source regression test | Verified |
| GEN-07 | Edited valid tasks moved outside shift are excluded | Edited resident/unit regression test | Verified |
| GEN-08 | Exceptions are visible before print | Print model/package tests; pilot PIL-10 | Verified/Pilot |
| GEN-09 | Hospital/pass suppresses resident assignments | Generator status regression; pilot PIL-04 | Verified/Pilot |
| GEN-10 | Recurring tasks appear only when due | Recurrence tests; pilot PIL-06 | Verified/Pilot |
| UX-01 | Quick Add avoids duplicates and respects shift | Quick Add tests/UI validation; PIL-05 | Verified/Pilot |
| PRT-01 | HCA print package is usable | Print service/package tests; PIL-01 and CM-05 | Pilot |
| PRT-02 | LPN Vitals/Results layout is usable | Print tests; PIL-01/08 and CM-06 | Pilot |
| PRT-03 | Print and reprint are reliable | PIL-07, CM-11 | Pending |
| DAT-01 | Minimal resident identity by design | Product model/manual and pilot review | Pilot |
| DAT-02 | Backup/restore supports recovery | DB hardening tests; PIL-09 and CM-08 | Verified/Pilot |
| DAT-03 | Persistence survives restart | CM-04 | Pending |
| DEM-01 | Active bundled demo configuration is persistently and visibly identified | `DemoModeBanner`; demo-mode regression | Verified |
| DEM-02 | Start Real Setup removes sample facility, demo shifts, and demo operational records | `startRealSetup`; CM-P1-001 regression | Verified |
| DEM-03 | Built-in catalogs survive conversion without being presented as facility data | `startRealSetup`; CM-P1-001 regression | Verified |
| DEM-04 | Reloaded demo content does not overwrite or remove manual production records | demo-mode isolation regression | Verified |
| DEM-05 | Legacy RC1 Cedar Grove state cannot silently migrate as operational | restore/migration regression | Verified |
| DEM-06 | Fresh install starts with blank editable facility and no demo operational data | production-first and facility-form regressions | Verified |
| DEM-07 | Demo workspace is loaded only by explicit Settings action | optional-demo regressions | Verified |
| DEM-08 | Production-first startup and optional demo load/clear pass on clean Windows | `CLEAN_MACHINE_VALIDATION_RC3.md` | Pending |
| REL-01 | Clean Windows install has no local-path/assets dependency | CM-01 through CM-03 | Pending |
| REL-02 | Upgrade preserves supported data | CM-09 | Pending |
| REL-03 | Production web artifact builds reproducibly | `npm run build`; build evidence record | Verified |
| UX-02 | Welcome/Overview cards remain below fixed application bars during scroll | `layout.e2e.spec.ts` | Verified |
| UX-03 | Clean first launch does not claim demo data was cleared | first-run banner regression | Verified |
| UX-04 | MAP1/MAP2/MAP3 are discoverable in resident Common Quick Add and search for HCA/LPN | catalog-discovery regressions | Verified |
| UX-05 | Wellness Check is discoverable as a common HCA/LPN catalog task | Catalog discovery regressions | Verified |
| UX-06 | Catalog task instructions are pre-filled and remain editable | Catalog/default-instruction regressions; Add Care Task UI | Verified |
| CFG-01 | Facility medication and meal timing presets persist and drive Add Care Task choices | Care timing and Settings regressions | Verified |
| CFG-02 | Timing preset choices remain constrained to the selected shift window | Normal/overnight care timing regressions | Verified |
| UX-07 | Welcome & Overview is absent from primary navigation and accessible under App Information | Settings/navigation regression | Verified |
| UX-08 | App and developer identity have dedicated Settings pages | Settings/navigation regression | Verified |
| PRT-04 | Attention indicators print as distinctive symbols with a matching full-word legend | Symbol rendering regression; HCA/LPN/universal documents | Verified/Pilot |
| PRE-04 | Product tagline is consistent across branded application surfaces | Central branding constant; Settings/navigation regression | Verified |
| REL-04 | Exact source is committed and tagged `v1.0.0-rc.14` | Git SHA/tag in generated build evidence | Verified |
| REL-05 | Pilot installer is built and checksummed from tag | Installer metadata/evidence | Verified |
| PRE-01 | Welcome hero is optional and remains accessible | Welcome/settings implementation | Verified |
| PRE-02 | Presentation Mode does not imply demo data | Welcome/settings implementation; manual | Verified |
| PRE-03 | Public demo video is polished and self-contained | Required video asset/review | Pending |
| DOC-01 | Required release documentation exists | `docs/release/` | Verified (review pending) |
| GATE-01 | Production approval requires open P0 = 0 and P1 = 0 | Pilot plan and acceptance report | Pending |
