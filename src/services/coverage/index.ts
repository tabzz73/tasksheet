import { ServiceCoverageDefinition, TaskServiceCoverage } from '../../types';
import { DEFAULT_SERVICE_COVERAGE_DEFINITIONS } from '../../data/defaultData';

export const FUNDED_COVERAGE: TaskServiceCoverage = {
  type: 'FUNDED', labelSnapshot: 'Funded / Authorized', shortCodeSnapshot: '', isAdditionalService: false,
};

export const getCoverageDefinitions = (definitions?: ServiceCoverageDefinition[]) =>
  (definitions?.length ? definitions : DEFAULT_SERVICE_COVERAGE_DEFINITIONS).filter(item => item.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder);

export const normalizeCoverage = (coverage?: TaskServiceCoverage): TaskServiceCoverage => coverage || { ...FUNDED_COVERAGE };

export const createCoverageSnapshot = (
  definition: ServiceCoverageDefinition,
  details: Pick<TaskServiceCoverage, 'startDate' | 'endDate' | 'isAdditionalService' | 'note'> = {},
): TaskServiceCoverage => ({
  type: definition.code,
  labelSnapshot: definition.name,
  shortCodeSnapshot: definition.shortCode,
  iconSnapshot: definition.icon,
  isAdditionalService: definition.code === 'FUNDED' ? false : Boolean(details.isAdditionalService),
  startDate: details.startDate || undefined,
  endDate: details.endDate || undefined,
  note: details.note?.trim() || undefined,
});

export const isFundedCoverage = (coverage?: TaskServiceCoverage) => normalizeCoverage(coverage).type === 'FUNDED';
export const isExceptionalCoverage = (coverage?: TaskServiceCoverage) => !isFundedCoverage(coverage);

export const coverageIndicator = (coverage?: TaskServiceCoverage): string => {
  const current = normalizeCoverage(coverage);
  if (current.type === 'FUNDED') return '';
  return current.iconSnapshot || current.shortCodeSnapshot || current.labelSnapshot;
};

export const coverageDisplayName = (coverage?: TaskServiceCoverage) => normalizeCoverage(coverage).labelSnapshot;

export const isCoverageActiveOnDate = (coverage: TaskServiceCoverage | undefined, date: string): boolean => {
  const current = normalizeCoverage(coverage);
  return (!current.startDate || date >= current.startDate) && (!current.endDate || date <= current.endDate);
};

export const validateCoveragePeriod = (coverage?: TaskServiceCoverage): string | undefined => {
  if (!coverage) return undefined;
  if (coverage.startDate && coverage.endDate && coverage.endDate < coverage.startDate) return 'Coverage end date must be on or after the start date.';
  return undefined;
};

export const formatCoverageLegend = (coverages: Array<TaskServiceCoverage | undefined>) => {
  const unique = new Map<string, string>();
  coverages.forEach(item => {
    const current = normalizeCoverage(item); const indicator = coverageIndicator(current);
    if (indicator) unique.set(current.type, `${indicator} ${current.labelSnapshot}`);
  });
  return [...unique.values()];
};
