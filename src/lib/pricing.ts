/** Nepal VAT rate applied at checkout (single source of truth). */
export const VAT_RATE = 0.13;

export function computeBookingTotals(seatsTotal: number) {
  const subtotal = seatsTotal;
  const vatAmount = Math.round(subtotal * VAT_RATE);
  const totalAmount = subtotal + vatAmount;
  return { seatsTotal, subtotal, vatAmount, totalAmount };
}
