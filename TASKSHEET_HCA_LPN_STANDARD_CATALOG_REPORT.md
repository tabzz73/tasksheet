# TASKSHEET — STANDARDIZED CARE CATALOG REPORT
**Simplified Care-Domain Categories + Role-Aware Standard Tasks**
*Developed by SoftVibeSolutions*

---

## 1. Executive Summary & Catalog Design Principle

TaskSheet’s Standardized Care Catalog has been updated to align with the generator-first product philosophy:
> **"Users should choose familiar care categories and tasks. They should not have to understand database entities or complex clinical taxonomies."**

- **Catalog Name**: Alberta Starter Catalog
- **Catalog Version**: 1.0
- **Alignment**: AHS / Alberta continuing-care aligned *(Note: Designed for Alberta continuing-care teams; not labeled as an official AHS catalog)*.
- **Role Scopes**: Distinct, role-aware starter templates for Health Care Aides (HCA) and Licensed Practical Nurses (LPN).

---

## 2. Primary Care-Domain Categories

The catalog organizes care tasks into 25 straightforward domain categories:
1. `AM Care` (`cat-am-care`)
2. `PM Care` (`cat-pm-care`)
3. `HS Care` (`cat-hs-care` · Bedtime / Hour of Sleep)
4. `Bathing` (`cat-bathing`)
5. `Medication Assistance` (`cat-med-assist`)
6. `Nutrition & Hydration` (`cat-nutrition`)
7. `Continence & Toileting` (`cat-continence`)
8. `Mobility & Transfers` (`cat-mobility`)
9. `Positioning & Skin Care` (`cat-positioning-skin`)
10. `Health Monitoring` (`cat-health-monitoring`)
11. `Diabetes Care` (`cat-diabetes`)
12. `Medication / Treatment` (`cat-med-treatment`)
13. `Injection` (`cat-injection`)
14. `Wound Care` (`cat-wound-care`)
15. `Catheter / Urinary Care` (`cat-catheter-urinary`)
16. `Ostomy Care` (`cat-ostomy`)
17. `Respiratory Care` (`cat-respiratory`)
18. `Lab / Specimen` (`cat-lab-specimen`)
19. `Pain / Symptom Management` (`cat-pain-symptom`)
20. `Clinical Follow-up` (`cat-clinical-followup`)
21. `Safety & Observation` (`cat-safety-obs`)
22. `Overnight Care` (`cat-overnight`)
23. `Palliative / Comfort Care` (`cat-palliative`)
24. `Resident / Family Education` (`cat-education`)
25. `Other` (`cat-other`)

---

## 3. Fixed TaskSheet Medication Assistance Levels (MAP)

| Stable Slug | Display Title | Catalog Definition | Metadata Flags |
| :--- | :--- | :--- | :--- |
| `hca.medication.map1` | **MAP1 — Medication Reminder** | *Reminder only. Resident performs medication activity independently after being reminded.* | `carePlanDependent: true`<br/>`authorizationDependent: true` |
| `hca.medication.map2` | **MAP2 — Partial Medication Assistance** | *Partial assistance. Resident participates but requires some assistance according to their care plan.* | `carePlanDependent: true`<br/>`authorizationDependent: true` |
| `hca.medication.map3` | **MAP3 — Full Medication Assistance** | *Full assistance. Resident requires full medication assistance according to their care plan and facility-authorized workflow.* | `carePlanDependent: true`<br/>`authorizationDependent: true` |
| `hca.medication.refusal` | **Report Medication Refusal** | *Promptly inform nurse if resident declines or refuses medication assistance.* | `carePlanDependent: true` |
| `hca.medication.followup` | **Medication Assistance Follow-up** | *Follow up on resident hydration after medication assistance.* | `carePlanDependent: true` |

---

## 4. Observation vs. Assessment Invariant

TaskSheet strictly respects scope distinctions in naming and assignment:

