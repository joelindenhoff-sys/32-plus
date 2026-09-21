export const MINIMUM_STAY_NIGHTS = 32;
export const MAXIMUM_STAY_NIGHTS = 334;
export const RENTAL_DURATION_MESSAGE =
  "Flexible rentals from 32 nights to 11 months.";

export const TEMPORARY_STAY_REASONS = [
  "Work or temporary assignment",
  "Studies or training",
  "Medical treatment",
  "Temporary relocation",
  "Extended holiday / temporary stay",
  "Other legitimate temporary reason",
] as const;

export const OTHER_TEMPORARY_STAY_REASON =
  "Other legitimate temporary reason";

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}
export function countStayNights(moveIn: string, moveOut: string) {
  const start = parseIsoDate(moveIn);
  const end = parseIsoDate(moveOut);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function getStayDurationError(
  moveIn: string,
  moveOut: string,
  propertyMinimum = MINIMUM_STAY_NIGHTS,
) {
  if (!moveIn || !moveOut) return "Please select your move-in and move-out dates.";
  const nights = countStayNights(moveIn, moveOut);
  const minimum = Math.max(MINIMUM_STAY_NIGHTS, propertyMinimum);
  if (nights < minimum) {
    return minimum === MINIMUM_STAY_NIGHTS
      ? `Please select a stay of at least ${MINIMUM_STAY_NIGHTS} nights.`
      : `This property requires a stay of at least ${minimum} nights.`;
  }
  if (nights > MAXIMUM_STAY_NIGHTS) {
    return `Please select a stay of no more than ${MAXIMUM_STAY_NIGHTS} nights (approximately 11 months).`;
  }
  return null;
}
