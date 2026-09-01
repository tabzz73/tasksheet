import { db } from '../../db';
import {
  ReportDataSource,
  ReportFilterDefinition,
  ReportSortDefinition,
  SavedPrintPreset,
} from '../../types';
import { isDateDue, sortRoomNumbers } from '../generator';
import { formatRecurrenceHuman, getTodayLocalDateString, formatLocalDate } from '../recurrence';
import { buildBathingScheduleModel } from '../print/specializedDocs';
import { coverageDisplayName, coverageIndicator, isCoverageActiveOnDate, normalizeCoverage } from '../coverage';

export interface ReportFieldDefinition {
  id: string;
  label: string;
  privacy: 'approved_identity' | 'operational' | 'configuration';
  default?: boolean;
}

export interface ReportRow {
  id: string;
  values: Record<string, string | number | boolean | null | undefined>;
}

export interface ReportDefinition extends Omit<SavedPrintPreset, 'createdAt' | 'updatedAt'> {
  category: 'Residents' | 'Wound Care' | 'Care & Tasks' | 'FYI' | 'Facility / Setup' | 'Bathing' | 'Custom';
  description: string;
  system: boolean;
}

export interface CustomReportModel {
  definition: ReportDefinition | SavedPrintPreset;
  title: string;
  sourceLabel: string;
  columns: ReportFieldDefinition[];
  rows: ReportRow[];
  groups: Array<{ key: string; label: string; rows: ReportRow[] }>;
  generatedAt: string;
  coverage: string;
  filterSummary: string;
  estimatedPages: number;
  largeReport: boolean;
  facility: ReturnType<typeof db.getState>['facility'];
  summaryItems?: Array<{ label: string; value: number }>;
}

const field = (id: string, label: string, privacy: ReportFieldDefinition['privacy'] = 'operational', defaultField = false): ReportFieldDefinition => ({ id, label, privacy, default: defaultField });

export const REPORT_SOURCE_LABELS: Record<ReportDataSource, string> = {
  residents: 'Residents', resident_care: 'Resident Care', recurring_care: 'Recurring Care Schedule', care_tasks: 'Care Tasks', unit_tasks: 'Unit Tasks', shifts: 'Shifts', rooms: 'Rooms', fyis: 'FYIs', wounds: 'Wounds', wound_supplies: 'Wound Supplies', care_catalog: 'Care Catalog', bathing: 'Bathing',
};

