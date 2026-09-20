export type BookingPriceInput = {
  accommodationAmount: number;
  ownerFeeRateBps: number;
  guestFeeRateBps: number;
};

export type BookingPrice = {
  accommodationAmount: number;
  guestFeeRate: number;
  guestFeeAmount: number;
  ownerFeeRate: number;
  ownerFeeAmount: number;
  guestTotalAmount: number;
  ownerNetAmount: number;
  platformGrossRevenue: number;
};

function assertInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer.`);
  }
}

function feeAmount(amount: number, rateBps: number) {
  assertInteger(amount, "Accommodation amount");
  assertInteger(rateBps, "Fee rate");
  if (amount < 0) throw new RangeError("Accommodation amount cannot be negative.");
  if (rateBps < 0 || rateBps > 10_000)
    throw new RangeError("Fee rate must be between 0 and 10,000 basis points.");

  // BigInt keeps all currency arithmetic in integer minor units. Adding half
  // the divisor gives deterministic half-up rounding to the nearest cent.
  return Number(
    (BigInt(amount) * BigInt(rateBps) + BigInt(5_000)) / BigInt(10_000),
  );
}

export function calculateBookingPrice({
  accommodationAmount,
  ownerFeeRateBps,
  guestFeeRateBps,
}: BookingPriceInput): BookingPrice {
  const guestFeeAmount = feeAmount(accommodationAmount, guestFeeRateBps);
  const ownerFeeAmount = feeAmount(accommodationAmount, ownerFeeRateBps);

  return {
    accommodationAmount,
    guestFeeRate: guestFeeRateBps / 10_000,
    guestFeeAmount,
    ownerFeeRate: ownerFeeRateBps / 10_000,
    ownerFeeAmount,
    guestTotalAmount: accommodationAmount + guestFeeAmount,
    ownerNetAmount: accommodationAmount - ownerFeeAmount,
    platformGrossRevenue: guestFeeAmount + ownerFeeAmount,
  };
}

export function formatMinorUnits(amount: number, currency = "EUR") {
  assertInteger(amount, "Currency amount");
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatFeeRate(rate: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(rate);
}
