import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import API from "../api";
import AdminLayout from "../components/AdminLayout";
import PageHeader from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import { Spinner } from "../components/ui/Feedback";
import TicketResult, { ticketIdFrom } from "../components/TicketResult";

/** Camera scanner for the door: a valid ticket is admitted as soon as it's scanned. */
function Scanner() {
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const busy = useRef(false);

  const checkAndAdmit = useCallback(async (raw) => {
    const id = ticketIdFrom(raw);
    if (!id || busy.current) return;
    busy.current = true;
    setLoading(true);
    setMessage("");
    try {
      const { data: ticket } = await API.get(`/api/bookings/verify/${id}`);
      setBooking(ticket);
      if (ticket.used) {
        setState("used");
      } else {
        // Only the first scan of a ticket can admit it; the server enforces this.
        const { data } = await API.put(`/api/bookings/use/${id}`);
        setState(data?.alreadyUsed ? "used" : "admitted");
      }
    } catch (err) {
      setBooking(null);
      setState("invalid");
      setMessage("This code isn't a CineBook ticket, or the booking doesn't exist.");
    } finally {
      setLoading(false);
      // Brief pause so one QR code held in front of the camera isn't processed repeatedly.
      setTimeout(() => {
        busy.current = false;
      }, 1500);
    }
  }, []);

  useEffect(() => {
    if (!cameraActive) return undefined;
    setCameraError("");
    const scanner = new Html5Qrcode("reader");
    scanner
      .start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => checkAndAdmit(text), () => {})
      .catch(() => {
        setCameraError("We couldn't open the camera. Allow camera access in your browser, or enter the booking ID below.");
        setCameraActive(false);
      });
    return () => {
      scanner.stop().catch(() => {});
    };
  }, [cameraActive, checkAndAdmit]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Staff"
          title="Door scanner"
          subtitle="Scan a guest's QR ticket. Valid tickets are admitted straight away."
          icon="qr"
          actions={
            <button onClick={() => setCameraActive((v) => !v)} className={cameraActive ? "btn-secondary btn-sm" : "btn-primary btn-sm"} aria-pressed={cameraActive}>
              <Icon name={cameraActive ? "close" : "qr"} className="h-4 w-4" /> {cameraActive ? "Stop camera" : "Start camera"}
            </button>
          }
        />

        {cameraError && (
          <p className="alert-error" role="alert">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> {cameraError}
          </p>
        )}

        {cameraActive && (
          <div className="card p-4 text-center">
            <div id="reader" className="mx-auto w-full max-w-sm overflow-hidden rounded-xl" />
            <p className="mt-3 text-xs text-gray-400">Hold the ticket's QR code inside the frame.</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            checkAndAdmit(input);
          }}
          className="card flex flex-col gap-3 p-4 sm:flex-row sm:p-5"
        >
          <label htmlFor="manual-id" className="sr-only">Booking ID or ticket link</label>
          <input id="manual-id" className="input flex-1 font-mono" placeholder="Or type a booking ID" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
            {loading ? <><Spinner className="h-4 w-4" /> Checking…</> : "Check & admit"}
          </button>
        </form>

        <TicketResult state={state} booking={booking} message={message} />
      </div>
    </AdminLayout>
  );
}

export default Scanner;
