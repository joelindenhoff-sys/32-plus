import assert from "node:assert/strict";
import test from "node:test";
import {
  countStayNights,
  getStayDurationError,
  MAXIMUM_STAY_NIGHTS,
  MINIMUM_STAY_NIGHTS,
} from "./rentalRules.ts";

test("counts calendar nights without timezone drift", () => {
  assert.equal(countStayNights("2026-03-01", "2026-04-02"), 32);
});
test("enforces the inclusive 32-to-334-night platform range", () => {
  assert.match(getStayDurationError("2026-01-01", "2026-02-01") || "", /at least 32/);
  assert.equal(getStayDurationError("2026-01-01", "2026-02-02"), null);
  assert.equal(countStayNights("2026-01-01", "2026-12-01"), MAXIMUM_STAY_NIGHTS);
  assert.equal(getStayDurationError("2026-01-01", "2026-12-01"), null);
  assert.match(getStayDurationError("2026-01-01", "2026-12-02") || "", /no more than 334/);
  assert.equal(MINIMUM_STAY_NIGHTS, 32);
});

test("respects a property's longer minimum without raising the platform maximum", () => {
  assert.match(getStayDurationError("2026-01-01", "2026-02-10", 60) || "", /at least 60/);
  assert.equal(getStayDurationError("2026-01-01", "2026-03-02", 60), null);
});
