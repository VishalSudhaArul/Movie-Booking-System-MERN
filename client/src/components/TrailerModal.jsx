import React from "react";

function TrailerModal({ isOpen, onClose, trailerUrl, movieTitle }) {
  if (!isOpen) return null;

  // Helper to extract YouTube video ID if standard URL was passed
  const getEmbedUrl = (url) => {
    if (!url) return "https://www.youtube.com/embed/dQw4w9WgXcQ"; // Fallback demo trailer
    if (url.includes("embed/")) return url;
    
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else {
      videoId = url;
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all">
      <div className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">🎬</span>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {movieTitle ? `${movieTitle} - Official Trailer` : "Official Trailer"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full w-9 h-9 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={getEmbedUrl(trailerUrl)}
            title={`${movieTitle || 'Movie'} Trailer`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Close Trailer
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
