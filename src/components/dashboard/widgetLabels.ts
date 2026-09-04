import { DashboardWidgetId } from '../../types';

export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  unit_situation: 'Current Unit Situation',
  resident_attention: 'Resident Attention',
  resident_follow_up: 'Resident Follow-up',
  latest_fyi: 'Latest FYI',
  away_from_unit: 'Away From Unit',
  code_of_month: 'Code of the Month',
  todays_bathing: "Today's Bathing",
  wound_attention: 'Wound Attention',
};

/** One line each, shown under the toggle in Customize Dashboard — a
 *  first-time facility admin has no other way to know what a widget shows
 *  before turning it on. */
export const WIDGET_DESCRIPTIONS: Record<DashboardWidgetId, string> = {
  unit_situation: 'Active unit/site-scoped Attention items — outages, drills, temporary hazards.',
  resident_attention: 'Active resident-scoped Attention items needing staff awareness.',
  resident_follow_up: 'Resident tasks flagged to show on the Dashboard until resolved.',
  latest_fyi: 'Most recent standing FYI notes from the FYI Binder.',
  away_from_unit: 'Residents currently out on pass or in hospital.',
  code_of_month: "This month's featured emergency code, if enabled in Settings.",
  todays_bathing: "Count of residents scheduled for bathing today.",
  wound_attention: 'New or recently changed wound records needing a look.',
};
