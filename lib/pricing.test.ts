import assert from "node:assert/strict";
import test from "node:test";
import { calculateBookingPrice } from "./pricing.ts";

test("calculates the 32+ launch example entirely in cents", () => {
  assert.deepEqual(
    calculateBookingPrice({
      accommodationAmount: 300_000,
      ownerFeeRateBps: 500,
      guestFeeRateBps: 500,
    }),
    {
      accommodationAmount: 300_000,
      guestFeeRate: 0.05,
      guestFeeAmount: 15_000,
      ownerFeeRate: 0.05,
      ownerFeeAmount: 15_000,
      guestTotalAmount: 315_000,
      ownerNetAmount: 285_000,
      platformGrossRevenue: 30_000,
    },
  );
});

test("rounds fractional-cent fees half up", () => {
  const result = calculateBookingPrice({
    accommodationAmount: 10_001,
    ownerFeeRateBps: 500,
    guestFeeRateBps: 500,
  });
  assert.equal(result.guestFeeAmount, 500);
  assert.equal(result.ownerFeeAmount, 500);

  const halfCent = calculateBookingPrice({
    accommodationAmount: 1,
    ownerFeeRateBps: 5_000,
    guestFeeRateBps: 5_000,
  });
  assert.equal(halfCent.guestFeeAmount, 1);
  assert.equal(halfCent.ownerFeeAmount, 1);
});

test("a future rate does not mutate an existing booking snapshot", () => {
  const existingBooking = calculateBookingPrice({
    accommodationAmount: 300_000,
    ownerFeeRateBps: 500,
    guestFeeRateBps: 500,
  });
  const futureBooking = calculateBookingPrice({
    accommodationAmount: 300_000,
    ownerFeeRateBps: 750,
    guestFeeRateBps: 750,
  });

  assert.equal(existingBooking.guestFeeAmount, 15_000);
  assert.equal(existingBooking.ownerFeeAmount, 15_000);
  assert.equal(futureBooking.guestFeeAmount, 22_500);
  assert.equal(futureBooking.ownerFeeAmount, 22_500);
});
