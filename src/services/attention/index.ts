import { 
  TaskAttentionIndicator, 
  MealRelation, 
  AttentionIndicatorMetadata, 
  TaskAttentionConfig, 
  FacilityAttentionRule 
} from '../../types';

export const DEFAULT_ATTENTION_RULES: FacilityAttentionRule[] = [
  {
    id: 'rule_insulin',
    name: 'Insulin Administration',
    pattern: '\\b(insulin|glargine|lispro|aspart|humalog|novorapid|lantus|levemir)\\b',
    indicators: ['HIGH_ALERT', 'TIME_CRITICAL'],
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_blood_glucose',
    name: 'Blood Glucose / BG Checks',
    pattern: '\\b(bg|blood glucose|glucometer|fingerstick|dextrostix)\\b',
    indicators: ['OBSERVE', 'TIME_CRITICAL', 'DOC_REF'],
    docRefNote: 'Record BG in MAR / Flow Sheet',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_heparin_anticoag',
    name: 'Anticoagulants / High Alert Injections',
    pattern: '\\b(heparin|dalteparin|fragmin|enoxaparin|lovenox|warfarin|coumadin|anticoagulant)\\b',
    indicators: ['HIGH_ALERT', 'TIME_CRITICAL', 'DOC_REF'],
    docRefNote: 'Record site and dose on MAR',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_pain_reassess',
    name: 'Pain Reassessment',
    pattern: '\\b(pain reassess(ment)?|prn.*effectiveness|reassess.*pain)\\b',
    indicators: ['FOLLOW_UP', 'DOC_REF'],
    docRefNote: 'Document PRN effectiveness in clinical record',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_pain_assess',
    name: 'Pain Assessment',
    pattern: '\\b(pain assess(ment)?|pain observation|monitor.*pain)\\b',
    indicators: ['OBSERVE', 'DOC_REF'],
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_two_person',
    name: 'Two-Person Assist',
    pattern: '\\b(two[- ]person|2[- ]person|2p\\b|dual assist)\\b',
    indicators: ['TWO_PERSON', 'EQUIPMENT'],
    equipmentNote: 'Transfer belt / partner required',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_mechanical_lift',
    name: 'Mechanical Lift Transfer',
    pattern: '\\b(mechanical lift|hoyer|sara|ceiling lift|sit[- ]to[- ]stand lift|lift sling)\\b',
    indicators: ['TWO_PERSON', 'EQUIPMENT'],
    equipmentNote: 'Inspect lift sling & ensure 2-person operation',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_transfer_belt',
    name: 'Transfer Belt',
    pattern: '\\b(transfer belt|gait belt)\\b',
    indicators: ['EQUIPMENT'],
    equipmentNote: 'Transfer belt required',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_wound_care',
    name: 'Wound Treatment & Dressing',
    pattern: '\\b(wound|dressing change|ulcer|skin tear|sterile dressing|packing)\\b',
    indicators: ['PRECAUTION', 'FOLLOW_UP', 'DOC_REF'],
    docRefNote: 'Document wound measurements/observations in clinical chart',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_catheter_drainage',
    name: 'Catheter Care & Output',
    pattern: '\\b(catheter|foley|indwelling catheter|suprapubic|catheter bag)\\b',
    indicators: ['OBSERVE', 'DOC_REF'],
    docRefNote: 'Record output volume & appearance on flow sheet',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_oxygen_spo2',
    name: 'Oxygen & SpO2 Monitoring',
    pattern: '\\b(oxygen|o2|spo2|pulse oximeter|nasal cannula)\\b',
    indicators: ['OBSERVE'],
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_compression_stockings',
    name: 'Compression Stockings',
    pattern: '\\b(compression stocking|ted hose|tubigrip)\\b',
    indicators: ['TIME_CRITICAL', 'EQUIPMENT'],
    equipmentNote: 'Apply stocking aid if required',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_before_meal',
    name: 'Before Meal Timing',
    pattern: '\\b(before (breakfast|lunch|supper|meal|eating)|ac\\b|pre[- ]meal)\\b',
    indicators: ['MEAL_LINKED', 'TIME_CRITICAL'],
    mealRelation: 'BEFORE_MEAL',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_with_meal',
    name: 'With Meal Timing',
    pattern: '\\b(with (breakfast|lunch|supper|meal|food)|during meal)\\b',
    indicators: ['MEAL_LINKED'],
    mealRelation: 'WITH_MEAL',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'rule_after_meal',
    name: 'After Meal Timing',
    pattern: '\\b(after (breakfast|lunch|supper|meal|eating)|pc\\b|post[- ]meal)\\b',
    indicators: ['MEAL_LINKED', 'TIME_CRITICAL'],
    mealRelation: 'AFTER_MEAL',
    isActive: true,
    isSystem: true,
  },
];

