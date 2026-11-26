import React, { useCallback, useEffect, useState } from "react";
import { Pagination } from "../../components/ui/Navigation";
import { SearchInput } from "../../components/ui/Input";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import Poster from "../../components/Poster";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { formatPrice, formatShowDate, formatShowTime, getErrorMessage, isUpcomingShow } from "../../lib/format";

const PAGE_SIZE = 12;

// New showtimes default to the 800-seat single-level flagship hall. Shows
// stored before halls existed (no layoutId) are the classic hall.
const DEFAULT_LAYOUT = "grand-800";
const LEGACY_LAYOUT = "classic-136";
const EMPTY_FORM = { movieId: "", theatre: "", date: "", time: "", balconyPrice: "", firstClassPrice: "", secondClassPrice: "", layoutId: DEFAULT_LAYOUT, screenName: "" };

const PRICE_FIELDS = [
  { key: "balconyPrice", label: "Premium price (₹, back rows)" },
  { key: "firstClassPrice", label: "First Class price (₹)" },
  { key: "secondClassPrice", label: "Second Class price (₹)" },
];

function AdminShows() {
  const toast = useToast();
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [status, setStatus] = useState("loading");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  // After a save, show the page that holds that showtime.
  const [focusId, setFocusId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [movieRes, showRes, layoutRes] = await Promise.all([
        API.get("/api/movies"),
        API.get("/api/shows"),
        API.get("/api/shows/layouts").catch(() => ({ data: [] })),
      ]);
      setMovies(Array.isArray(movieRes.data) ? movieRes.data : []);
      setShows(Array.isArray(showRes.data) ? showRes.data : []);
      setLayouts(Array.isArray(layoutRes.data) ? layoutRes.data : []);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: "" }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
  };

  const validate = () => {
    const next = {};
    if (!form.movieId) next.movieId = "Choose a movie.";
    if (!form.theatre.trim()) next.theatre = "Enter the theatre or screen.";
    if (!form.date) next.date = "Pick a date.";
    if (!form.time) next.time = "Pick a time.";
    PRICE_FIELDS.forEach(({ key }) => {
      if (form[key] === "" || !(Number(form[key]) >= 0)) next[key] = "Enter a price.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveShow = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        movieId: form.movieId,
        theatre: form.theatre.trim(),
        date: form.date,
        time: form.time,
        balconyPrice: Number(form.balconyPrice),
        firstClassPrice: Number(form.firstClassPrice),
        secondClassPrice: Number(form.secondClassPrice),
        screenName: (form.screenName || "").trim(),
      };
      if (editId) {
        // The hall of an existing showtime is fixed (its seats and bookings come from it).
        await API.put(`/api/shows/${editId}`, payload);
        setFocusId(editId);
        toast.success("Showtime updated.");
      } else {
        const res = await API.post("/api/shows", { ...payload, layoutId: form.layoutId || DEFAULT_LAYOUT });
        setFocusId(res.data?._id || res.data?.show?._id || null);
        toast.success("Showtime published.");
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save the showtime."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s) => {
    setEditId(s._id);
    setErrors({});
    setForm({
      movieId: s.movieId?._id || s.movieId || "",
      theatre: s.theatre || "",
      date: s.date || "",
      time: s.time || "",
      balconyPrice: String(s.balconyPrice ?? ""),
      firstClassPrice: String(s.firstClassPrice ?? ""),
      secondClassPrice: String(s.secondClassPrice ?? ""),
      layoutId: s.layoutId || LEGACY_LAYOUT,
      screenName: s.screenName || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/api/shows/${deleteTarget._id}`);
      toast.success("Showtime deleted.");
      if (editId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't delete the showtime."));
    } finally {
      setDeleting(false);
    }
  };

  const selectedMovie = movies.find((m) => m._id === form.movieId);
  const query = searchQuery.trim().toLowerCase();
  const filteredShows = shows.filter(
    (s) => !query || (s.movieId?.title || "").toLowerCase().includes(query) || (s.theatre || "").toLowerCase().includes(query)
  );
  const upcomingCount = shows.filter((s) => isUpcomingShow(s)).length;
  const pageCount = Math.max(1, Math.ceil(filteredShows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageShows = filteredShows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // A new search starts from the first page.
  useEffect(() => setPage(1), [query]);

  useEffect(() => {
    if (!focusId) return;
    const index = filteredShows.findIndex((s) => s._id === focusId);
    if (index >= 0) {
      setPage(Math.floor(index / PAGE_SIZE) + 1);
      setFocusId(null);
    }
  }, [focusId, filteredShows]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          breadcrumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Showtimes" }]}
          title="Showtimes"
          subtitle="Schedule shows and set seat prices for each class."
          icon="calendar"
          actions={
            <>
              <span className="badge">{shows.length} total</span>
              <span className="badge-green">{upcomingCount} upcoming</span>
            </>
          }
        />

        <form onSubmit={saveShow} className="card space-y-5 p-5 sm:p-6" noValidate aria-labelledby="show-form-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="show-form-title" className="text-lg font-semibold text-white">
              {editId ? "Edit showtime" : "Schedule a showtime"}
            </h2>
            {editId && (
              <button type="button" onClick={resetForm} className="btn-ghost btn-sm">
                Cancel editing
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="s-movie" label="Movie" required error={errors.movieId}>
              <select id="s-movie" className={`select ${errors.movieId ? "input-error" : ""}`} value={form.movieId} onChange={update("movieId")}>
                <option value="">Choose a movie</option>
                {movies.map((m) => (
                  <option key={m._id} value={m._id}>{m.title}</option>
                ))}
              </select>
            </Field>
            <Field id="s-theatre" label="Theatre / screen" required error={errors.theatre}>
              <input id="s-theatre" className={`input ${errors.theatre ? "input-error" : ""}`} placeholder="e.g. IMAX Screen 1" value={form.theatre} onChange={update("theatre")} />
            </Field>
            <Field
              id="s-layout"
              label="Auditorium"
              hint={editId ? "Fixed for an existing showtime: its seats and bookings come from it." : "Seats are created from this layout."}
            >
              <select
                id="s-layout"
                className="select"
                value={form.layoutId}
                onChange={update("layoutId")}
                disabled={!!editId}
                data-testid="show-layout"
              >
                {(layouts.length ? layouts : [{ id: DEFAULT_LAYOUT, name: "Grand hall · 800 seats", totalSeats: 800 }]).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name.replace(/ · \d+ seats$/, "")} · {l.totalSeats} seats{l.rows ? `, ${l.rows} rows` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="s-screen" label="Auditorium name (optional)" hint="Shown on tickets, e.g. Audi 3.">
              <input id="s-screen" className="input" maxLength={40} placeholder="e.g. Audi 3" value={form.screenName} onChange={update("screenName")} />
            </Field>
            <Field id="s-date" label="Date" required error={errors.date}>
              <input id="s-date" type="date" className={`input ${errors.date ? "input-error" : ""}`} value={form.date} onChange={update("date")} />
            </Field>
            <Field id="s-time" label="Time" required error={errors.time}>
              <input id="s-time" type="time" className={`input ${errors.time ? "input-error" : ""}`} value={form.time} onChange={update("time")} />
            </Field>
            {PRICE_FIELDS.map(({ key, label }) => (
              <Field key={key} id={`s-${key}`} label={label} required error={errors[key]}>
                <input id={`s-${key}`} type="number" min="0" inputMode="numeric" className={`input ${errors[key] ? "input-error" : ""}`} value={form[key]} onChange={update(key)} />
              </Field>
            ))}
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : editId ? "Save changes" : "Publish showtime"}
              </button>
            </div>
          </div>

          {selectedMovie && (
            <div className="card-muted flex items-center gap-3 p-3">
              <Poster src={selectedMovie.poster} alt="" className="h-14 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{selectedMovie.title}</p>
                <p className="truncate text-xs text-gray-400">{selectedMovie.genre}</p>
              </div>
            </div>
          )}
          {!editId && (
            <p className="text-xs text-gray-500">New showtimes use the 800-seat Grand hall by default: one level, Premium recliners at the back, First Class and Second Class. Pick another hall above.</p>
          )}
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            id="show-search"
            wrapperClassName="sm:w-80"
            label="Search showtimes"
            placeholder="Search by movie or theatre"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <p className="text-sm text-gray-400" aria-live="polite">
            Showing <span className="font-semibold text-white">{filteredShows.length}</span> of {shows.length}
          </p>
        </div>

        {status === "loading" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-card" />)}
          </div>
        ) : status === "error" ? (
          <ErrorState title="We couldn't load showtimes" onRetry={fetchData} />
        ) : filteredShows.length === 0 ? (
          <EmptyState icon="calendar" title={shows.length ? "No showtimes match" : "No showtimes yet"} message={shows.length ? "Try a different search." : "Use the form above to schedule one."} />
        ) : (
          <>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageShows.map((s) => {
              const movie = s.movieId || {};
              const total = s.seats?.length || 0;
              const booked = (s.seats || []).filter((x) => x.isBooked).length;
              const upcoming = isUpcomingShow(s);
              return (
                <li key={s._id} className={`card flex gap-4 p-4 ${editId === s._id ? "ring-2 ring-brand-500" : ""}`}>
                  <Poster src={movie.poster} alt="" className="h-32 w-[88px] shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="badge-brand">{s.theatre}</span>
                      <span className="badge" data-testid="show-capacity">{total} seats</span>
                      {upcoming ? <span className="badge-green">Upcoming</span> : <span className="badge">Past</span>}
                    </div>
                    <h3 className="mt-2 truncate font-semibold text-white">{movie.title || "Unknown movie"}</h3>
                    <p className="mt-0.5 text-sm text-gray-300">
                      {formatShowDate(s.date)} · {formatShowTime(s.time)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {booked} of {total} seats booked · {formatPrice(s.balconyPrice)} / {formatPrice(s.firstClassPrice)} / {formatPrice(s.secondClassPrice)}
                    </p>
                    <div className="mt-auto flex gap-2 pt-3">
                      <button onClick={() => handleEdit(s)} className="btn-secondary btn-sm flex-1" aria-label={`Edit ${movie.title || "show"} at ${s.theatre}`}>
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="btn-icon h-8 w-8 hover:border-danger-500/40 hover:text-danger-300" aria-label={`Delete ${movie.title || "show"} at ${s.theatre}`}>
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            label="Showtime pages"
            page={currentPage}
            pageCount={pageCount}
            onChange={setPage}
            total={filteredShows.length}
            pageSize={PAGE_SIZE}
          />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete this showtime?"
        message="It will no longer be bookable. This can't be undone. Existing bookings are kept."
        confirmLabel="Delete showtime"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

export default AdminShows;
