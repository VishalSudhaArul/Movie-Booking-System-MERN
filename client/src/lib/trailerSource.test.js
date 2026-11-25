import { trailerSource, youtubeScreenUrl } from "./trailerSource";

const ID = "dQw4w9WgXcQ";
const base = "https://cinebook.example";

test("recognises every YouTube link form the admin page accepts", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}?autoplay=1`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  ${ID}  `,
  ]) {
    expect(trailerSource(url, base)).toEqual({ kind: "youtube", id: ID, key: `yt:${ID}` });
  }
});

test("direct video files, absolute or on this site", () => {
  expect(trailerSource("https://cdn.example/t/film.mp4", base)).toMatchObject({ kind: "video", src: "https://cdn.example/t/film.mp4" });
  expect(trailerSource("/trailers/film.webm", base)).toMatchObject({ kind: "video", src: `${base}/trailers/film.webm` });
});

test("anything else means 'show the poster'", () => {
  for (const url of [
    undefined,
    null,
    "",
    "   ",
    42,
    "not a url",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ<script>",
    `https://youtu.be/${ID}extra`,
    "https://youtube.com/channel/UC123",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://vimeo.com/123456",
    "javascript:alert(1)//.mp4",
    "data:video/mp4;base64,AAAA",
    "ftp://files.example/film.mp4",
  ]) {
    expect(trailerSource(url, base)).toBeNull();
  }
});

test("the screen embed is muted, controls-free, looping and scriptable", () => {
  const u = new URL(youtubeScreenUrl(ID, base));
  expect(u.origin).toBe("https://www.youtube-nocookie.com");
  expect(u.pathname).toBe(`/embed/${ID}`);
  expect(Object.fromEntries(u.searchParams)).toMatchObject({
    autoplay: "1", mute: "1", controls: "0", loop: "1", playlist: ID, enablejsapi: "1", origin: base, playsinline: "1",
  });
});
