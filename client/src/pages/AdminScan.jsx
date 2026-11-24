import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import AdminLayout from "../components/AdminLayout";
import PageHeader from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import { Spinner } from "../components/ui/Feedback";
import TicketResult, { ticketIdFrom } from "../components/TicketResult";
import { getErrorMessage } from "../lib/format";

/** Look a ticket up first, then admit it with a separate, deliberate click. */
export default function AdminScan() {
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState(null); // valid | used | admitted | invalid
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [admitting, setAdmitting] = useState(false);

  const verifyTicket = async (e) => {
    e.preventDefault();
    const id = ticketIdFrom(input);
    if (!id) return;
    setChecking(true);
    setMessage("");
    try {
      const { data } = await API.get(`/api/bookings/verify/${id}`);
      setBooking(data);
      setState(data.used ? "used" : "valid");
    } catch (err) {
      setBooking(null);
      setState("invalid");
      setMessage("Check the booking ID and try again.");
    } finally {
      setChecking(false);
    }
  };

  const admit = async () => {
    setAdmitting(true);
    try {
      const { data } = await API.put(`/api/bookings/use/${booking._id}`);
      setState(data?.alreadyUsed ? "used" : "admitted");
      setMessage(data?.alreadyUsed ? "Another scan admitted this ticket first." : "");
    } catch (err) {
      setMessage(getErrorMessage(err, "We couldn't admit this ticket."));
    } finally {
      setAdmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="Scan tickets"
          subtitle="Enter a booking ID or paste a ticket link, check it, then admit the guest."
          icon="qr"
          actions={
            <Link to="/scanner" className="btn-secondary btn-sm">
              <Icon name="qr" className="h-4 w-4" /> Use camera
            </Link>
          }
        />

        <form onSubmit={verifyTicket} className="card flex flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <label htmlFor="ticket-id" className="sr-only">Booking ID or ticket link</label>
          <input
            id="ticket-id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Booking ID or ticket link"
            className="input flex-1 font-mono"
            autoComplete="off"
            autoFocus
          />
          <button type="submit" disabled={checking || !input.trim()} className="btn-primary">
            {checking ? <><Spinner className="h-4 w-4" /> Checking…</> : "Check ticket"}
          </button>
        </form>

        <TicketResult state={state} booking={booking} message={message}>
          {state === "valid" && (
            <button onClick={admit} disabled={admitting} className="btn btn-lg w-full bg-emerald-600 text-white hover:bg-emerald-500">
              {admitting ? <><Spinner className="h-5 w-5" /> Admitting…</> : <><Icon name="check" className="h-5 w-5" /> Admit guest</>}
            </button>
          )}
        </TicketResult>
      </div>
    </AdminLayout>
  );
}