export const REPORT_FIELDS: Record<ReportDataSource, ReportFieldDefinition[]> = {
  residents: [field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('firstName', 'First Name', 'approved_identity'), field('lastName', 'Last Name', 'approved_identity'), field('status', 'Status'), field('shift', 'Assigned Shift'), field('careCount', 'Care Tasks'), field('hasCare', 'Has Care'), field('hasHcaCare', 'HCA Care'), field('hasLpnCare', 'LPN Care'), field('hasWounds', 'Wounds'), field('hasRecurringCare', 'Recurring Care')],
  resident_care: [field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('role', 'Role', 'operational', true), field('shift', 'Shift', 'operational', true), field('time', 'Time', 'operational', true), field('task', 'Task', 'operational', true), field('coverage', 'Service Coverage', 'operational', true), field('coverageCode', 'Coverage Code'), field('additional', 'Additional Service'), field('coverageDates', 'Coverage Dates'), field('coverageEnd', 'Coverage End'), field('category', 'Category'), field('frequency', 'Frequency', 'configuration', true), field('instructions', 'Important Information', 'operational', true)],
  recurring_care: [field('date', 'Date', 'operational', true), field('time', 'Time', 'operational', true), field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('task', 'Task', 'operational', true), field('role', 'Role', 'operational', true), field('shift', 'Shift', 'operational', true), field('frequency', 'Frequency', 'configuration')],
  care_tasks: [field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('task', 'Task', 'operational', true), field('coverage', 'Service Coverage', 'operational', true), field('coverageCode', 'Coverage Code'), field('additional', 'Additional Service'), field('coverageDates', 'Coverage Dates'), field('coverageEnd', 'Coverage End'), field('category', 'Category', 'configuration', true), field('role', 'Role'), field('shift', 'Shift', 'operational', true), field('time', 'Time', 'operational', true), field('frequency', 'Frequency'), field('active', 'Active')],
  unit_tasks: [field('role', 'Role', 'configuration', true), field('shift', 'Shift', 'configuration', true), field('phase', 'Phase', 'configuration', true), field('time', 'Time', 'configuration', true), field('task', 'Task', 'configuration', true), field('category', 'Category'), field('frequency', 'Frequency'), field('active', 'Active')],
  shifts: [field('shift', 'Shift', 'configuration', true), field('name', 'Name', 'configuration', true), field('role', 'Role', 'configuration', true), field('start', 'Start', 'configuration', true), field('end', 'End', 'configuration', true), field('active', 'Active')],
  rooms: [field('room', 'Room / Bed', 'approved_identity', true), field('physicalRoom', 'Physical Room', 'configuration'), field('position', 'Position', 'configuration'), field('area', 'Area / Wing', 'configuration'), field('resident', 'Resident', 'approved_identity', true), field('status', 'Resident Status', 'operational', true), field('availability', 'Availability', 'operational', true)],
  fyis: [field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('category', 'Category', 'operational', true), field('importance', 'Importance', 'operational', true), field('text', 'Information', 'operational', true), field('role', 'Role'), field('shift', 'Shift'), field('status', 'Status')],
  wounds: [field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('location', 'Location', 'operational', true), field('protocol', 'Protocol', 'operational', true), field('shift', 'Shift', 'operational', true), field('time', 'Time'), field('schedule', 'Schedule', 'configuration', true), field('assessment', 'Assessment Requirement'), field('supplies', 'Supplies'), field('status', 'Status')],
  wound_supplies: [field('product', 'Product', 'configuration', true), field('manufacturer', 'Manufacturer', 'configuration', true), field('category', 'Category', 'configuration', true), field('size', 'Size', 'configuration', true), field('unit', 'Unit', 'configuration', true), field('packageSize', 'Package Size'), field('facilityStock', 'Facility Stock'), field('reorderLevel', 'Reorder Level'), field('status', 'Status'), field('inUse', 'Currently In Use')],
  care_catalog: [field('task', 'Task', 'configuration', true), field('category', 'Category', 'configuration', true), field('role', 'Role', 'configuration', true), field('defaultTime', 'Default Time'), field('defaultFrequency', 'Default Frequency'), field('instructions', 'Default Instructions'), field('active', 'Active')],
  bathing: [field('complete', '☐'), field('room', 'Room', 'approved_identity', true), field('resident', 'Resident', 'approved_identity', true), field('bathingType', 'Bathing Type', 'operational', true), field('frequency', 'Frequency / Week', 'configuration', true), field('scheduledDay', 'Scheduled Day', 'operational', true), field('shift', 'Shift Line', 'operational', true), field('time', 'Time'), field('assistance', 'Assistance / Important Information'), field('notes', 'Notes'), field('scheduled', 'Scheduled'), field('required', 'Required / Week'), field('scheduledCount', 'Scheduled / Week'), field('missing', 'Missing'), field('capacity', 'Capacity'), field('available', 'Available Slots'), field('rowType', 'Record Type')],
};

const preset = (id: string, name: string, category: ReportDefinition['category'], dataSource: ReportDataSource, columns: string[], description: string, filters: ReportFilterDefinition[] = [], grouping = '', sorting: ReportSortDefinition[] = [{ field: 'room', direction: 'asc', naturalRoom: true }], layout: ReportDefinition['layout'] = 'auto'): ReportDefinition => ({ id, name, category, dataSource, columns, description, filters, grouping, sorting, layout, density: 'standard', system: true });

/** N local calendar days after today, as 'YYYY-MM-DD'. */
const localDatePlusDays = (days: number): string => {
  const [y, m, d] = getTodayLocalDateString().split('-').map(Number);
  return formatLocalDate(new Date(y, m - 1, d + days));
};

