"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type BlockedPeriod = { move_in: string; move_out: string };

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function isWithin(date: string, period: BlockedPeriod) {
  return date >= period.move_in && date < period.move_out;
}

export default function AvailabilityCalendar({
  propertyId,
  moveIn,
  moveOut,
  onChange,
  onUnavailable,
}: {
  propertyId: string;
  moveIn: string;
  moveOut: string;
  onChange: (moveIn: string, moveOut: string) => void;
  onUnavailable: (message: string) => void;
}) {
  const initial = moveIn ? parseDate(moveIn) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const [blocked, setBlocked] = useState<BlockedPeriod[]>([]);

  useEffect(() => {
    let active = true;
    supabase
      .rpc("get_property_calendar", { p_property_id: propertyId })
      .then(({ data }) => {
        if (active) setBlocked((data || []) as BlockedPeriod[]);
      });
    return () => {
      active = false;
    };
  }, [propertyId]);

  const days = useMemo(() => {
    const firstOffset = (visibleMonth.getDay() + 6) % 7;
    const firstCell = addDays(visibleMonth, -firstOffset);
    return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
  }, [visibleMonth]);

  function choose(date: Date) {
    const value = isoDate(date);
    if (blocked.some((period) => isWithin(value, period))) return;

    if (!moveIn || moveOut || value <= moveIn) {
      onUnavailable("");
      onChange(value, "");
      return;
    }

    const crossesReservation = blocked.some(
      (period) => period.move_in < value && period.move_out > moveIn,
    );
    if (crossesReservation) {
      onUnavailable(
        "That stay crosses reserved dates. Please choose an earlier move-out date or a new move-in date.",
      );
      return;
    }

    onUnavailable("");
    onChange(moveIn, value);
  }

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const today = isoDate(new Date());

  return (
    <section className="availability-calendar" aria-label="Property availability">
      <header>
        <button
          type="button"
          aria-label="Previous month"
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() - 1,
                1,
              ),
            )
          }
        >
          ‹
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          aria-label="Next month"
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() + 1,
                1,
              ),
            )
          }
        >
          ›
        </button>
      </header>
      <div className="availability-weekdays" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="availability-days">
        {days.map((date) => {
          const value = isoDate(date);
          const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
          const reserved = blocked.some((period) => isWithin(value, period));
          const past = value < today;
          const selected = value === moveIn || value === moveOut;
          const inSelection = Boolean(
            moveIn && moveOut && value > moveIn && value < moveOut,
          );
          return (
            <button
              type="button"
              key={value}
              disabled={outsideMonth || reserved || past}
              aria-label={`${value}${reserved ? ", reserved" : ""}`}
              className={`${reserved ? "reserved" : ""} ${selected ? "selected" : ""} ${inSelection ? "in-selection" : ""}`}
              onClick={() => choose(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="availability-legend">
        <span>
          <i>15</i> Available
        </span>
        <span>
          <i className="reserved">15</i> Reserved
        </span>
      </div>
      <p>
        {!moveIn
          ? "Select your move-in date."
          : !moveOut
            ? "Now select your move-out date."
            : "Your selected rental period is highlighted."}
      </p>
    </section>
  );
}
