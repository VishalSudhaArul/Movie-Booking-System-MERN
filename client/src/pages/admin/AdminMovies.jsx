import { useCallback, useEffect, useState } from "react";
import { SearchInput } from "../../components/ui/Input";
import API from "../../api";
import TrailerModal, { getYouTubeEmbedUrl } from "../../components/TrailerModal";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import Poster from "../../components/Poster";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { formatDuration, getErrorMessage, splitGenres } from "../../lib/format";

const GENRES = ["Action", "Sci-Fi", "Drama", "Comedy", "Thriller", "Horror", "Romance", "Animation"];

const EMPTY_FORM = {
  title: "",
  description: "",
  duration: "",
  poster: "",
  genre: "",
  trailerUrl: "",
  language: "",
  releaseDate: "",
  cast: "",
  director: "",
};

function AdminMovies() {
  const toast = useToast();
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState(null);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await API.get("/api/movies");
      setMovies(Array.isArray(res.data) ? res.data : []);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Enter a title.";
    if (!form.poster.trim()) next.poster = "Enter a poster image URL.";
    if (!form.description.trim()) next.description = "Add a short description.";
    if (form.duration && !(Number(form.duration) > 0)) next.duration = "Enter the length in minutes.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
  };

  const saveMovie = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        duration: Number(form.duration) || 120,
        poster: form.poster.trim(),
        genre: form.genre.trim() || "Action",
        trailerUrl: form.trailerUrl.trim(),
        language: form.language.trim(),
        releaseDate: form.releaseDate.trim(),
        cast: form.cast.trim(),
        director: form.director.trim(),
      };
      if (editId) {
        await API.put(`/api/movies/${editId}`, payload);
        toast.success(`Saved changes to "${payload.title}".`);
      } else {
        await API.post("/api/movies", payload);
        toast.success(`Added "${payload.title}".`);
      }
      resetForm();
      fetchMovies();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save the movie."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m) => {
    setEditId(m._id);
    setErrors({});
    setForm({
      title: m.title || "",
      description: m.description || "",
      duration: m.duration ? String(m.duration) : "",
      poster: m.poster || "",
      genre: m.genre || "",
      trailerUrl: m.trailerUrl || "",
      language: m.language || "",
      releaseDate: m.releaseDate || "",
      cast: m.cast || "",
      director: m.director || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/api/movies/${deleteTarget._id}`);
      toast.success(`Deleted "${deleteTarget.title}".`);
      if (editId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      fetchMovies();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't delete the movie."));
    } finally {
      setDeleting(false);
    }
  };

  const hasGenre = (m, g) => splitGenres(m.genre).some((x) => x.toLowerCase() === g.toLowerCase());
  const query = search.trim().toLowerCase();
  const filteredMovies = movies.filter(
    (m) =>
      (!query || m.title.toLowerCase().includes(query) || (m.genre || "").toLowerCase().includes(query)) &&
      (genreFilter === "All" || hasGenre(m, genreFilter))
  );

  const previewEmbedUrl = getYouTubeEmbedUrl(form.trailerUrl);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          breadcrumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Movies" }]}
          title="Movies"
          subtitle="Add and edit the films shown on the site, including in-app trailers."
          icon="film"
          actions={
            <>
              <span className="badge">{movies.length} movies</span>
              <span className="badge-accent">{movies.filter((m) => !!m.trailerUrl).length} with trailers</span>
            </>
          }
        />

        {/* Add / edit form */}
        <form onSubmit={saveMovie} className="card space-y-5 p-5 sm:p-6" noValidate aria-labelledby="movie-form-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="movie-form-title" className="text-lg font-semibold text-white">
              {editId ? "Edit movie" : "Add a movie"}
            </h2>
            {editId && (
              <button type="button" onClick={resetForm} className="btn-ghost btn-sm">
                Cancel editing
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="m-title" label="Title" required error={errors.title} className="lg:col-span-2">
              <input id="m-title" className={`input ${errors.title ? "input-error" : ""}`} value={form.title} onChange={update("title")} />
            </Field>
            <Field id="m-genre" label="Genres" hint="Comma-separated, e.g. Sci-Fi, Thriller">
              <input id="m-genre" className="input" value={form.genre} onChange={update("genre")} />
            </Field>
            <Field id="m-duration" label="Length (minutes)" error={errors.duration}>
              <input id="m-duration" type="number" min="1" inputMode="numeric" className={`input ${errors.duration ? "input-error" : ""}`} value={form.duration} onChange={update("duration")} />
            </Field>
            <Field id="m-poster" label="Poster image URL" required error={errors.poster} className="sm:col-span-2">
              <input id="m-poster" className={`input ${errors.poster ? "input-error" : ""}`} value={form.poster} onChange={update("poster")} />
            </Field>
            <Field id="m-trailer" label="YouTube trailer URL" className="sm:col-span-2">
              <input id="m-trailer" className="input font-mono" value={form.trailerUrl} onChange={update("trailerUrl")} />
            </Field>
            <Field id="m-language" label="Language">
              <input id="m-language" className="input" value={form.language} onChange={update("language")} />
            </Field>
            <Field id="m-release" label="Release date">
              <input id="m-release" type="date" className="input" value={form.releaseDate} onChange={update("releaseDate")} />
            </Field>
            <Field id="m-director" label="Director">
              <input id="m-director" className="input" value={form.director} onChange={update("director")} />
            </Field>
            <Field id="m-cast" label="Cast">
              <input id="m-cast" className="input" value={form.cast} onChange={update("cast")} />
            </Field>
            <Field id="m-desc" label="Description" required error={errors.description} className="sm:col-span-2 lg:col-span-4">
              <textarea id="m-desc" rows="3" className={`input ${errors.description ? "input-error" : ""}`} value={form.description} onChange={update("description")} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-gray-500">Quick genre:</span>
            {GENRES.map((g) => (
              <button key={g} type="button" onClick={() => setForm((f) => ({ ...f, genre: g }))} className="chip px-3 py-1.5">
                {g}
              </button>
            ))}
          </div>

          {previewEmbedUrl && (
            <div className="card-muted space-y-2 p-3">
              <p className="text-xs font-semibold text-gray-400">Trailer preview</p>
              <div className="mx-auto aspect-video max-w-xl overflow-hidden rounded-xl bg-black">
                <iframe
                  src={previewEmbedUrl}
                  title="Trailer preview"
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : editId ? "Save changes" : <><Icon name="plus" className="h-4 w-4" /> Add movie</>}
            </button>
          </div>
        </form>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput
            id="movie-search"
            wrapperClassName="md:w-80"
            label="Search movies"
            placeholder="Search by title or genre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="scroll-row -mx-4 px-4 md:mx-0 md:px-0" role="group" aria-label="Filter by genre">
            {["All", ...GENRES].map((g) => {
              const count = g === "All" ? movies.length : movies.filter((m) => hasGenre(m, g)).length;
              return (
                <button key={g} onClick={() => setGenreFilter(g)} aria-pressed={genreFilter === g} className={`chip ${genreFilter === g ? "chip-active" : ""}`}>
                  {g} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalogue */}
        {status === "loading" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] rounded-2xl" />)}
          </div>
        ) : status === "error" ? (
          <ErrorState title="We couldn't load movies" onRetry={fetchMovies} />
        ) : filteredMovies.length === 0 ? (
          <EmptyState icon="film" title={movies.length ? "No movies match" : "No movies yet"} message={movies.length ? "Try a different search or genre." : "Add your first movie with the form above."} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredMovies.map((m) => (
              <li key={m._id} className={`card flex flex-col overflow-hidden ${editId === m._id ? "ring-2 ring-brand-500" : ""}`}>
                <div className="relative">
                  <Poster src={m.poster} alt="" className="aspect-[2/3] w-full" />
                  <span className="badge absolute left-2 top-2 border-line-strong bg-ink-950/80 backdrop-blur">
                    <Icon name="clock" className="h-3 w-3" /> {formatDuration(m.duration)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3.5">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">{m.title}</h3>
                    <p className="truncate text-xs text-gray-400">{splitGenres(m.genre).join(" · ") || "—"}</p>
                  </div>
                  <div className="mt-auto flex gap-1.5">
                    <button onClick={() => handleEdit(m)} className="btn-secondary btn-sm flex-1" aria-label={`Edit ${m.title}`}>
                      Edit
                    </button>
                    {m.trailerUrl && (
                      <button onClick={() => setActiveTrailer({ url: m.trailerUrl, title: m.title })} className="btn-icon h-8 w-8" aria-label={`Play trailer for ${m.title}`}>
                        <Icon name="play" filled className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(m)} className="btn-icon h-8 w-8 hover:border-danger-500/40 hover:text-danger-300" aria-label={`Delete ${m.title}`}>
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeTrailer && (
        <TrailerModal
          isOpen={!!activeTrailer}
          onClose={() => setActiveTrailer(null)}
          trailerUrl={activeTrailer.url}
          movieTitle={activeTrailer.title}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete this movie?"
        message={`"${deleteTarget?.title}" will be removed from the catalogue. Its existing showtimes and bookings are not deleted.`}
        confirmLabel="Delete movie"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

export default AdminMovies;