export const SYSTEM_REPORT_PRESETS: ReportDefinition[] = [
  preset('resident-census', 'Resident Census', 'Residents', 'residents', ['room', 'resident', 'status'], 'Current occupied census, including temporary hospital/pass statuses.', [{ field: 'currentOccupancy', operator: 'is_true' }]),
  preset('resident-directory', 'Resident Directory', 'Residents', 'residents', ['room', 'resident'], 'Active residents in natural room order.', [{ field: 'status', operator: 'equals', value: 'Active' }]),
  preset('residents-by-status', 'Residents by Status', 'Residents', 'residents', ['room', 'resident', 'status'], 'Resident lifecycle and operational status.', [], 'status'),
  preset('residents-with-care', 'Residents With Care', 'Residents', 'residents', ['room', 'resident', 'careCount', 'shift'], 'Active residents with configured care.', [{ field: 'status', operator: 'equals', value: 'Active' }, { field: 'hasCare', operator: 'is_true' }]),
  preset('residents-without-care', 'Residents Without Care', 'Residents', 'residents', ['room', 'resident', 'status'], 'Configuration gap: active residents without care tasks.', [{ field: 'status', operator: 'equals', value: 'Active' }, { field: 'hasCare', operator: 'is_false' }]),
  preset('residents-without-hca', 'Residents Without HCA Care', 'Residents', 'residents', ['room', 'resident', 'careCount'], 'Configuration gap: active residents without HCA care.', [{ field: 'status', operator: 'equals', value: 'Active' }, { field: 'hasHcaCare', operator: 'is_false' }]),
  preset('residents-without-lpn', 'Residents Without LPN Care', 'Residents', 'residents', ['room', 'resident', 'careCount'], 'Configuration gap: active residents without LPN care.', [{ field: 'status', operator: 'equals', value: 'Active' }, { field: 'hasLpnCare', operator: 'is_false' }]),
  preset('residents-with-wounds', 'Residents With Wounds', 'Residents', 'residents', ['room', 'resident', 'status'], 'Residents with current wound protocols.', [{ field: 'hasWounds', operator: 'is_true' }]),
  preset('resident-care-summary', 'Resident Care Summary', 'Residents', 'resident_care', ['room', 'resident', 'role', 'shift', 'time', 'task', 'frequency', 'instructions'], 'Configured care picture for workflow review.', [{ field: 'active', operator: 'is_true' }], 'resident'),
  preset('resident-care-profile', 'Individual Resident Care Profile', 'Residents', 'resident_care', ['room', 'resident', 'role', 'shift', 'time', 'task', 'frequency', 'instructions'], 'Select a resident in the Custom Builder to print one approved care profile.', [{ field: 'active', operator: 'is_true' }], 'role'),
  preset('active-wounds', 'Active Wounds List', 'Wound Care', 'wounds', ['room', 'resident', 'location', 'protocol', 'shift', 'schedule', 'assessment'], 'Current active and healing wound protocols.', [{ field: 'current', operator: 'is_true' }], '', [{ field: 'room', direction: 'asc', naturalRoom: true }], 'landscape'),
  preset('wounds-without-protocol', 'Active Wounds Without Protocol', 'Wound Care', 'wounds', ['room', 'resident', 'location', 'shift', 'schedule'], 'Configuration gap: current wounds without a protocol.', [{ field: 'current', operator: 'is_true' }, { field: 'protocol', operator: 'is_empty' }]),
  preset('wounds-without-supplies', 'Active Wounds Without Supplies', 'Wound Care', 'wounds', ['room', 'resident', 'location', 'protocol', 'shift'], 'Configuration gap: current wounds without supplies.', [{ field: 'current', operator: 'is_true' }, { field: 'supplies', operator: 'is_empty' }]),
  preset('wounds-without-schedule', 'Active Wounds Without Schedule', 'Wound Care', 'wounds', ['room', 'resident', 'location', 'protocol', 'shift', 'time'], 'Configuration gap: current wounds without shift/time.', [{ field: 'current', operator: 'is_true' }, { field: 'validSchedule', operator: 'is_false' }]),
  preset('wound-supply-catalog', 'Wound Supply Catalog', 'Wound Care', 'wound_supplies', ['product', 'manufacturer', 'category', 'size', 'unit', 'packageSize', 'facilityStock', 'reorderLevel', 'status'], 'Configurable facility wound product catalog.', [], 'category', [{ field: 'product', direction: 'asc' }], 'landscape'),
  preset('wound-products-in-use', 'Wound Products Currently In Use', 'Wound Care', 'wound_supplies', ['product', 'manufacturer', 'category', 'size', 'unit', 'facilityStock'], 'Catalog products attached to current wound protocols.', [{ field: 'inUse', operator: 'is_true' }], 'category', [{ field: 'product', direction: 'asc' }], 'landscape'),
  preset('care-task-list', 'Care Tasks by Shift', 'Care & Tasks', 'care_tasks', ['room', 'resident', 'role', 'shift', 'time', 'task', 'frequency'], 'Configured resident care tasks.', [{ field: 'active', operator: 'is_true' }], 'shift', [{ field: 'shift', direction: 'asc' }, { field: 'time', direction: 'asc' }], 'landscape'),
  preset('private-pay-services', 'Current Private Pay Services', 'Care & Tasks', 'resident_care', ['room', 'resident', 'task', 'shift', 'time', 'frequency', 'coverageDates'], 'Current private-pay service classifications without financial or billing data.', [{ field: 'active', operator: 'is_true' }, { field: 'coverageCode', operator: 'equals', value: 'PRIVATE_PAY' }], 'resident'),
  preset('coverage-expiring', 'Coverage Expiring Soon', 'Care & Tasks', 'resident_care', ['room', 'resident', 'task', 'coverage', 'coverageDates'], 'Services with a configured coverage end date.', [{ field: 'active', operator: 'is_true' }, { field: 'coverageEnd', operator: 'not_empty' }], 'coverage'),
  { ...preset('recurring-care-schedule', 'Recurring Care Schedule', 'Care & Tasks', 'recurring_care', ['date', 'time', 'room', 'resident', 'task', 'role', 'shift'], 'Due recurring resident care across a selected date range.', [], 'date', [{ field: 'date', direction: 'asc' }, { field: 'time', direction: 'asc' }], 'landscape'), dateRange: { start: getTodayLocalDateString(), end: localDatePlusDays(6) } },
  preset('unit-task-catalog', 'Unit Task Catalog', 'Care & Tasks', 'unit_tasks', ['role', 'shift', 'phase', 'time', 'task', 'frequency', 'active'], 'Configured unit responsibilities.', [], 'shift', [{ field: 'shift', direction: 'asc' }, { field: 'time', direction: 'asc' }], 'landscape'),
  preset('care-catalog', 'Care Task Catalog', 'Care & Tasks', 'care_catalog', ['task', 'category', 'role', 'defaultTime', 'defaultFrequency', 'instructions', 'active'], 'Available care task templates.', [], 'category', [{ field: 'task', direction: 'asc' }], 'landscape'),
  preset('inactive-care-tasks', 'Inactive Tasks', 'Care & Tasks', 'care_tasks', ['room', 'resident', 'task', 'role', 'shift', 'time'], 'Inactive resident care configuration.', [{ field: 'active', operator: 'is_false' }]),
  preset('tasks-without-valid-shift', 'Tasks Without Valid Shift', 'Care & Tasks', 'care_tasks', ['room', 'resident', 'task', 'role', 'time'], 'Configuration gap: active tasks without an active assigned shift.', [{ field: 'active', operator: 'is_true' }, { field: 'validShift', operator: 'is_false' }]),
  preset('tasks-without-valid-schedule', 'Tasks Without Valid Schedule', 'Care & Tasks', 'care_tasks', ['room', 'resident', 'task', 'shift', 'time', 'frequency'], 'Configuration gap: active tasks with incomplete schedule information.', [{ field: 'active', operator: 'is_true' }, { field: 'validSchedule', operator: 'is_false' }]),
  preset('fyi-current-list', 'Current FYI List', 'FYI', 'fyis', ['room', 'resident', 'category', 'importance', 'text', 'role', 'shift'], 'Current FYIs using approved TaskSheet resident identity fields.', [{ field: 'status', operator: 'equals', value: 'Active' }], '', [{ field: 'room', direction: 'asc', naturalRoom: true }], 'landscape'),
  preset('fyis-by-role', 'FYIs by Role', 'FYI', 'fyis', ['room', 'resident', 'category', 'importance', 'text', 'role'], 'Current FYIs grouped by configured role.', [{ field: 'status', operator: 'equals', value: 'Active' }], 'role', [{ field: 'room', direction: 'asc', naturalRoom: true }], 'landscape'),
  preset('fyis-by-shift', 'FYIs by Shift', 'FYI', 'fyis', ['room', 'resident', 'category', 'importance', 'text', 'shift'], 'Current FYIs grouped by configured shift.', [{ field: 'status', operator: 'equals', value: 'Active' }], 'shift', [{ field: 'room', direction: 'asc', naturalRoom: true }], 'landscape'),
  preset('shift-configuration-list', 'Shift Configuration', 'Facility / Setup', 'shifts', ['shift', 'name', 'role', 'start', 'end', 'active'], 'Current roles, shift lines and hours.', [], '', [{ field: 'start', direction: 'asc' }]),
  preset('room-directory', 'Room / Occupancy Directory', 'Facility / Setup', 'rooms', ['room', 'physicalRoom', 'position', 'area', 'availability'], 'Configured rooms and occupancy positions.', [], '', [{ field: 'room', direction: 'asc', naturalRoom: true }]),
  preset('available-rooms', 'Available Rooms / Occupancy Positions', 'Facility / Setup', 'rooms', ['room', 'area', 'availability'], 'Active room and bed positions currently available for assignment.', [{ field: 'available', operator: 'is_true' }], '', [{ field: 'room', direction: 'asc', naturalRoom: true }]),
  preset('bathing-assignment-detail', 'Bathing Assignment Detail', 'Bathing', 'bathing', ['complete', 'time', 'room', 'resident', 'bathingType', 'assistance', 'notes'], 'Detailed operational bathing assignment list.', [{ field: 'rowType', operator: 'equals', value: 'assignment' }], 'shift'),
  preset('residents-with-bathing', 'Residents With Bathing Care', 'Bathing', 'bathing', ['room', 'resident', 'bathingType', 'frequency', 'scheduledDay', 'shift'], 'Bathing requirements and assigned occurrences.', [{ field: 'rowType', operator: 'equals', value: 'summary' }], 'resident'),
  preset('bathing-capacity', 'Bathing Capacity / Open Slots', 'Bathing', 'bathing', ['scheduledDay', 'shift', 'scheduledCount', 'capacity', 'available'], 'Configured capacity and available bathing slots by day and shift line.', [{ field: 'rowType', operator: 'equals', value: 'capacity' }], '', [{ field: 'scheduledDay', direction: 'asc' }, { field: 'shift', direction: 'asc' }]),
  preset('bathing-gaps', 'Bathing Scheduling Gaps', 'Bathing', 'bathing', ['room', 'resident', 'required', 'scheduledCount', 'missing'], 'Operational warning for missing weekly bathing occurrences.', [{ field: 'rowType', operator: 'equals', value: 'summary' }, { field: 'missingPositive', operator: 'is_true' }]),
];

