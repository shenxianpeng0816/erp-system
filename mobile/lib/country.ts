/**
 * Mirrors backend com.erp.common.enums.CountryEnum.
 * Keep in sync when the Java enum changes.
 */
export type CountryMeta = {
  countryName: string;
  countryCode: string;
  countryCodeFor3: string;
  currencyCode: string;
  currencyUnit: string;
  timeZoneCode: string;
  areaCode: string;
};

export const COUNTRIES: readonly CountryMeta[] = [
  { countryName: 'Kenya', countryCode: 'KE', countryCodeFor3: 'KEN', currencyCode: 'KES', currencyUnit: 'KSh', timeZoneCode: '+03:00', areaCode: '254' },
  { countryName: 'Nigeria', countryCode: 'NG', countryCodeFor3: 'NGA', currencyCode: 'NGN', currencyUnit: '₦', timeZoneCode: '+01:00', areaCode: '234' },
  { countryName: 'Uganda', countryCode: 'UG', countryCodeFor3: 'UGA', currencyCode: 'UGX', currencyUnit: 'USh', timeZoneCode: '+03:00', areaCode: '256' },
  { countryName: 'China', countryCode: 'CN', countryCodeFor3: 'CHN', currencyCode: 'CNY', currencyUnit: '¥', timeZoneCode: '+08:00', areaCode: '86' },
  { countryName: 'Tanzania', countryCode: 'TZ', countryCodeFor3: 'TZA', currencyCode: 'TZS', currencyUnit: 'TSh', timeZoneCode: '+03:00', areaCode: '255' },
] as const;

const BY_CODE: Record<string, CountryMeta> = Object.fromEntries(
  COUNTRIES.map((c) => [c.countryCode, c]),
);

export const DEFAULT_COUNTRY_CODE = 'KE';

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  code: c.countryCode,
  label: `${c.countryName} (${c.countryCode})`,
}));

export function getCountry(countryCode?: string | null): CountryMeta {
  const cc = countryCode?.trim().toUpperCase();
  if (cc && BY_CODE[cc]) return BY_CODE[cc];
  return BY_CODE[DEFAULT_COUNTRY_CODE];
}

export function currencyUnit(countryCode?: string | null): string {
  return getCountry(countryCode).currencyUnit;
}

export function formatMoney(
  amount: number | string | null | undefined,
  countryCode?: string | null,
): string {
  const n = Number(amount ?? 0);
  const formatted = Number.isFinite(n) ? n.toLocaleString() : String(amount ?? '');
  return `${currencyUnit(countryCode)} ${formatted}`;
}

export function defaultCountryFromCustomer(countryCode?: string | null): string {
  const cc = countryCode?.trim().toUpperCase();
  if (cc && BY_CODE[cc]) return cc;
  return DEFAULT_COUNTRY_CODE;
}
