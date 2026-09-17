/**
 * Pure integer-cent monetary engine (ISO/IEC 25010)
 * Eliminates IEEE-754 floating-point drift across transaction rollups and shift balances.
 */

export const toCents = (amount: number): number => {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
};

export const fromCents = (cents: number): number => {
  return Number((cents / 100).toFixed(2));
};

export const addCents = (...amounts: number[]): number => {
  const totalCents = amounts.reduce((acc, val) => acc + toCents(val), 0);
  return fromCents(totalCents);
};

export const subtractCents = (minuend: number, subtrahend: number): number => {
  return fromCents(toCents(minuend) - toCents(subtrahend));
};

export const multiplyToCents = (unitPrice: number, quantity: number): number => {
  const priceCents = toCents(unitPrice);
  // Multiplied with high-precision quantity (supports 3-decimal kg weights)
  return Math.round(priceCents * quantity);
};

export const multiplyPrice = (unitPrice: number, quantity: number): number => {
  return fromCents(multiplyToCents(unitPrice, quantity));
};

export interface MonetaryBreakdown {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
}

export const calculateMonetaryBreakdown = (
  items: Array<{ unitPrice: number; quantity: number }>,
  discountPercent: number = 0,
  taxRatePercent: number = 0
): MonetaryBreakdown => {
  // 1. Calculate each item in cents to prevent fractional penny drift
  const subtotalCents = items.reduce((acc, item) => {
    return acc + multiplyToCents(item.unitPrice, item.quantity);
  }, 0);

  // 2. Discount in cents
  const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
  const discountCents = Math.round((subtotalCents * clampedDiscount) / 100);

  // 3. Taxable base
  const taxableCents = Math.max(0, subtotalCents - discountCents);

  // 4. Tax calculation in cents
  const clampedTax = Math.max(0, taxRatePercent);
  const taxCents = Math.round((taxableCents * clampedTax) / 100);

  // 5. Total
  const totalCents = taxableCents + taxCents;

  return {
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    taxableAmount: fromCents(taxableCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(totalCents),
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents,
  };
};

export const compareMonetaryBalance = (
  actualCounted: number,
  expectedCash: number
): { difference: number; status: 'EXACT' | 'SURPLUS' | 'SHORTAGE' } => {
  const actualCents = toCents(actualCounted);
  const expectedCents = toCents(expectedCash);
  const diffCents = actualCents - expectedCents;

  const difference = fromCents(diffCents);
  let status: 'EXACT' | 'SURPLUS' | 'SHORTAGE' = 'EXACT';
  if (diffCents > 0) status = 'SURPLUS';
  else if (diffCents < 0) status = 'SHORTAGE';

  return { difference, status };
};