const residentName = (resident?: { firstName: string; lastName: string }) => resident ? `${resident.firstName} ${resident.lastName}` : '—';
const displayStatus = (value: string) => value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

function baseRows(source: ReportDataSource, dateRange?: { start: string; end: string }): ReportRow[] {
  const state = db.getState();
  const roleForShift = (shiftId?: string) => state.roles.find(role => role.id === state.shifts.find(shift => shift.id === shiftId)?.roleId);
  if (source === 'residents') return state.residents.map(resident => {
    const tasks = state.residentTasks.filter(task => task.residentId === resident.id && task.isActive !== false);
    const roleCodes = new Set(tasks.map(task => roleForShift(task.shiftId)?.code));
    const shifts = [...new Set(tasks.map(task => state.shifts.find(shift => shift.id === task.shiftId)?.shortCode).filter(Boolean))].join(', ');
    const wounds = state.wounds.filter(wound => wound.residentId === resident.id && ['active', 'healing'].includes(wound.status));
    return { id: resident.id, values: { room: resident.roomNumber, resident: residentName(resident), firstName: resident.firstName, lastName: resident.lastName, status: displayStatus(resident.status), currentOccupancy: Boolean(resident.occupancyPositionId) && !resident.roomAssignmentNeedsReview, shift: shifts, careCount: tasks.length, hasCare: tasks.length > 0, hasHcaCare: roleCodes.has('HCA'), hasLpnCare: roleCodes.has('LPN') || roleCodes.has('RN'), hasWounds: wounds.length > 0, hasRecurringCare: tasks.some(task => task.frequency !== 'once') } };
  });
  if (source === 'recurring_care') {
    const start = dateRange?.start || getTodayLocalDateString();
    const requestedEnd = dateRange?.end || start;
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${requestedEnd}T12:00:00`);
    const boundedEnd = new Date(Math.min(endDate.getTime(), startDate.getTime() + 90 * 86400000));
    const dates: string[] = [];
    for (const cursor = new Date(startDate); cursor <= boundedEnd; cursor.setDate(cursor.getDate() + 1)) dates.push(cursor.toISOString().slice(0, 10));
    return state.residentTasks
      .filter(task => task.isActive !== false && task.frequency !== 'once')
      .flatMap(task => {
        const resident = state.residents.find(item => item.id === task.residentId);
        if (!resident || resident.status !== 'active') return [];
        const shift = state.shifts.find(item => item.id === task.shiftId);
        const role = state.roles.find(item => item.id === (task.roleId || shift?.roleId));
        return dates
          .filter(date => isDateDue(date, task.frequency, task.recurrenceRule, task.createdAt) && isCoverageActiveOnDate(task.serviceCoverage, date))
          .map(date => ({ id: `${task.id}-${date}`, values: { date, time: task.time || '—', room: resident.roomNumber, resident: residentName(resident), task: `${coverageIndicator(task.serviceCoverage)} ${task.title}`.trim(), role: role?.code || role?.name || '—', shift: shift?.shortCode || 'Unassigned', frequency: formatRecurrenceHuman(task.recurrenceRule, task.frequency), coverage: coverageDisplayName(task.serviceCoverage), coverageCode: normalizeCoverage(task.serviceCoverage).type } }));
      });
  }
  if (source === 'resident_care' || source === 'care_tasks') return state.residentTasks.map(task => {
    const resident = state.residents.find(item => item.id === task.residentId);
    const shift = state.shifts.find(item => item.id === task.shiftId);
    const role = state.roles.find(item => item.id === shift?.roleId);
    const coverage = normalizeCoverage(task.serviceCoverage); const coverageDates = [coverage.startDate, coverage.endDate].filter(Boolean).join(' – ');
    return { id: task.id, values: { room: resident?.roomNumber || '', resident: residentName(resident), role: role?.code || role?.name || '—', shift: shift?.shortCode || 'Unassigned', time: task.time || '—', task: `${coverageIndicator(coverage)} ${task.title}`.trim(), coverage: coverageDisplayName(coverage), coverageCode: coverage.type, additional: Boolean(coverage.isAdditionalService), coverageDates, coverageEnd: coverage.endDate || '', category: task.category, frequency: formatRecurrenceHuman(task.recurrenceRule, task.frequency), instructions: task.instructions || '', active: task.isActive !== false, validShift: Boolean(shift && shift.isActive !== false), validSchedule: Boolean(shift && (task.time || task.isNoSpecificTime)) } };
  });
  if (source === 'unit_tasks') return state.unitTasks.map(task => {
    const shift = state.shifts.find(item => item.id === task.shiftId); const role = state.roles.find(item => item.id === (task.roleId || shift?.roleId));
    return { id: task.id, values: { role: role?.code || role?.name || '—', shift: shift?.shortCode || 'Unassigned', phase: displayStatus(task.shiftPhase), time: task.time || '—', task: task.title, category: task.category, frequency: formatRecurrenceHuman(task.recurrenceRule, task.frequency), active: task.isActive !== false } };
  });
  if (source === 'shifts') return state.shifts.map(shift => ({ id: shift.id, values: { shift: shift.shortCode, name: shift.name, role: state.roles.find(role => role.id === shift.roleId)?.name || '—', start: shift.startTime, end: shift.endTime, active: shift.isActive !== false } }));
  if (source === 'rooms') return state.occupancyPositions.map(position => {
    const room = state.rooms.find(item => item.id === position.roomId);
    const resident = state.residents.find(item => item.occupancyPositionId === position.id && ['active', 'in_hospital', 'out_on_pass', 'on_hold'].includes(item.status));
    const available = position.active !== false && !resident;
    return { id: position.id, values: { room: position.displayLabel, physicalRoom: room?.physicalRoomLabel || position.displayLabel, position: position.positionLabel || '—', area: room?.area || '', resident: residentName(resident), status: resident ? displayStatus(resident.status) : '—', availability: position.active === false ? 'Inactive' : available ? 'Available' : 'Occupied', available } };
  });
  if (source === 'fyis') return state.fyis.map(fyi => {
    const resident = state.residents.find(item => item.id === fyi.residentId); const role = state.roles.find(item => item.id === fyi.roleId); const shift = state.shifts.find(item => item.id === fyi.shiftId);
    return { id: fyi.id, values: { room: resident?.roomNumber || 'Unit', resident: resident ? residentName(resident) : 'All Residents', category: displayStatus(fyi.category), importance: displayStatus(fyi.importance), text: fyi.text, role: role?.code || 'All', shift: shift?.shortCode || 'All', status: displayStatus(fyi.status) } };
  });
  if (source === 'wounds') return state.wounds.map(wound => {
    const resident = state.residents.find(item => item.id === wound.residentId); const shift = state.shifts.find(item => item.id === wound.shiftId); const supplies = (wound.supplies || []).map(item => item.name).join('; ');
    return { id: wound.id, values: { room: resident?.roomNumber || '', resident: residentName(resident), location: wound.siteLocation, protocol: wound.protocol || wound.instructions || '', shift: shift?.shortCode || '', time: wound.time || '', schedule: formatRecurrenceHuman(wound.recurrenceRule, wound.frequency), assessment: displayStatus(wound.assessmentType || 'none'), supplies, status: displayStatus(wound.status), current: wound.status === 'active' || wound.status === 'healing', validSchedule: Boolean(shift && wound.time) } };
  });
  if (source === 'wound_supplies') {
    const used = new Set(state.wounds.filter(wound => wound.status === 'active' || wound.status === 'healing').flatMap(wound => (wound.supplies || []).map(item => item.catalogId).filter(Boolean)));
    return state.woundSupplyCatalog.map(product => ({ id: product.id, values: { product: product.productName, manufacturer: product.manufacturer, category: product.category, size: product.size || '', unit: product.unit, packageSize: product.packageSize || '', facilityStock: product.isFacilityStock, reorderLevel: product.defaultReorderLevel ?? '', status: displayStatus(product.localFormularyStatus || (product.isActive ? 'active' : 'inactive')), inUse: used.has(product.id) } }));
  }
  if (source === 'care_catalog') return state.catalogTaskTemplates.map(template => ({ id: template.slug, values: { task: template.title, category: state.catalogCategories.find(category => category.id === template.categoryId)?.name || template.categoryId, role: template.roleCode, defaultTime: template.defaultTime || '', defaultFrequency: template.defaultFrequency || '', instructions: template.defaultInstructions || '', active: template.isActive !== false } }));
  if (source === 'bathing') {
    const anchor = dateRange?.start || getTodayLocalDateString();
    const model = buildBathingScheduleModel(anchor);
    const bathingTasks = state.residentTasks.filter(task => task.isActive !== false && `${task.title} ${task.category}`.toLowerCase().match(/bath|shower|hygiene/));
    const summaries: ReportRow[] = state.residents
      .filter(resident => resident.status === 'active' && bathingTasks.some(task => task.residentId === resident.id))
      .map(resident => {
        const tasksForResident = bathingTasks.filter(task => task.residentId === resident.id);
        const modelRow = model.rows.find(row => row.residentId === resident.id);
        const scheduledSlots = modelRow ? Object.values(modelRow.slots).filter(slot => slot.scheduled && slot.shiftCode !== 'Unassigned') : [];
        const required = tasksForResident.reduce((sum, task) => sum + model.days.filter((_, index) => {
          const date = new Date(`${anchor}T12:00:00`);
          const distance = (date.getDay() - (state.settings.operationalWeekStartsOn ?? 1) + 7) % 7;
          date.setDate(date.getDate() - distance + index);
          return isDateDue(date.toISOString().slice(0, 10), task.frequency, task.recurrenceRule, task.createdAt);
        }).length, 0);
        const shifts = [...new Set(tasksForResident.map(task => state.shifts.find(shift => shift.id === task.shiftId)?.shortCode).filter(Boolean))].join(', ');
        const days = [...new Set(scheduledSlots.map(slot => slot.dayLabel))].join(', ');
        const missing = Math.max(0, required - scheduledSlots.length);
        return { id: `${resident.id}-summary`, values: { rowType: 'summary', room: resident.roomNumber, resident: residentName(resident), bathingType: [...new Set(tasksForResident.map(task => task.title))].join('; '), frequency: `${required} / week`, scheduledDay: days || 'Unscheduled', shift: shifts || 'Unassigned', assistance: modelRow?.assistanceLevel || modelRow?.notes || '', required, scheduledCount: scheduledSlots.length, missing, missingPositive: missing > 0, scheduled: scheduledSlots.length > 0 } };
      });
    const assignments: ReportRow[] = model.rows.flatMap(row => Object.values(row.slots).filter(slot => slot.scheduled).map(slot => ({ id: `${row.residentId}-${slot.dayNumber}`, values: { rowType: 'assignment', complete: '☐', room: row.roomNumber, resident: row.residentName, bathingType: bathingTasks.find(task => task.residentId === row.residentId)?.title || 'Bathing / Shower', scheduledDay: slot.dayLabel, shift: slot.shiftCode || 'Unassigned', time: slot.time || '', assistance: row.assistanceLevel || row.notes || '', notes: '', scheduled: true } })));
    const capacity: ReportRow[] = model.shiftLines.flatMap(line => model.days.map(day => {
      const slot = line.days[day.dayNumber];
      return { id: `capacity-${line.shiftId}-${day.dayNumber}`, values: { rowType: 'capacity', scheduledDay: `${day.label} ${day.shortDate}`, shift: line.shiftCode, scheduledCount: slot.scheduled, capacity: slot.capacity, available: slot.available } };
    }));
    return [...summaries, ...assignments, ...capacity];
  }
  return [];
}

const passes = (row: ReportRow, filter: ReportFilterDefinition): boolean => {
  const value = row.values[filter.field]; const text = String(value ?? '').toLowerCase(); const expected = String(filter.value ?? '').toLowerCase();
  switch (filter.operator) {
    case 'equals': return text === expected;
    case 'not_equals': return text !== expected;
    case 'contains': return text.includes(expected);
    case 'is_true': return value === true;
    case 'is_false': return value === false;
    case 'is_empty': return value === null || value === undefined || text.trim() === '';
    case 'not_empty': return value !== null && value !== undefined && text.trim() !== '';
  }
};

function sortRows(rows: ReportRow[], sorting: ReportSortDefinition[]): ReportRow[] {
  return [...rows].sort((a, b) => {
    for (const sort of sorting) {
      const av = String(a.values[sort.field] ?? ''); const bv = String(b.values[sort.field] ?? '');
      const result = sort.naturalRoom || sort.field === 'room' ? sortRoomNumbers(av, bv) : av.localeCompare(bv, undefined, { numeric: sort.field === 'time', sensitivity: 'base' });
      if (result !== 0) return sort.direction === 'desc' ? -result : result;
    }
    return 0;
  });
}

export function buildCustomReportModel(definition: ReportDefinition | SavedPrintPreset): CustomReportModel {
  const fields = REPORT_FIELDS[definition.dataSource];
  const columns = definition.columns.map(id => fields.find(item => item.id === id)).filter((item): item is ReportFieldDefinition => Boolean(item));
  const filtered = baseRows(definition.dataSource, definition.dateRange).filter(row => definition.filters.every(filter => passes(row, filter)));
  const rows = sortRows(filtered, definition.sorting);
  const grouping = definition.grouping;
  const grouped = new Map<string, ReportRow[]>();
  rows.forEach(row => { const key = grouping ? String(row.values[grouping] ?? 'Not specified') : ''; grouped.set(key, [...(grouped.get(key) || []), row]); });
  const groups = [...grouped.entries()].map(([key, groupRows]) => ({ key, label: key || '', rows: groupRows }));
  const density = definition.density || 'standard'; const orientation = definition.layout === 'landscape' || (definition.layout === 'auto' && columns.length > 6) ? 'landscape' : 'portrait';
  const rowsPerPage = orientation === 'landscape' ? (density === 'compact' ? 34 : 27) : (density === 'compact' ? 42 : 34);
  const estimatedPages = Math.max(1, Math.ceil((rows.length + groups.length * 2) / rowsPerPage));
  const coverage = definition.dateRange ? `${definition.dateRange.start} – ${definition.dateRange.end}` : `As of ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const activeFilters = definition.filters.map(filter => `${fields.find(item => item.id === filter.field)?.label || filter.field} ${filter.operator.replace('_', ' ')}${filter.value !== undefined ? ` ${filter.value}` : ''}`);
  const state = db.getState();
  const currentResidents = state.residents.filter(resident => Boolean(resident.occupancyPositionId) && !resident.roomAssignmentNeedsReview && ['active', 'in_hospital', 'out_on_pass', 'on_hold'].includes(resident.status));
  const summaryItems = definition.id === 'resident-census' ? [
    { label: 'Current Residents', value: currentResidents.length },
    { label: 'Active in Facility', value: currentResidents.filter(resident => resident.status === 'active').length },
    { label: 'In Hospital', value: currentResidents.filter(resident => resident.status === 'in_hospital').length },
    { label: 'Out on Pass', value: currentResidents.filter(resident => resident.status === 'out_on_pass').length },
    { label: 'Available Positions', value: state.occupancyPositions.filter(position => position.active !== false && !currentResidents.some(resident => resident.occupancyPositionId === position.id)).length },
  ] : undefined;
  return { definition, title: definition.name, sourceLabel: REPORT_SOURCE_LABELS[definition.dataSource], columns, rows, groups, generatedAt: new Date().toISOString(), coverage, filterSummary: activeFilters.length ? activeFilters.join(' · ') : 'No filters', estimatedPages, largeReport: estimatedPages > 20, facility: state.facility, summaryItems };
}

export function saveUserPreset(presetValue: Omit<SavedPrintPreset, 'id' | 'createdAt'> & { id?: string }): SavedPrintPreset {
  const existing = db.getState().settings.savedPrintPresets || [];
  const now = new Date().toISOString();
  const preset: SavedPrintPreset = { ...presetValue, id: presetValue.id || `report-${Date.now()}`, createdAt: existing.find(item => item.id === presetValue.id)?.createdAt || now, updatedAt: now };
  db.updateSettings({ savedPrintPresets: [...existing.filter(item => item.id !== preset.id), preset] });
  return preset;
}

export function deleteUserPreset(id: string): void {
  db.updateSettings({ savedPrintPresets: (db.getState().settings.savedPrintPresets || []).filter(item => item.id !== id) });
}
