import { CatalogCategory, CatalogTaskTemplate } from '../types';

const COMMON_PRIORITY_SLUGS = [
  'hca.medication.map1',
  'hca.medication.map2',
  'hca.medication.map3',
  'shared.monitoring.wellness_check',
  'hca.tracking.rai',
  'hca.tracking.bowel',
  'hca.tracking.fluid',
  'hca.monitoring.weekly_weight',
  'hca.tracking.sleep',
  'hca.tracking.food',
  'hca.tracking.behavior',
  'lpn.pain.assessment',
];

export function getRoleCatalogTasks(
  templates: CatalogTaskTemplate[],
  roleCode: string,
): CatalogTaskTemplate[] {
  if (roleCode === 'HCA') {
    return templates.filter(template => template.roleCode === 'HCA' || template.roleCode === 'SHARED');
  }

  return templates.filter(template =>
    template.roleCode === 'LPN' ||
    template.roleCode === 'RN' ||
    template.roleCode === 'HCA' ||
    template.roleCode === 'SHARED'
  );
}

export function filterCatalogTasks(
  templates: CatalogTaskTemplate[],
  categories: CatalogCategory[],
  query: string,
  categoryId = 'ALL',
): CatalogTaskTemplate[] {
  const normalizedQuery = query.trim().toLowerCase();
  const categoryNames = new Map(categories.map(category => [category.id, category.name.toLowerCase()]));

  return templates.filter(template => {
    if (categoryId !== 'ALL' && template.categoryId !== categoryId) return false;
    if (!normalizedQuery) return true;

    return template.title.toLowerCase().includes(normalizedQuery) ||
      template.categoryId.toLowerCase().includes(normalizedQuery) ||
      categoryNames.get(template.categoryId)?.includes(normalizedQuery) === true ||
      template.synonyms?.some(synonym => synonym.toLowerCase().includes(normalizedQuery)) === true ||
      template.description?.toLowerCase().includes(normalizedQuery) === true;
  });
}

export function getCommonCatalogTasks(
  templates: CatalogTaskTemplate[],
  limit = 14,
): CatalogTaskTemplate[] {
  const priorityTasks = COMMON_PRIORITY_SLUGS
    .map(slug => templates.find(template => template.slug === slug))
    .filter((template): template is CatalogTaskTemplate => Boolean(template));
  const prioritySlugs = new Set(priorityTasks.map(template => template.slug));
  const otherPopularTasks = templates.filter(template => template.isPopular && !prioritySlugs.has(template.slug));

  return [...priorityTasks, ...otherPopularTasks].slice(0, limit);
}
