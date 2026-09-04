import { Resident, ResidentTask, UnitTask, FYI, Wound, Completion } from '../types';
import { ROLE_HCA_ID, ROLE_LPN_ID, SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from './defaultData';
import { getTodayLocalDateString } from '../services/recurrence';

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function generateDemoData() {
  const todayStr = getTodayLocalDateString();

  // 16 Fictional Residents
  const residents: Resident[] = [
    {
      id: 'res-101',
      firstName: 'Arthur',
      lastName: 'Pendleton',
      roomNumber: '101A',
      status: 'active',
      notes: 'Independent with walker; loves reading the morning paper.',
      attentionItems: [
        {
          id: 'attn-demo-1',
          type: 'Increased Falls Observation',
          note: 'Found on floor overnight Sep 1 — no injury. Frequent room checks in effect.',
          startDate: todayStr,
          endDate: addDaysToDateStr(todayStr, 6),
          active: true,
          createdAt: new Date().toISOString(),
          source: 'demo',
        },
      ],
      source: 'demo'
    },
    {
      id: 'res-102',
      firstName: 'Beatrice',
      lastName: 'Montgomery',
      roomNumber: '101B',
      status: 'active',
      notes: 'Requires 1-person assist for transfers. Hard of hearing on left side.',
      source: 'demo'
    },
    {
      id: 'res-103a',
      firstName: 'Charles',
      lastName: 'Davenport',
      roomNumber: 'L102',
      status: 'active',
      notes: 'Diabetic routine; prefers morning BG check before coffee.',
      source: 'demo'
    },
    {
      id: 'res-103b',
      firstName: 'Donald',
      lastName: 'Fletcher',
      roomNumber: '103LF',
      status: 'active',
      notes: 'Low sodium diet. Uses rollator walker with supervision.',
      source: 'demo'
    },
    {
      id: 'res-201',
      firstName: 'Evelyn',
      lastName: 'Sinclair',
      roomNumber: '201',
      status: 'active',
      notes: 'Shower assist on Mon/Thu. Mechanical lift required.',
      source: 'demo'
    },
    {
      id: 'res-202',
      firstName: 'Franklin',
      lastName: 'Greyson',
      roomNumber: '202',
      status: 'active',
      notes: 'Oxygen therapy 2L/min via nasal cannula. Check tubing continuously.',
      source: 'demo'
    },
    {
      id: 'res-204',
      firstName: 'Eleanor',
      lastName: 'Vance',
      roomNumber: 'N204',
      status: 'in_hospital',
      notes: 'Admitted to Foothills Medical Centre for observation. Care tasks suspended.',
      source: 'demo'
    },
    {
      id: 'res-254',
      firstName: 'Mary',
      lastName: 'Smith',
      roomNumber: '254',
      status: 'active',
      notes: 'Warm and friendly. Needs morning BG check & insulin, shower on Mon/Wed.',
      source: 'demo'
    },
    {
      id: 'res-301',
      firstName: 'Robert',
      lastName: 'Chen',
      roomNumber: 'Memory-03',
      status: 'out_on_pass',
      notes: 'Out on day pass with family. Expected return 1800.',
      source: 'demo'
    },
    {
      id: 'res-305',
      firstName: 'Grace',
      lastName: 'Holloway',
      roomNumber: '305',
      status: 'active',
      notes: 'Dementia care plan; responds well to gentle orientation and redirection.',
      source: 'demo'
    },
    {
      id: 'res-310',
      firstName: 'Harold',
      lastName: 'Kensington',
      roomNumber: '310',
      status: 'active',
      notes: 'Indwelling Foley catheter. Daily bag drainage & site care.',
      source: 'demo'
    },
    {
      id: 'res-320',
      firstName: 'Irene',
      lastName: 'Lockwood',
      roomNumber: '320',
      status: 'active',
      notes: 'Weekly weights every Monday before breakfast. Minced diet with fluid assist.',
      source: 'demo'
    },
    {
      id: 'res-329b',
      firstName: 'William',
      lastName: 'Harris',
      roomNumber: '329B',
      status: 'active',
      notes: 'Two-person transfer. Active left lower leg wound treatment daily.',
      source: 'demo'
    },
    {
      id: 'res-330',
      firstName: 'James',
      lastName: 'Whitmore',
      roomNumber: '330',
      status: 'active',
      notes: 'Full vital signs monitoring daily. Postural BP checks as needed.',
      source: 'demo'
    },
    {
      id: 'res-332',
      firstName: 'Kathleen',
      lastName: 'O’Connor',
      roomNumber: '332',
      status: 'active',
      notes: 'Subcutaneous injection Fragmin 5000 IU daily at 0900.',
      source: 'demo'
    },
    {
      id: 'res-335',
      firstName: 'Leonard',
      lastName: 'Sterling',
      roomNumber: '335',
      status: 'active',
      notes: 'Hydration rounds and fluid encouragement. Reposition q2h.',
      source: 'demo'
    }
  ];

  // Resident Tasks (HCA & LPN with standardized categories)
  const residentTasks: ResidentTask[] = [
    // Mary Smith (254)
    {
      id: 'task-ms-01',
      residentId: 'res-254',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.diabetes.bg_insulin',
      title: 'BG Check + Scheduled Insulin',
      category: 'Diabetes Care',
      time: '0730',
      frequency: 'daily',
      instructions: 'Check fasting BG before breakfast. Administer Lantus 14 Units SC per MAR.',
      priority: 'high',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-ms-02',
      residentId: 'res-254',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.am.morning_care',
      title: 'Morning Personal Care',
      category: 'AM Care',
      time: '0800',
      frequency: 'daily',
      instructions: 'Assist with face/teeth, assist with blue cardigan.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-ms-03',
      residentId: 'res-254',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.bathing.shower_assistance',
      title: 'Shower Assistance',
      category: 'Bathing',
      time: '0930',
      frequency: 'selected_days',
      recurrenceRule: {
        basis: 'selected_weekdays',
        selectedDays: [1, 3] // Mon, Wed
      },
      instructions: 'Shower with shower chair. Note: resident prefers shower after breakfast.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-ms-04',
      residentId: 'res-254',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.monitoring.full_vitals',
      title: 'Full Vital Signs',
      category: 'Health Monitoring',
      time: '1130',
      frequency: 'daily',
      instructions: 'Check BP, HR, SpO2 before lunch.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // William Harris (329B)
    {
      id: 'task-wh-01',
      residentId: 'res-329b',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.mobility.transfer_two_person',
      title: 'Transfer — Two-Person Assist',
      category: 'Mobility & Transfers',
      time: '0800',
      frequency: 'daily',
      instructions: 'Always use 2 staff with transfer belt. Bed to wheelchair.',
      priority: 'high',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-wh-02',
      residentId: 'res-329b',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.wound.treatment',
      title: 'Wound Treatment',
      category: 'Wound Care',
      time: '1000',
      frequency: 'daily',
      instructions: 'Cleanse left lower leg venous ulcer with NS, apply Mepilex Border.',
      priority: 'high',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-wh-03',
      residentId: 'res-329b',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.positioning.reposition_bed',
      title: 'Reposition in Bed',
      category: 'Positioning & Skin Care',
      time: '1400',
      frequency: 'daily',
      instructions: 'Tilt-in-space wheelchair repositioning and heel offloading.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Arthur Pendleton (101)
    {
      id: 'task-ap-01',
      residentId: 'res-101',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.am.morning_care',
      title: 'Morning Personal Care',
      category: 'AM Care',
      time: '0745',
      frequency: 'daily',
      instructions: 'Setup for shaving and morning wash.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-ap-02',
      residentId: 'res-101',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.monitoring.blood_pressure',
      title: 'Blood Pressure',
      category: 'Health Monitoring',
      time: '0815',
      frequency: 'daily',
      instructions: 'Routine morning blood pressure check.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Charles Davenport (103A)
    {
      id: 'task-cd-01',
      residentId: 'res-103a',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.diabetes.bg_check',
      title: 'Blood Glucose Check',
      category: 'Diabetes Care',
      time: '0730',
      frequency: 'daily',
      instructions: 'Morning fasting blood glucose before breakfast.',
      priority: 'high',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Franklin Greyson (202)
    {
      id: 'task-fg-01',
      residentId: 'res-202',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.respiratory.o2_check',
      title: 'Oxygen Therapy Check',
      category: 'Respiratory Care',
      time: '0800',
      frequency: 'daily',
      instructions: 'Check O2 concentrator at 2 L/min, inspect skin behind ears.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Harold Kensington (310)
    {
      id: 'task-hk-01',
      residentId: 'res-310',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.catheter.assessment',
      title: 'Catheter Assessment',
      category: 'Catheter / Urinary Care',
      time: '0900',
      frequency: 'daily',
      instructions: 'Inspect catheter securement on right thigh, verify clear amber output.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-hk-02',
      residentId: 'res-310',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.continence.catheter_bag_empty',
      title: 'Catheter Bag Emptying',
      category: 'Continence & Toileting',
      time: '1400',
      frequency: 'daily',
      instructions: 'Empty Foley drainage bag and note volume on flow sheet.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Irene Lockwood (320)
    {
      id: 'task-il-01',
      residentId: 'res-320',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.monitoring.weekly_weight',
      title: 'Weekly Weight',
      category: 'Health Monitoring',
      time: '0730',
      frequency: 'weekly',
      recurrenceRule: {
        basis: 'selected_weekdays',
        selectedDays: [1] // Monday
      },
      instructions: 'Weigh in chair scale before breakfast.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'task-il-02',
      residentId: 'res-320',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.nutrition.meal_assist',
      title: 'Meal Assistance',
      category: 'Nutrition & Hydration',
      time: '0815',
      frequency: 'daily',
      instructions: 'Minced diet with nectar thick fluids; cue resident slowly.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Kathleen O’Connor (332)
    {
      id: 'task-ko-01',
      residentId: 'res-332',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'lpn.injection.sc_injection',
      title: 'Scheduled SC Injection',
      category: 'Injection',
      time: '0900',
      frequency: 'daily',
      instructions: 'Administer Fragmin 5000 IU SC in abdominal subcutaneous tissue.',
      priority: 'high',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Leonard Sterling (335)
    {
      id: 'task-ls-01',
      residentId: 'res-335',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.nutrition.hydration_round',
      title: 'Hydration Round',
      category: 'Nutrition & Hydration',
      time: '1030',
      frequency: 'daily',
      instructions: 'Offer cranberry juice or cold water; encourage at least 150ml.',
      priority: 'normal',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // Grace Holloway (305) — demonstrates a tracking ResidentTask explicitly
    // opted into Dashboard/Huddle visibility (Operational Visibility), while
    // remaining an ordinary task that still routes to its shift/print.
    {
      id: 'task-gh-01',
      residentId: 'res-305',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'hca.tracking.behavior',
      title: 'Behaviour Tracking',
      category: 'Health Monitoring',
      time: '1400',
      frequency: 'daily',
      recurrenceRule: { startDate: todayStr, endDate: addDaysToDateStr(todayStr, 5), endType: 'on_date' },
      trackingConfig: { kind: 'behavior' },
      instructions: 'Record objective behaviour, possible trigger, intervention, and response on the authorized behaviour record; promptly report safety concerns.',
      priority: 'high',
      showOnDashboard: true,
      showInHuddle: true,
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    }
  ];

  // Unit Tasks for LPN Day & HCA Day
  const unitTasks: UnitTask[] = [
    {
      id: 'ut-lpn-01',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-receive-handoff',
      title: 'Receive Shift Handoff',
      category: 'Start of Shift',
      shiftPhase: 'start',
      time: '0700',
      frequency: 'daily',
      resultType: 'confirmation',
      instructions: 'Receive verbal report from night nurse regarding acute changes and PRNs.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-lpn-02',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-narcotic-count-in',
      title: 'Controlled Medication Count — Incoming',
      category: 'Start of Shift',
      shiftPhase: 'start',
      time: '0705',
      frequency: 'daily',
      resultType: 'confirmation',
      resultConfig: {
        passLabel: 'Count Reconciled / OK',
        issueLabel: 'Discrepancy Noted'
      },
      instructions: 'Dual count with outgoing nurse. Sign controlled drug register.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-lpn-03',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-fridge-temp',
      title: 'Medication Fridge Temperature',
      category: 'Start of Shift',
      shiftPhase: 'start',
      time: '0730',
      frequency: 'daily',
      resultType: 'temperature',
      resultConfig: {
        unit: '°C',
        min: 2.0,
        max: 8.0
      },
      instructions: 'Verify digital reading (2.0°C - 8.0°C). Report any excursion immediately.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-lpn-04',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-emergency-equipment',
      title: 'Emergency Equipment Check',
      category: 'Start of Shift',
      shiftPhase: 'start',
      time: '0745',
      frequency: 'daily',
      resultType: 'pass_issue',
      resultConfig: {
        passLabel: 'Seals Intact & Operational',
        issueLabel: 'Issue / Restock Needed'
      },
      instructions: 'Check emergency bag, suction canister, and AED battery indicator.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-lpn-05',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-supply-check',
      title: 'Equipment / Supply Check',
      category: 'During Shift',
      shiftPhase: 'during',
      time: '1300',
      frequency: 'daily',
      resultType: 'confirmation',
      instructions: 'Check treatment cart dressings, syringes, and clinical supplies.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-lpn-06',
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: 'unit-narcotic-count-out',
      title: 'Controlled Medication Count — Outgoing',
      category: 'End of Shift',
      shiftPhase: 'end',
      time: '1855',
      frequency: 'daily',
      resultType: 'confirmation',
      resultConfig: {
        passLabel: 'Count Reconciled / OK',
        issueLabel: 'Discrepancy Noted'
      },
      instructions: 'Dual count with incoming nurse before leaving.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },

    // HCA Day Unit Tasks
    {
      id: 'ut-hca-01',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'unit-receive-handoff',
      title: 'Receive Shift Handoff',
      category: 'Start of Shift',
      shiftPhase: 'start',
      time: '0700',
      frequency: 'daily',
      resultType: 'confirmation',
      instructions: 'Review assignments, shower lists, and special hydration needs.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-hca-02',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'unit-supply-check',
      title: 'Equipment / Supply Check',
      category: 'During Shift',
      shiftPhase: 'during',
      time: '1330',
      frequency: 'daily',
      resultType: 'confirmation',
      instructions: 'Restock clean towels, washcloths, and gloves on the floor cart.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'ut-hca-03',
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: 'unit-review-outstanding-tasks',
      title: 'Review Outstanding Tasks & Evening Handoff',
      category: 'End of Shift',
      shiftPhase: 'end',
      time: '1450',
      frequency: 'daily',
      resultType: 'confirmation',
      instructions: 'Hand over completed care notes and highlight any resident appetite changes to evening HCA.',
      isActive: true,
      createdAt: todayStr,
      source: 'demo'
    }
  ];

  // FYIs (Standing Information)
  const fyis: FYI[] = [
    {
      id: 'fyi-shared-01',
      text: 'Pharmacy delivery cutoff is updated to 14:00 daily. All special orders must be faxed before 13:30.',
      category: 'communication',
      importance: 'high',
      effectiveDate: todayStr,
      version: 1,
      status: 'active',
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'fyi-res-254-01',
      residentId: 'res-254',
      roleId: ROLE_HCA_ID,
      text: 'Mary prefers shower after breakfast rather than early morning. Use lavender body wash located on bathroom shelf.',
      category: 'preference',
      importance: 'normal',
      effectiveDate: todayStr,
      version: 1,
      status: 'active',
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'fyi-res-329b-01',
      residentId: 'res-329b',
      text: 'Strict 2-person assist for all bed-to-chair transfers. Transfer belt required at all times.',
      category: 'safety',
      importance: 'urgent',
      effectiveDate: todayStr,
      version: 1,
      status: 'active',
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'fyi-res-329b-02',
      residentId: 'res-329b',
      roleId: ROLE_LPN_ID,
      text: 'Daughter (power of attorney) requests phone call before any new antibiotic or pain medication is initiated.',
      category: 'protocol',
      importance: 'high',
      effectiveDate: todayStr,
      version: 1,
      status: 'active',
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'fyi-res-103a-01',
      residentId: 'res-103a',
      text: 'Son brings diabetic treats on weekend visits; check blood glucose before dinner on Saturday & Sunday.',
      category: 'medical',
      importance: 'normal',
      effectiveDate: todayStr,
      version: 1,
      status: 'active',
      createdAt: todayStr,
      source: 'demo'
    }
  ];

  // Wounds
  const wounds: Wound[] = [
    {
      id: 'wound-wh-01',
      residentId: 'res-329b',
      shiftId: SHIFT_LPN_DAY_ID,
      time: '1000',
      siteLocation: 'Left Lower Leg (Venous Ulcer)',
      status: 'active',
      firstAction: 'treatment',
      frequency: 'daily',
      bathingRelation: 'independent',
      instructions: 'Cleanse with sterile normal saline, apply Cavilon barrier film to periwound, cover with Mepilex Border foam dressing.',
      createdAt: todayStr,
      source: 'demo'
    },
    {
      id: 'wound-ms-01',
      residentId: 'res-254',
      shiftId: SHIFT_LPN_DAY_ID,
      time: '1000',
      siteLocation: 'Right Forearm Skin Tear',
      status: 'healing',
      firstAction: 'dressing_change',
      frequency: 'selected_days',
      recurrenceRule: {
        basis: 'selected_weekdays',
        selectedDays: [1, 4] // Mon, Thu
      },
      bathingRelation: 'after_bath',
      instructions: 'Gentle saline cleanse, re-approximate skin flap, apply Adaptic non-adherent dressing and wrap lightly with tubular bandage.',
      createdAt: todayStr,
      source: 'demo'
    }
  ];

  // Realistic partial completions for today (demo shows some already done)
  const completions: Completion[] = [
    {
      id: 'comp-ut-01',
      date: todayStr,
      shiftId: SHIFT_LPN_DAY_ID,
      entityType: 'unit_task',
      entityId: 'ut-lpn-01',
      completedAt: `${todayStr}T07:05:00Z`,
      completedBy: 'Sarah Jenkins, LPN',
      resultValue: true,
      resultNote: 'Handoff received from Night Nurse Jane.',
      status: 'completed'
    },
    {
      id: 'comp-task-01',
      date: todayStr,
      shiftId: SHIFT_LPN_DAY_ID,
      entityType: 'resident_task',
      entityId: 'task-cd-01',
      residentId: 'res-103a',
      completedAt: `${todayStr}T07:35:00Z`,
      completedBy: 'Sarah Jenkins, LPN',
      resultValue: '5.8',
      resultNote: 'Fasting BG 5.8 mmol/L - within normal target.',
      status: 'completed'
    }
  ];

  return {
    residents,
    residentTasks,
    unitTasks,
    fyis,
    wounds,
    completions
  };
}
