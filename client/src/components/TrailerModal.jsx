import React from "react";

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
  if (!isOpen) return null;

  const embedUrl = getYouTubeEmbedUrl(trailerUrl) || "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#111118] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0A0A0F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600/20 border border-red-500/40 rounded-xl flex items-center justify-center text-red-500 text-lg">
              🎬
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                {movieTitle ? `${movieTitle}` : "Official Trailer"}
              </h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                In-App HD Player
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-full w-9 h-9 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* In-App Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={`${movieTitle || 'Movie'} Trailer`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0A0A0F] border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
          <span>Streaming inside CineBook</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-md shadow-red-600/20"
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