export interface DetectionResult {
  suggestedIndicators: TaskAttentionIndicator[];
  matchedRules: { ruleName: string; triggerPattern: string; indicators: TaskAttentionIndicator[] }[];
  mealRelation?: MealRelation;
  equipmentNote?: string;
  docRefNote?: string;
  metadata: AttentionIndicatorMetadata[];
}

/**
 * Heuristic catastrophic-backtracking guard for facility-entered patterns: rejects a
 * quantified group that itself contains another quantifier (e.g. (a+)+, (\w*)+,
 * ([a-z]+){2,}) — the classic ReDoS shape that can hang the JS thread on certain text.
 */
export function isUnsafeAttentionPattern(pattern: string): boolean {
  return /\([^()]*[+*][^()]*\)\s*(?:[+*]|\{\s*\d+\s*,?\s*\d*\s*\})/.test(pattern);
}

/** Returns a user-facing error message if the pattern is empty, unsafe, or invalid; null if OK. */
export function validateAttentionPattern(pattern: string): string | null {
  if (!pattern.trim()) return 'Pattern cannot be empty.';
  if (isUnsafeAttentionPattern(pattern)) {
    return 'This pattern contains a nested repeated group (for example "(a+)+"), which can freeze the app while matching certain text. Simplify the pattern and try again.';
  }
  try {
    new RegExp(pattern, 'i');
  } catch {
    return 'This is not a valid pattern. Check the syntax and try again.';
  }
  return null;
}

/**
 * Smart Attention Detection Engine
 * Analyzes title and instructions against catalog rules / facility rules.
 */
export function detectAttentionIndicators(
  title: string,
  instructions?: string,
  customRules?: FacilityAttentionRule[]
): DetectionResult {
  const text = `${title} ${instructions || ''}`.trim();
  const rules = customRules || DEFAULT_ATTENTION_RULES;

  const indicatorsSet = new Set<TaskAttentionIndicator>();
  const matchedRules: { ruleName: string; triggerPattern: string; indicators: TaskAttentionIndicator[] }[] = [];
  const metadata: AttentionIndicatorMetadata[] = [];
  let mealRelation: MealRelation | undefined = undefined;
  let equipmentNote: string | undefined = undefined;
  let docRefNote: string | undefined = undefined;

  rules.filter(r => r.isActive).forEach(rule => {
    if (isUnsafeAttentionPattern(rule.pattern)) return;
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(text)) {
        matchedRules.push({
          ruleName: rule.name,
          triggerPattern: rule.pattern,
          indicators: rule.indicators,
        });

        rule.indicators.forEach(ind => {
          indicatorsSet.add(ind);
          metadata.push({
            indicator: ind,
            reason: `Detected from "${rule.name}"`,
            source: 'smart_suggestion',
            mealRelation: rule.mealRelation,
            equipmentNote: rule.equipmentNote,
            docRefNote: rule.docRefNote,
          });
        });

        if (rule.mealRelation && !mealRelation) mealRelation = rule.mealRelation;
        if (rule.equipmentNote && !equipmentNote) equipmentNote = rule.equipmentNote;
        if (rule.docRefNote && !docRefNote) docRefNote = rule.docRefNote;
      }
    } catch {
      // ignore invalid regex in custom rules
    }
  });

  return {
    suggestedIndicators: Array.from(indicatorsSet),
    matchedRules,
    mealRelation,
    equipmentNote,
    docRefNote,
    metadata,
  };
}

/**
 * Visual badge details (Color, shape, tooltip, paper abbreviation)
 */