| Care Area | HCA Terminology (Support & Observation) | LPN Terminology (Clinical Assessment & Procedure) |
| :--- | :--- | :--- |
| **Skin Care** | `Skin Observation During Care`<br/>`Bathing Skin Observation`<br/>`Evening Skin Observation` | `General Nursing Assessment`<br/>`Wound Assessment`<br/>`Skin Tear Treatment` |
| **Urinary / Catheter** | `Catheter Drainage Observation`<br/>`Catheter Bag Emptying` | `Catheter Assessment`<br/>`In-and-Out Catheterization`<br/>`Catheter Site Care` |
| **Pain & Symptoms** | `Pain Behaviour Observation`<br/>`General Condition Observation` | `Pain Assessment`<br/>`Pain Reassessment`<br/>`PRN Effectiveness Follow-up` |
| **Vital Signs** | `Weekly Weight`<br/>`Monthly Weight` | `Full Vital Signs`<br/>`Postural / Orthostatic Vital Signs`<br/>`Blood Pressure Check` |

---

## 5. Unit Task Catalog & Result Configurations

Unit routines remain strictly segregated from resident care assignments:
- **Start of Shift**:
  - `Receive Shift Handoff` (Confirmation)
  - `Medication Fridge Temperature` (`TEMPERATURE` · 2.0°C–8.0°C range with excursion action prompt)
  - `Controlled Medication Count — Incoming` (`CONFIRMATION` / `PASS_ISSUE`)
  - `Emergency Equipment Check` (`PASS_ISSUE`)
  - `Review TaskSheet / Assignment` (Confirmation)
  - `Review Important FYIs` (Confirmation)
- **During Shift**:
  - `Equipment / Supply Check` (Confirmation)
  - `Medication Fridge Temperature Recheck` (Temperature)
  - `Treatment Cart / Supply Check` (Confirmation)
  - `Outstanding Orders Follow-up` (Confirmation)
- **End of Shift**:
  - `Controlled Medication Count — Outgoing` (Confirmation)
  - `Review Outstanding Tasks` (Confirmation)
  - `Review Abnormal Findings` (Confirmation)
  - `Complete Shift Handoff` (`CHECKBOX_NOTE`)

---

## 6. Verification Results

### Unit Test Execution (Vitest)
```
✓ src/test/generator.test.ts (12 tests) 33ms
  - derives Role from configured Shift without re-asking user
  - guarantees Room Reuse Safety (zero bleed)
  - suppresses care assignments for in_hospital / out_on_pass
  - evaluates recurrence frequencies (daily, selected days, weekly, monthly)
  - generates unified PrintDocumentModel with complete facility header
  - separates standard catalog from demo data (Clear Demo preserves catalog)
  - sorts room numbers naturally
  - stable and exact definitions for MAP1, MAP2, MAP3
  - unique catalog task template slugs
  - preserves Observation vs Assessment distinction
  - preserves custom user tasks upon catalog reset
  - exports catalog containing 0 residents/tasks/wounds/completions
```

### End-to-End User Journey Tests (Playwright)
```
✓ Journey 1 (HCA): Open HCA Day, search MAP2, select MAP2 Partial Medication Assistance, print Simple Checklist.
✓ Journey 2 (LPN): Open LPN Day, log fridge temp (range validated), search Blood Glucose Check, print Clinical Worksheet.
✓ Journey 3 (Resident): Quick Care Setup, add Wound protocol with dressing frequency.
✓ Journey 4 (Supervisor): Add FYI, verify physical binder status update, mark physical binder updated.
✓ Journey 5 (Context Safety): Verify shift & role auto-inherited; add custom resident care task.
```

### Production Build Verification
```
npm run build
dist/index.html                   0.85 kB │ gzip:  0.44 kB
dist/assets/index-D7b36yKx.css   21.90 kB │ gzip:  4.68 kB
dist/assets/index-D7h5Q5nB.js   346.10 kB │ gzip: 98.40 kB
✓ built in 580ms
```

---

## 7. Formal Verification Verdict

# **GENERATOR-FIRST STANDARDIZED CATALOG PASSED**
The standardized catalog gives frontline care staff clean, role-tailored care choices while eliminating clinical taxonomy complexity and maintaining strict generator-first speed.
