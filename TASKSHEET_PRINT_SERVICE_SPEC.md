# TASKSHEET — CENTRAL PRINT SERVICE SPECIFICATION
**Unified Print Engine & Document Model**
*Developed by SoftVibeSolutions*

---

## 1. Architecture Flow

```
AssignmentEngine (Daily Shift Sheet)
        ↓
   PrintService
        ↓
 PrintDocumentModel (Unified Model)
        ↓
  ┌───────────┴───────────┐
  ↓                       ↓
Interactive Preview   Physical Paper Print (@media print)
```

The exact same model powers both on-screen high-fidelity preview and physical print output.

---

## 2. Facility Print Header (Required on All Sheets)

```
TASKSHEET — CLINICAL SHIFT WORKSHEET (or DAILY CARE CHECKLIST)
Cedar Grove Continuing Care
123 Example Avenue, Calgary, AB T2X 1X1
Main: 403-555-0100 | Nursing/Unit: 403-555-0112 | Fax: 403-555-0199

Monday, August 24, 2026
Licensed Practical Nurse · LPN Day · 0700–1900
```

All values are dynamically bound to the Facility Profile and never hardcoded.

---

## 3. Print Profiles

### A. Simple Checklist Profile (HCA)
- **Start of Shift**: `✓ | Time | Task | Note`
- **Resident Assignments**: `✓ | Time | Room | Resident | Task | Important Note`
- **During Shift Routines**
- **End of Shift Handoff**
- **Outstanding / Handoff Notes**: Ruled writable lines.
- **Paper-First Rule**: Uses clean blank checkboxes (`☐`), allowing fresh on-shift documentation regardless of digital completion.

### B. Clinical Worksheet Profile (LPN / RN / Charge)
- **Start of Shift — Unit Routines & Safety**: `✓ | Time | Task | Result / Note`
- **Resident Care Assignments**: `✓ | Time | Room | Resident | Task | Important Information | Vitals / Results | Notes / Follow-up`
- **During Shift — Unit Routines**
- **End of Shift — Handover & Reconciliation**
- **Quick Vitals / Clinical Notes Grid**: 8 blank bordered rows (`Room | Resident | BP | HR | RR | Temp | SpO₂ / BG | Time`).
- **Outstanding / Handoff Notes**: 3–4 writable lines.

---

## 4. FYI Binder Print Profile
- Formats standing information across Shared, HCA, LPN, and RN sections with Room, Resident Name, Category, Information Text, and Effective Date.
