import React, { useEffect, useMemo, useState } from "react";
import API from "../api";
import Icon from "./ui/Icon";
import { Spinner } from "./ui/Feedback";
import { buildAuditorium, nearestDoor, rowLabelOf, seatIndexOf } from "../lib/auditorium";

const KIND = {
  entrance: ["Entrance", "pin"],
  auditorium: ["Auditorium", "film"],
  food: ["Food counter", "popcorn"],
  restroom: ["Restrooms", "info"],
  exit: ["Emergency exit", "arrowRight"],
  accessible: ["Accessible route", "user"],
  parking: ["Parking", "car"],
  info: ["Information", "info"],
};
const BLOCK = { left: "left block", centre: "centre block", right: "right block" };

/**
 * "Finding your seat": the auditorium, row, seat and nearest door for each
 * booked seat (from the hall's layout), plus the venue's published directions.
 * Venue places are only shown when the theatre has published them.
 */
export default function VenueGuide({ showId, theatre, screenName, seats = [] }) {
  const [hall, setHall] = useState(null);
  const [venue, setVenue] = useState(undefined); // undefined = loading, null = none published
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const id = typeof showId === "object" ? showId?._id : showId;
    if (id) {
      API.get(`/api/shows/single/${id}`)
        .then(({ data }) => alive && setHall(buildAuditorium(data.layout, data.seats)))
        .catch(() => alive && setFailed(true));
    }
    if (theatre) {
      API.get("/api/venues/lookup", { params: { theatre } })
        .then(({ data }) => alive && setVenue(data?.venue || null))
        .catch(() => alive && setVenue(null));
    } else setVenue(null);
    return () => {
      alive = false;
    };
  }, [showId, theatre]);

  const seatInfo = useMemo(
    () =>
      seats.map((n) => {
        const seat = hall?.seatIndex.get(n);
        const door = seat ? nearestDoor(hall, seat) : null;
        const stepFree = seat?.wheelchair || seat?.companion ? nearestDoor(hall, seat, { accessibleOnly: true }) : null;
        return { n, row: rowLabelOf(n), index: seatIndexOf(n), seat, door, stepFree };
      }),
    [hall, seats]
  );

  return (
    <section className="rounded-xl border border-line bg-fill-subtle p-4 text-sm" aria-label="Finding your seat" data-testid="venue-guide">
      <h3 className="flex items-center gap-2 font-semibold text-white">
        <Icon name="pin" className="h-4 w-4 text-brand-300" /> Finding your seat
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        {theatre}
        {screenName ? ` · ${screenName}` : " · Auditorium shown at the entrance"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {seatInfo.map((s) => (
          <li key={s.n} className="text-xs text-gray-300">
            <span className="font-semibold text-white">Row {s.row}, Seat {s.index}</span>
            {s.seat && BLOCK[s.seat.block] ? ` · ${BLOCK[s.seat.block]}` : ""}
            {s.seat?.aisleSeat ? " · aisle seat" : ""}
            {s.seat?.wheelchair ? " · wheelchair space" : ""}
            {s.door && <span className="text-gray-400"> · nearest door: {s.door.door.label.toLowerCase()}</span>}
            {s.stepFree && s.stepFree.door.id !== s.door?.door.id && <span className="text-gray-400"> · step-free: {s.stepFree.door.label.toLowerCase()}</span>}
          </li>
        ))}
      </ul>
      {!hall && !failed && seats.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-2xs text-gray-500"><Spinner className="h-3 w-3" /> Loading the hall plan…</p>
      )}

      {venue === undefined ? null : venue ? (
        <div className="mt-3 border-t border-line pt-3">
          {venue.entryInstructions && <p className="text-xs text-gray-200">{venue.entryInstructions}</p>}
          {venue.points?.length > 0 && (
            <ul className="mt-2 space-y-1.5" aria-label="Places at this venue">
              {venue.points.map((p, i) => {
                const [label, icon] = KIND[p.kind] || KIND.info;
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Icon name={icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                    <span>
                      <span className="font-medium text-white">{p.label}</span>
                      <span className="text-gray-500"> ({label})</span>
                      {p.directions && <span className="block text-gray-400">{p.directions}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {(venue.address || venue.mapUrl) && (
            <p className="mt-2 text-2xs text-gray-400">
              {venue.address}
              {venue.mapUrl && (
                <>
                  {venue.address ? " · " : ""}
                  <a href={venue.mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-300 underline">
                    Open map
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-2xs text-gray-500">
          This theatre hasn't published venue directions yet. Staff at the entrance will point you to your auditorium.
        </p>
      )}
    </section>
  );
}
