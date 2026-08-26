# TASKSHEET — GENERATOR-FIRST UX SPECIFICATION
**Context-Aware Clinical Operations Application**
*Developed by SoftVibeSolutions*

---

## 1. The Generator-First Interaction Philosophy

In TaskSheet, the user never manages raw database tables. Every action begins with the simple clinical question:
> **"What needs to be done?"**

TaskSheet automatically resolves context in the following strict hierarchy:
1. **Current Resident** (pre-selected from Resident Profile or room row)
2. **Current Shift** (pre-selected from Shift Card or Shift Workspace)
3. **Selected Assignment Date** (defaults to Today / Tomorrow)
4. **Shift’s Configured Role** (derived automatically from Shift ID)
5. **Catalog Defaults** (result types, measurement ranges, default times, standard frequencies)

TaskSheet **never asks for information it already knows**.

---

## 2. Context-Aware Quick Add Workflows

### A. From Inside Shift Workspace (e.g. LPN Day · 0700–1900)
- **Known Context**: Shift (`LPN Day`), Role (`Licensed Practical Nurse`), Date (`Today`).
- **User Prompt**:
  - Resident: `[ Search room or resident... ]`
  - What needs to be done: `[ Search catalog... ]`
  - Time: `[ 0800 ]`  `☐ No specific time`
  - How often: `[ Daily ▼ ]`
  - Instructions: `[ Optional ]`
  - `[ Add Task ]`
- **Suppressed**: Role picker is hidden because Shift defines Role.

### B. From Resident Profile (e.g. Room 254 — Mary Smith)
- **Known Context**: Resident (`Mary Smith`, `Room 254`).
- **User Prompt**:
  - Shift: `[ LPN Day · 0700–1900 ▼ ]` (Selecting Shift auto-derives Role)
  - What needs to be done: `[ Search catalog... ]`
  - Time: `[ 0800 ]`
  - How often: `[ Daily ▼ ]`
  - Instructions: `[ Optional ]`
  - `[ Add Task ]`
- **Suppressed**: Resident selector is completely hidden.

### C. From Resident Inside Shift Workspace
- **Known Context**: Resident, Shift, Role, Date.
- **User Prompt**:
  - What needs to be done: `[ Blood Glucose Check ]`
  - Time: `[ 0730 ]`
  - How often: `[ Daily ]`
  - Instructions: `[ Optional ]`
  - `[ Add Task ]`
- **Speed**: Completed in under 4 seconds with 2 clicks.

---

## 3. Quick Care Setup (Batch Setup)
Allows supervisors and care coordinators to configure standard resident care in seconds:
- **Common HCA Care**: Morning Care, Shower Assistance (M T W T F S S), Toileting Assistance, Continence Care, Transfer Assistance, Repositioning, Meal Assistance, Hydration Round, Weekly Weight (Day picker).
- **Common LPN Care**: Blood Glucose Check, BG + Scheduled Insulin, Full Vital Signs, Pain Assessment, Catheter Assessment, Scheduled Injections, Wound Care.

---

## 4. Single-Screen Progressive Disclosure
- Standard forms fit comfortably on one single interaction surface.
- Advanced settings (carry over if missed, review on return, priority, custom intervals) are placed inside a collapsed **"Advanced Options"** toggle, keeping the operational interface clean and uncluttered.
