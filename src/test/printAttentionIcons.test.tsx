import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrintAttentionIcons, PrintAttentionLegend } from '../components/print/PrintAttentionIcons';

describe('print attention symbols', () => {
  it('renders recognizable labelled icons without printing abbreviated codes', () => {
    const codes = ['[HA]', '[TC]', '[BM]', '[2P]', '[FU]', '[OB]', '[IC]', '[EQ]', '[DOC]'];
    const markup = renderToStaticMarkup(<PrintAttentionIcons codes={codes} />);

    for (const label of [
      'High Alert',
      'Time-Critical',
      'Before Meal',
      'Two-Person Assist',
      'Follow-Up Required',
      'Observe / Monitor',
      'Precaution',
      'Equipment Required',
      'Record on Form',
    ]) {
      expect(markup).toContain(`aria-label="${label}"`);
    }
    for (const code of codes) expect(markup).not.toContain(code);
    expect(markup.match(/<svg/g)?.length).toBe(codes.length);
  });

  it('uses the same symbols with full wording in the print legend', () => {
    const markup = renderToStaticMarkup(
      <PrintAttentionLegend items={[
        { code: '[HA]', label: 'High Alert' },
        { code: '[TC]', label: 'Time-Critical' },
        { code: '[OB]', label: 'Observe / Monitor' },
      ]} />,
    );

    expect(markup).toContain('High Alert');
    expect(markup).toContain('Time-Critical');
    expect(markup).toContain('Observe / Monitor');
    expect(markup).not.toContain('[HA]');
    expect(markup).not.toContain('[TC]');
    expect(markup).not.toContain('[OB]');
  });
});
