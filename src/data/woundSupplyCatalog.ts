import { WoundSupplyProduct } from '../types';

const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function product(
  manufacturer: string,
  family: string,
  category: string,
  size?: string,
  unit = 'Each',
  stock = false,
): WoundSupplyProduct {
  const productName = size ? `${family} ${size}` : family;
  return {
    id: `wsp-seed-${slug(manufacturer)}-${slug(productName)}`,
    productFamily: family,
    productName,
    manufacturer,
    category,
    size,
    unit,
    isFacilityStock: stock,
    isActive: true,
    localFormularyStatus: stock ? 'approved_stocked' : 'not_stocked',
    provenance: 'seeded',
  };
}

const families = (manufacturer: string, category: string, names: string[]) =>
  names.map(name => product(manufacturer, name, category));

/**
 * Common Wound Products — configurable to your facility formulary.
 * Convenience data only; this is not represented as an AHS formulary.
 * Unsized family records are reference entries. Only explicitly maintained
 * sizes below are seeded as distinct product/size records.
 */
export const WOUND_SUPPLY_CATALOG_SEED: WoundSupplyProduct[] = [
  ...families('Mölnlycke', 'Foam Dressing', ['Mepilex', 'Mepilex Border', 'Mepilex Border Flex', 'Mepilex Border Flex Lite', 'Mepilex Lite', 'Mepilex Transfer', 'Mepilex XT']),
  ...families('Mölnlycke', 'Antimicrobial Foam Dressing', ['Mepilex Ag']),
  ...families('Mölnlycke', 'Contact Layer', ['Mepitel', 'Mepitel One']),
  ...families('Mölnlycke', 'Antimicrobial Contact Layer', ['Mepitel Ag']),
  ...families('Mölnlycke', 'Absorbent Adhesive Dressing', ['Mepore']),
  ...families('Mölnlycke', 'Transparent Film Dressing', ['Mepore Film']),
  ...families('Mölnlycke', 'Hypertonic Dressing', ['Mesalt']),
  ...families('Mölnlycke', 'Alginate Dressing', ['Melgisorb']),
  ...families('Mölnlycke', 'Antimicrobial Alginate Dressing', ['Melgisorb Ag']),

  product('Mölnlycke', 'Mepilex Border Flex', 'Silicone Foam Dressing', '7.5 × 7.5 cm'),
  product('Mölnlycke', 'Mepilex Border Flex', 'Silicone Foam Dressing', '10 × 10 cm'),
  product('Mölnlycke', 'Mepilex Border Flex', 'Silicone Foam Dressing', '10 × 20 cm'),
  product('Mölnlycke', 'Mepilex Border Flex', 'Silicone Foam Dressing', '15 × 15 cm'),
  product('Mölnlycke', 'Mepore', 'Absorbent Adhesive Dressing', '9 × 10 cm'),
  product('Mölnlycke', 'Mepore', 'Absorbent Adhesive Dressing', '9 × 15 cm'),

  ...families('Coloplast', 'Foam Dressing', ['Biatain', 'Biatain Adhesive', 'Biatain Non-Adhesive']),
  ...families('Coloplast', 'Silicone Foam Dressing', ['Biatain Silicone', 'Biatain Silicone Lite']),
  ...families('Coloplast', 'Antimicrobial Foam Dressing', ['Biatain Ag']),
  ...families('Coloplast', 'Alginate Dressing', ['Biatain Alginate']),
  ...families('Coloplast', 'Antimicrobial Alginate Dressing', ['Biatain Alginate Ag']),
  ...families('Coloplast', 'Hydrocolloid Dressing', ['Comfeel Plus', 'Comfeel Plus Clear']),
  ...families('Coloplast', 'Hydrogel', ['Purilon Gel']),
  product('Coloplast', 'Biatain Silicone', 'Silicone Foam Dressing', '10 × 10 cm'),
  product('Coloplast', 'Biatain Silicone', 'Silicone Foam Dressing', '10 × 20 cm'),

  ...families('Convatec', 'Hydrofiber / Gelling Fibre Dressing', ['AQUACEL', 'AQUACEL Extra']),
  ...families('Convatec', 'Antimicrobial Hydrofiber / Gelling Fibre Dressing', ['AQUACEL Ag+', 'AQUACEL Ag+ Extra']),
  ...families('Convatec', 'Foam Dressing', ['AQUACEL Foam']),
  ...families('Convatec', 'Hydrocolloid Dressing', ['DuoDERM', 'DuoDERM Extra Thin', 'DuoDERM Signal']),

  ...families('Smith & Nephew', 'Foam Dressing', ['ALLEVYN', 'ALLEVYN Gentle', 'ALLEVYN Gentle Border', 'ALLEVYN Adhesive', 'ALLEVYN Non-Adhesive']),
  ...families('Smith & Nephew', 'Antimicrobial Foam Dressing', ['ALLEVYN Ag']),
  ...families('Smith & Nephew', 'Antimicrobial Dressing', ['ACTICOAT', 'ACTICOAT Flex']),
  ...families('Smith & Nephew', 'Impregnated Contact Layer', ['Bactigras', 'Jelonet']),
  ...families('Smith & Nephew', 'Transparent Film Dressing', ['Opsite']),

  ...families('3M', 'Transparent Film Dressing', ['Tegaderm Transparent Film']),
  ...families('3M', 'Foam Dressing', ['Tegaderm Foam']),
  ...families('3M', 'Silicone Foam Dressing', ['Tegaderm Silicone Foam']),
  ...families('3M', 'Contact Layer', ['Tegaderm Contact Layer']),
  ...families('3M', 'Skin Barrier', ['Cavilon Barrier Film']),

  ...families('Other / Various', 'Contact Layer', ['Adaptic', 'Adaptic Touch']),
  ...families('Other / Various', 'Impregnated Gauze Dressing', ['Xeroform']),
  ...families('Other / Various', 'Antibacterial Foam Dressing', ['Hydrofera Blue']),
  ...families('Other / Various', 'Polymeric Membrane Dressing', ['PolyMem']),
  ...families('Other / Various', 'Absorbent Dressing', ['Mesorb', 'Mextra']),
  ...families('Kendall', 'Foam Dressing', ['Kendall Foam']),
  ...families('Kendall', 'Gauze', ['Kendall Gauze']),
  product('Generic', 'Sterile Gauze', 'Gauze', '4 × 4 in', 'Pad'),
  product('Generic', 'Non-Sterile Gauze', 'Gauze', '4 × 4 in', 'Pad'),
  product('Generic', 'Normal Saline', 'Wound Cleanser', undefined, 'Bottle'),
  product('Generic', 'Wound Cleanser', 'Wound Cleanser', undefined, 'Bottle'),
  product('Generic', 'Medical Tape', 'Tape / Fixation', undefined, 'Roll'),
  product('Generic', 'Conforming Gauze', 'Gauze / Fixation', undefined, 'Roll'),
  product('Generic', 'Tubular Retention Dressing', 'Retention / Fixation', undefined, 'Length'),
];

export const WOUND_SUPPLY_CATALOG_DESCRIPTION = 'Common Wound Products — configurable to your facility formulary';
export const WOUND_SUPPLY_CATALOG_DISCLAIMER = 'The seeded catalog contains common wound-care products for setup convenience. Product availability and approved use vary by organization. Configure this list to match your facility\'s current formulary, policies and wound-care orders.';

export function normalizeWoundProductSearch(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[×x]/g, 'x').replace(/[^a-z0-9+]+/g, '');
}

export function matchesWoundProductSearch(product: WoundSupplyProduct, query: string): boolean {
  const needle = normalizeWoundProductSearch(query);
  if (!needle) return true;
  // Common shorthand used in wound rooms for the broad Mölnlycke "Me..."
  // group; this is search convenience only and never implies substitution.
  if (needle === 'mep' && normalizeWoundProductSearch(product.manufacturer) === 'molnlycke' && normalizeWoundProductSearch(product.productFamily).startsWith('me')) return true;
  return [product.productName, product.productFamily, product.manufacturer, product.size, product.category]
    .filter(Boolean)
    .some(value => normalizeWoundProductSearch(String(value)).includes(needle));
}
