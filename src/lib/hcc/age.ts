/**
 * Patient age as the CMS-HCC software computes it: completed years as of
 * February 1 of the payment year. The crosswalk's age edits (C50.011 is HCC22
 * under 50, HCC23 at 50 or over) are evaluated against this age, not the age on
 * the date of service.
 */
export function ageForPaymentYear(dateOfBirth: string, paymentYear: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got ${JSON.stringify(dateOfBirth)}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];

  let age = paymentYear - year;
  // Birthday not yet reached by Feb 1: anyone born after January, or on/after Feb 2.
  if (month > 2 || (month === 2 && day > 1)) age -= 1;
  return age;
}

/** PY2026 is scored on 2025 dates of service: the DOS year is the payment year minus one. */
export function serviceYearFor(paymentYear: number): number {
  return paymentYear - 1;
}
