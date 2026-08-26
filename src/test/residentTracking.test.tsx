import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { HcaChecklistDocument } from '../components/print/HcaChecklistDocument';
import { LpnClinicalDocument } from '../components/print/LpnClinicalDocument';
import { ALBERTA_TASK_TEMPLATES } from '../data/albertaCatalog';
import { ROLE_HCA_ID, ROLE_LPN_ID, SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { PrintService, buildResidentTrackingFields } from '../services/print';
import { getCommonCatalogTasks, getRoleCatalogTasks } from '../services/catalogDiscovery';

describe('resident paper tracking tasks', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('provides the requested HCA trackers and LPN pain tracking with attention icons', () => {
    const expected = new Map([
      ['hca.tracking.rai', 'rai'],
      ['hca.tracking.bowel', 'bowel'],
      ['hca.tracking.fluid', 'fluid'],
      ['hca.monitoring.weekly_weight', 'weight'],
      ['hca.tracking.sleep', 'sleep'],
      ['hca.tracking.food', 'food'],
      ['hca.tracking.behavior', 'behavior'],
      ['lpn.pain.assessment', 'pain'],
    ]);

    for (const [slug, kind] of expected) {
      const template = ALBERTA_TASK_TEMPLATES.find(item => item.slug === slug);
      expect(template, slug).toBeDefined();
      expect(template?.trackingConfig?.kind).toBe(kind);
      expect(template?.defaultInstructions?.length).toBeGreaterThan(20);
      expect(template?.attentionConfig?.indicators).toContain('OBSERVE');
      expect(template?.attentionConfig?.indicators).toContain('DOC_REF');
    }

    for (const slug of ['lpn.monitoring.full_vitals', 'lpn.monitoring.blood_pressure', 'lpn.monitoring.general_assessment']) {
      const template = ALBERTA_TASK_TEMPLATES.find(item => item.slug === slug);
      expect(template?.attentionConfig?.indicators).toEqual(expect.arrayContaining(['OBSERVE', 'DOC_REF']));
    }

    const hcaCommonSlugs = getCommonCatalogTasks(getRoleCatalogTasks(ALBERTA_TASK_TEMPLATES, 'HCA')).map(item => item.slug);
    expect(hcaCommonSlugs).toEqual(expect.arrayContaining([...expected.keys()].filter(slug => slug.startsWith('hca.'))));
  });

  it('prints structured HCA tracking fields and the Observe / Record icons', () => {
    const resident = db.addResident({ firstName: 'HCA', lastName: 'Tracking', roomNumber: '301', status: 'active' });
    const template = ALBERTA_TASK_TEMPLATES.find(item => item.slug === 'hca.tracking.bowel')!;
    db.addResidentTask({
      residentId: resident.id,
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      templateSlug: template.slug,
      title: template.title,
      category: 'Health Monitoring',
      time: '1000',
      frequency: 'daily',
      instructions: template.defaultInstructions,
      attentionConfig: template.attentionConfig,
      trackingConfig: template.trackingConfig,
    });

    const model = PrintService.createDocumentModel(generateShiftSheet('2026-08-26', SHIFT_HCA_DAY_ID), 'simple_checklist');
    const task = model.residentGroups.flatMap(group => group.tasks)[0];
    expect(task.writableFields[0].label).toContain('BM:');
    expect(task.attentionTags).toEqual(expect.arrayContaining(['[OB]', '[DOC]']));

    const html = renderToStaticMarkup(<HcaChecklistDocument model={model} />);
    expect(html).toContain('Bowel Movement Tracking');
    expect(html).toContain('Medium');
    expect(html).toContain('Observe / Monitor');
    expect(html).toContain('Record on Form');
  });

  it('prints a structured pain scale on the LPN worksheet and supports every tracking prompt', () => {
    const resident = db.addResident({ firstName: 'LPN', lastName: 'Tracking', roomNumber: '302', status: 'active' });
    const template = ALBERTA_TASK_TEMPLATES.find(item => item.slug === 'lpn.pain.assessment')!;
    db.addResidentTask({
      residentId: resident.id,
      shiftId: SHIFT_LPN_DAY_ID,
      roleId: ROLE_LPN_ID,
      templateSlug: template.slug,
      title: template.title,
      category: 'Pain / Symptom Management',
      time: '0830',
      frequency: 'daily',
      instructions: template.defaultInstructions,
      attentionConfig: template.attentionConfig,
      trackingConfig: template.trackingConfig,
    });

    const model = PrintService.createDocumentModel(generateShiftSheet('2026-08-26', SHIFT_LPN_DAY_ID), 'clinical_worksheet');
    expect(model.residentGroups[0].tasks[0].writableFields[0].label).toContain('Pain: ______/10');
    expect(renderToStaticMarkup(<LpnClinicalDocument model={model} />)).toContain('PAINAD');

    for (const kind of ['rai', 'bowel', 'fluid', 'weight', 'sleep', 'food', 'behavior', 'pain'] as const) {
      expect(buildResidentTrackingFields({ kind })[0]?.label).toBeTruthy();
    }
  });
});
