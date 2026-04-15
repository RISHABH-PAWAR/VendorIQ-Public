/**
 * VendorIQ — Scoring Constants
 * NEVER CHANGE VHS_WEIGHTS without stakeholder sign-off.
 */

export const VHS_WEIGHTS = {
  financial:  0.30,
  legal:      0.25,
  gst:        0.20,
  directors:  0.15,
  market:     0.10,
} as const;

export const RISK_BANDS = {
  LOW:    { min: 66,  max: 100, color: '#16A34A', recommendation: 'APPROVE' },
  MEDIUM: { min: 41,  max: 65,  color: '#F59E0B', recommendation: 'INVESTIGATE' },
  HIGH:   { min: 0,   max: 40,  color: '#DC2626', recommendation: 'REJECT' },
} as const;

export function getRiskLevel(vhs: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (vhs >= 66) return 'LOW';
  if (vhs >= 41) return 'MEDIUM';
  return 'HIGH';
}

export const HARD_DISQUALIFIERS = [
  'STRUCK_OFF',
  'DISQUALIFIED_DIN',
  'NCLT_CIRP',
  'SFIO_INVESTIGATION',
  'RBI_DEFAULTER',
  'SEBI_DEBARRED',
] as const;

export const PRICING = {
  REPORT_PRICE_PAISE:       200000,
  PROFESSIONAL_PRICE_PAISE: 999900,
  ENTERPRISE_PRICE_PAISE:   3499900,
  ENTERPRISE_ANNUAL_PAISE:  2799900,
  CA_SETUP_PAISE:           6900000,
  CA_PER_REPORT_PAISE:      900,
  BULK_MIN_PAISE:           10000000,
} as const;

export const TOTAL_DATA_SOURCES = 13;
export const MIN_SOURCES_FOR_FULL_REPORT = 7;