export function getIndicatorBadgeDetails(
  indicator: TaskAttentionIndicator,
  mealRelation?: MealRelation
): {
  code: string;
  label: string;
  shortAbbreviation: string;
  tooltip: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: 'alert-triangle' | 'clock' | 'utensils' | 'users' | 'file-edit' | 'eye' | 'shield' | 'tool' | 'clipboard';
} {
  switch (indicator) {
    case 'HIGH_ALERT':
      return {
        code: 'HA',
        label: 'High Alert',
        shortAbbreviation: 'HA',
        tooltip: 'High Alert — Requires extra clinical caution & policy adherence',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-300',
        iconName: 'alert-triangle',
      };
    case 'TIME_CRITICAL':
      return {
        code: 'TC',
        label: 'Time-Critical',
        shortAbbreviation: 'TC',
        tooltip: 'Time-Critical — Must be performed close to scheduled time',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-300',
        iconName: 'clock',
      };
    case 'MEAL_LINKED': {
      const relLabel = mealRelation === 'BEFORE_MEAL' ? 'Before Meal' : mealRelation === 'AFTER_MEAL' ? 'After Meal' : 'Meal-Linked';
      const relCode = mealRelation === 'BEFORE_MEAL' ? 'BM' : mealRelation === 'AFTER_MEAL' ? 'AM' : 'ML';
      return {
        code: relCode,
        label: relLabel,
        shortAbbreviation: relCode,
        tooltip: `${relLabel} — Coordinated with meal service`,
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        badgeBorder: 'border-teal-300',
        iconName: 'utensils',
      };
    }
    case 'TWO_PERSON':
      return {
        code: '2P',
        label: 'Two-Person Assist',
        shortAbbreviation: '2P',
        tooltip: 'Two-Person Assist — Requires two staff for safe execution',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-300',
        iconName: 'users',
      };
    case 'FOLLOW_UP':
      return {
        code: 'FU',
        label: 'Follow-Up Required',
        shortAbbreviation: 'FU',
        tooltip: 'Follow-Up Required — Reassessment or effectiveness check needed',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-300',
        iconName: 'file-edit',
      };
    case 'OBSERVE':
      return {
        code: 'OB',
        label: 'Observe / Monitor',
        shortAbbreviation: 'OB',
        tooltip: 'Observe / Monitor — Requires focused observation & findings recording',
        badgeBg: 'bg-cyan-50',
        badgeText: 'text-cyan-700',
        badgeBorder: 'border-cyan-300',
        iconName: 'eye',
      };
    case 'PRECAUTION':
      return {
        code: 'IC',
        label: 'Precaution',
        shortAbbreviation: 'IC',
        tooltip: 'Precaution / Infection Control — Follow PPE & isolation protocols',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-700',
        badgeBorder: 'border-orange-300',
        iconName: 'shield',
      };
    case 'EQUIPMENT':
      return {
        code: 'EQ',
        label: 'Equipment Required',
        shortAbbreviation: 'EQ',
        tooltip: 'Equipment Required — Prepare transfer belt, lift sling, or kit',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-300',
        iconName: 'tool',
      };
    case 'DOC_REF':
      return {
        code: 'DOC',
        label: 'Record on Form',
        shortAbbreviation: 'DOC',
        tooltip: 'Record on Facility Form — Chart on MAR, flow sheet, or binder',
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-700',
        badgeBorder: 'border-indigo-300',
        iconName: 'clipboard',
      };
  }
}

/**
 * Returns paper-safe print tags for a given task (e.g. ['[HA]', '[TC]', '[BM]'])
 */
export function getPrintAttentionTags(config?: TaskAttentionConfig): string[] {
  if (!config || !config.indicators || config.indicators.length === 0) return [];
  return config.indicators.map(ind => {
    const details = getIndicatorBadgeDetails(ind, config.mealRelation);
    return `[${details.shortAbbreviation}]`;
  });
}

/**
 * Dynamic Print Legend Builder
 * Gathers all active indicator codes used on the sheet and builds a single-line concise legend.
 */
export function getPrintAttentionLegend(
  tasks: { attentionConfig?: TaskAttentionConfig }[]
): { code: string; label: string }[] {
  const codesUsed = new Set<string>();
  const legend: { code: string; label: string }[] = [];

  tasks.forEach(t => {
    if (t.attentionConfig?.indicators) {
      t.attentionConfig.indicators.forEach(ind => {
        const details = getIndicatorBadgeDetails(ind, t.attentionConfig?.mealRelation);
        if (!codesUsed.has(details.code)) {
          codesUsed.add(details.code);
          legend.push({
            code: `[${details.code}]`,
            label: details.label,
          });
        }
      });
    }
  });

  return legend;
}
