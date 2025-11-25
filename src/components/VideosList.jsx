import { useState } from 'react';
import { useVideos } from '../contexts/VideosContext';

export default function VideosList({ videos }) {
  const { deleteVideo, refreshVideoStatus } = useVideos();
  const [refreshingId, setRefreshingId] = useState(null);

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: open in new tab if download fails
      window.open(url, '_blank');
    }
  };

  const handleDownloadAudio = (video) => {
    if (video.audioUrl) {
      const filename = `${video.chapterTitle || 'audio'}-${video.id}.mp3`;
      downloadFile(video.audioUrl, filename);
    }
  };

  const handleDownloadVideo = (video) => {
    if (video.videoUrl) {
      const filename = `${video.chapterTitle || 'video'}-${video.id}.mp4`;
      downloadFile(video.videoUrl, filename);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="bg-white border border-gray-300 rounded p-8 text-center">
        <p className="text-gray-600">No chapters created yet. Create your first chapter to get started!</p>
      </div>
    );
  }

  // Sort videos by chapter number
  const sortedVideos = [...videos].sort((a, b) => {
    const chapterA = a.chapterNumber || 0;
    const chapterB = b.chapterNumber || 0;
    return chapterA - chapterB;
  });

  return (
    <div className="bg-white border border-gray-300 rounded overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-300">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">Chapter</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">Title</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">Created</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedVideos.map((video) => {
            console.log('🎬 Rendering video:', video.id, 'status:', video.heyGenStatus, 'videoUrl:', video.videoUrl);
            return (
              <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-black">
                  {video.chapterNumber}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-black">
                  {video.chapterTitle}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${
                      video.heyGenStatus === 'completed' ? 'bg-white text-black border-green-500' :
                      video.heyGenStatus === 'processing' ? 'bg-white text-black border-yellow-500' :
                      video.heyGenStatus === 'failed' ? 'bg-black text-white border-black' :
                      'bg-gray-100 text-black border-gray-400'
                    }`}>
                      {video.heyGenStatus === 'processing' && (
                        <span className="inline-flex items-center gap-0.5">
                          <span className="processing-dot inline-block w-1 h-1 rounded-full bg-yellow-500"></span>
                          <span className="processing-dot inline-block w-1 h-1 rounded-full bg-yellow-500"></span>
                          <span className="processing-dot inline-block w-1 h-1 rounded-full bg-yellow-500"></span>
                        </span>
                      )}
                      {video.heyGenStatus}
                    </span>
                    {video.heyGenVideoId && (video.heyGenStatus === 'processing' || video.heyGenStatus === 'pending') && (
                      <button
                        onClick={async () => {
                          if (refreshingId === video.id) return;
                          setRefreshingId(video.id);
                          try {
                            await refreshVideoStatus(video.id, video.heyGenVideoId);
                          } catch (error) {
                            console.error('Failed to refresh:', error);
                          } finally {
                            setRefreshingId(null);
                          }
                        }}
                        disabled={refreshingId === video.id}
                        className="text-black hover:text-gray-600 disabled:opacity-50 transition-transform disabled:animate-spin"
                        title="Check if video is ready"
                      >
                        <svg 
                          className={`w-3.5 h-3.5 ${refreshingId === video.id ? 'animate-spin' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(video.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {video.heyGenStatus === 'completed' && (
                      <>
                        {video.videoUrl && (
                          <>
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-black hover:text-gray-600 text-sm underline"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDownloadVideo(video)}
                              className="text-black hover:text-gray-600 text-sm underline"
                              title="Download video"
                            >
                              ↓ Video
                            </button>
                          </>
                        )}
                        {video.audioUrl && (
                          <button
                            onClick={() => handleDownloadAudio(video)}
                            className="text-black hover:text-gray-600 text-sm underline"
                            title="Download audio"
                          >
                            ↓ Audio
                          </button>
                        )}
                      </>
                    )}
                    {video.videoUrl && video.heyGenStatus !== 'completed' && (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-gray-600 text-sm underline"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => deleteVideo(video.id)}
                      className="text-black hover:text-gray-600 text-sm underline"
                      title="Delete video"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

