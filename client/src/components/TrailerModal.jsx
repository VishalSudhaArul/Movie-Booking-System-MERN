import React from "react";
import Modal from "./ui/Modal";
import { EmptyState } from "./ui/Feedback";

// Helper function to extract YouTube Embed URL cleanly
export const getYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  let videoId = "";
  try {
    if (trimmed.includes("youtu.be/")) {
      videoId = trimmed.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
    } else if (trimmed.includes("youtube.com/watch")) {
      const urlObj = new URL(trimmed);
      videoId = urlObj.searchParams.get("v");
    } else if (trimmed.includes("youtube.com/embed/")) {
      videoId = trimmed.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
    } else if (trimmed.includes("youtube.com/shorts/")) {
      videoId = trimmed.split("youtube.com/shorts/")[1]?.split("?")[0]?.split("&")[0];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      videoId = trimmed;
    }
  } catch (e) {
    console.error("YouTube URL parse error", e);
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : "";
};

function TrailerModal({ isOpen, onClose, trailerUrl, movieTitle }) {
  const embedUrl = getYouTubeEmbedUrl(trailerUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={movieTitle || "Trailer"}
      subtitle="Official trailer"
      size="xl"
    >
      {embedUrl ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={`${movieTitle || "Movie"} trailer`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="p-5">
          <EmptyState
            icon="play"
            title="Trailer not available"
            message="A trailer hasn't been added for this movie yet."
          />
        </div>
      )}
    </Modal>
  );
}

export default TrailerModal;
