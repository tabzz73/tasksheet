export const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
] as const;

export const CANADIAN_CITIES_BY_PROVINCE: Record<string, string[]> = {
  AB: ['Airdrie', 'Calgary', 'Edmonton', 'Fort McMurray', 'Grande Prairie', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'Sherwood Park', 'St. Albert'],
  BC: ['Abbotsford', 'Burnaby', 'Kelowna', 'Nanaimo', 'Prince George', 'Richmond', 'Surrey', 'Vancouver', 'Victoria'],
  MB: ['Brandon', 'Dauphin', 'Portage la Prairie', 'Steinbach', 'Thompson', 'Winnipeg'],
  NB: ['Bathurst', 'Edmundston', 'Fredericton', 'Miramichi', 'Moncton', 'Saint John'],
  NL: ['Corner Brook', 'Gander', 'Grand Falls-Windsor', 'Mount Pearl', "St. John's"],
  NS: ['Dartmouth', 'Halifax', 'New Glasgow', 'Sydney', 'Truro'],
  NT: ['Fort Smith', 'Hay River', 'Inuvik', 'Yellowknife'],
  NU: ['Cambridge Bay', 'Iqaluit', 'Rankin Inlet'],
  ON: ['Barrie', 'Hamilton', 'Kingston', 'Kitchener', 'London', 'Mississauga', 'Ottawa', 'Sudbury', 'Thunder Bay', 'Toronto', 'Windsor'],
  PE: ['Charlottetown', 'Cornwall', 'Summerside'],
  QC: ['Gatineau', 'Laval', 'Longueuil', 'Montréal', 'Québec City', 'Sherbrooke', 'Trois-Rivières'],
  SK: ['Moose Jaw', 'North Battleford', 'Prince Albert', 'Regina', 'Saskatoon', 'Swift Current', 'Yorkton'],
  YT: ['Dawson City', 'Watson Lake', 'Whitehorse'],
};

export function formatCanadianPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  const hasCountryCode = digits.startsWith('1');
  digits = digits.slice(0, hasCountryCode ? 11 : 10);
  const local = hasCountryCode ? digits.slice(1) : digits;
  const area = local.slice(0, 3);
  const exchange = local.slice(3, 6);
  const line = local.slice(6, 10);
  const prefix = hasCountryCode ? '+1 ' : '';

  if (!area) return hasCountryCode ? '+1 ' : '';
  if (area.length < 3) return `${prefix}(${area}`;
  if (!exchange) return `${prefix}(${area}) `;
  if (exchange.length < 3) return `${prefix}(${area}) ${exchange}`;
  return `${prefix}(${area}) ${exchange}${line ? `-${line}` : ''}`;
}

export function isValidCanadianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return (digits.length === 10 && !digits.startsWith('1')) || (digits.length === 11 && digits.startsWith('1'));
}

export function formatCanadianPostalCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
}

export function formatContactNumber(value: string): string {
  const trimmed = value.trimStart();
  if (/^(?:extension|ext)\s*/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '').slice(0, 8);
    return digits ? `ext ${digits}` : 'ext ';
  }
  return formatCanadianPhone(value);
}
