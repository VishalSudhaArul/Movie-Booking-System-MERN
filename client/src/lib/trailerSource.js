// trailerSource.js
// Works out what kind of trailer a movie's `trailerUrl` points to, so the 3D
// auditorium can play it on the screen. Returns null for anything it can't
// play safely; the screen then shows the poster.
//
// Supported:
// - YouTube (what admins enter today): watch, youtu.be, embed, shorts, live
//   links, or a bare 11-character video id.
// - A direct video file (.mp4, .webm, .ogv, .m4v) on http(s) or this site.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com", "youtu.be"]);
const VIDEO_FILE = /\.(mp4|webm|ogv|ogg|m4v)$/i;

export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function trailerSource(url, base = typeof window !== "undefined" ? window.location.origin : "http://localhost") {
  if (typeof url !== "string") return null;
  const text = url.trim();
  if (!text || text.length > 2000) return null;
  if (YOUTUBE_ID.test(text)) return { kind: "youtube", id: text, key: `yt:${text}` };

  let parsed;
  try {
    parsed = new URL(text, base);
  } catch (e) {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  if (YOUTUBE_HOSTS.has(host)) {
    let id = null;
    if (host === "youtu.be") id = parsed.pathname.split("/")[1];
    else if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else {
      const m = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/);
      if (m) id = m[1];
    }
    return id && YOUTUBE_ID.test(id) ? { kind: "youtube", id, key: `yt:${id}` } : null;
  }

  if (VIDEO_FILE.test(parsed.pathname)) return { kind: "video", src: parsed.href, key: `video:${parsed.href}` };
  return null;
}

/**
 * The embed address for the in-auditorium screen: muted, no YouTube controls
 * (ours are outside the 3D view), looping, and with the JS API enabled so the
 * page can play, pause and unmute it.
 */
export function youtubeScreenUrl(id, origin = window.location.origin) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    disablekb: "1",
    playsinline: "1",
    loop: "1",
    playlist: id,
    rel: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    fs: "0",
    enablejsapi: "1",
    origin,
  });
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?${params}`;
}
