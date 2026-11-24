import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Icon from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Feedback";
import TicketResult, { ticketIdFrom } from "../../components/TicketResult";

const SIMULATED = <span className="badge-accent">Simulated</span>;

function Panel({ title, icon, badge, children }) {
  return (
    <section className="card p-5" aria-label={title}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Icon name={icon} className="h-4 w-4 text-brand-300" /> {title}
        </h2>
        {badge}
      </header>
      {children}
    </section>
  );
}

/**
 * Hardware simulator for demos. No physical devices are connected: the gate
 * panel does a real, read-only ticket lookup; everything else is simulated and
 * labelled so.
 */
export default function AdminIoTConsole() {
  // Gate (real lookup, does not admit)
  const [ticketInput, setTicketInput] = useState("");
  const [gate, setGate] = useState({ state: null, booking: null });
  const [checking, setChecking] = useState(false);

  // Parking barrier (simulated rule)
  const [plate, setPlate] = useState("");
  const [barrier, setBarrier] = useState(null);

  // Environment (simulated)
  const [lighting, setLighting] = useState(85);
  const [temperature, setTemperature] = useState(21);
  const [autoMode, setAutoMode] = useState(true);

  // Seat sensors (simulated)
  const [sensors, setSensors] = useState([
    { id: "A1", occupied: true, booked: true },
    { id: "A2", occupied: true, booked: true },
    { id: "A3", occupied: false, booked: false },
    { id: "A4", occupied: false, booked: false },
    { id: "B1", occupied: true, booked: true },
    { id: "B2", occupied: true, booked: false },
    { id: "B3", occupied: false, booked: false },
    { id: "B4", occupied: true, booked: true },
  ]);

  useEffect(() => {
    // Flip one seat now and then so the simulated feed looks alive.
    const id = setInterval(() => {
      setSensors((prev) => prev.map((s) => (s.id === "A3" && Math.random() > 0.6 ? { ...s, occupied: !s.occupied } : s)));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const checkGate = async (e) => {
    e.preventDefault();
    const id = ticketIdFrom(ticketInput);
    if (!id) return;
    setChecking(true);
    try {
      const { data } = await API.get(`/api/bookings/verify/${id}`);
      setGate({ state: data.used ? "used" : "valid", booking: data });
    } catch {
      setGate({ state: "invalid", booking: null });
    } finally {
      setChecking(false);
    }
  };

  const checkPlate = (e) => {
    e.preventDefault();
    const value = plate.trim().toUpperCase();
    if (!value) return;
    // Simulated rule: plates of 6+ characters "have a pass".
    setBarrier(value.replace(/\s/g, "").length >= 6 ? { ok: true, value } : { ok: false, value });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="IoT console"
          subtitle="A simulator for cinema hardware: door gates, parking barriers, seat sensors and climate."
          icon="settings"
        />

        <div className="alert-info">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            No hardware is connected. The gate panel looks tickets up in the real database but never admits anyone. To
            admit guests, use <Link to="/admin/scan" className="font-semibold underline">Scan tickets</Link>. Everything else here is simulated.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Door gate" icon="qr" badge={<span className="badge-green">Live lookup</span>}>
            <form onSubmit={checkGate} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="gate-ticket" className="sr-only">Booking ID</label>
              <input id="gate-ticket" className="input flex-1 font-mono" placeholder="Booking ID" value={ticketInput} onChange={(e) => setTicketInput(e.target.value)} autoComplete="off" />
              <button type="submit" className="btn-primary" disabled={checking || !ticketInput.trim()}>
                {checking ? <><Spinner className="h-4 w-4" /> Checking…</> : "Check"}
              </button>
            </form>
            <div className="mt-4">
              {gate.state ? (
                <TicketResult state={gate.state} booking={gate.booking} message={gate.state === "valid" ? "The gate would open. Not admitted." : undefined} />
              ) : (
                <p className="text-sm text-gray-500">Enter a booking ID to see what the gate would do.</p>
              )}
            </div>
          </Panel>

          <Panel title="Parking barrier" icon="car" badge={SIMULATED}>
            <form onSubmit={checkPlate} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="plate" className="sr-only">Number plate</label>
              <input id="plate" className="input flex-1 font-mono uppercase" placeholder="Number plate, e.g. MH12AB1234" value={plate} onChange={(e) => setPlate(e.target.value)} />
              <button type="submit" className="btn-secondary" disabled={!plate.trim()}>Simulate camera</button>
            </form>
            <div className="mt-4" aria-live="polite">
              {barrier ? (
                <p className={barrier.ok ? "alert-success" : "alert-warning"}>
                  <Icon name={barrier.ok ? "check" : "alert"} className="mt-0.5 h-4 w-4 shrink-0" />
                  {barrier.ok ? `${barrier.value}: barrier would lift.` : `${barrier.value}: no pass, so the barrier stays down.`}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Simulated rule: plates with 6 or more characters have a pass.</p>
              )}
            </div>
          </Panel>

          <Panel title="Seat sensors · Audi 1" icon="grid" badge={SIMULATED}>
            <ul className="grid grid-cols-4 gap-2">
              {sensors.map((s) => {
                const alert = s.occupied && !s.booked;
                return (
                  <li
                    key={s.id}
                    className={`rounded-xl border p-3 text-center text-sm ${
                      alert
                        ? "border-gold-500/50 bg-gold-500/10 text-gold-400"
                        : s.occupied
                        ? "border-brand-500/40 bg-brand-500/10 text-brand-200"
                        : "border-white/10 text-gray-500"
                    }`}
                  >
                    <span className="block font-mono font-semibold">{s.id}</span>
                    <span className="text-[11px]">{alert ? "Not booked" : s.occupied ? "Occupied" : "Empty"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-gray-500">Amber means someone is sitting in a seat that wasn't booked.</p>
          </Panel>

          <Panel title="Lights & climate · Audi 1" icon="settings" badge={SIMULATED}>
            <div className="space-y-5">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-300">Automatic mode</span>
                <button type="button" role="switch" aria-checked={autoMode} onClick={() => setAutoMode((v) => !v)} className={`relative h-6 w-11 rounded-full transition ${autoMode ? "bg-brand-500" : "bg-white/15"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${autoMode ? "left-[22px]" : "left-0.5"}`} />
                  <span className="sr-only">Automatic mode</span>
                </button>
              </label>
              <div>
                <label htmlFor="lights" className="flex justify-between text-sm text-gray-300">
                  Lighting <span className="font-semibold text-white">{lighting}%</span>
                </label>
                <input id="lights" type="range" min="0" max="100" value={lighting} onChange={(e) => setLighting(Number(e.target.value))} disabled={autoMode} className="mt-2 w-full accent-brand-500 disabled:opacity-50" />
              </div>
              <div>
                <label htmlFor="temp" className="flex justify-between text-sm text-gray-300">
                  Temperature <span className="font-semibold text-white">{temperature}°C</span>
                </label>
                <input id="temp" type="range" min="16" max="28" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} disabled={autoMode} className="mt-2 w-full accent-brand-500 disabled:opacity-50" />
              </div>
              {autoMode && <p className="text-xs text-gray-500">Turn off automatic mode to adjust manually.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </AdminLayout>
  );
}
