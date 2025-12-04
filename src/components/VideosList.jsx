import { useState } from 'react';
import JSZip from 'jszip';
import { useVideos } from '../contexts/VideosContext';

export default function VideosList({ videos, worldName = '', onEditChapter = null }) {
  const { deleteVideo, refreshVideoStatus } = useVideos();
  const [refreshingId, setRefreshingId] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState(new Set()); // Track which chapters are expanded

  // Helper function to sanitize filenames (remove special characters, replace spaces with underscores)
  const sanitizeFilename = (str) => {
    return str
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Helper function to generate video filename: world_chapter#_chaptertitle_angle
  const getVideoFilename = (video) => {
    const world = sanitizeFilename(worldName || 'world');
    const chapterNum = video.chapterNumber || '';
    const chapterTitle = sanitizeFilename(video.chapterTitle || 'chapter');
    const angle = video.angle || 1;
    return `${world}_${chapterNum}_${chapterTitle}_${angle}.mp4`;
  };

  // Helper function to generate audio filename: world_chapter#_chaptertitle
  const getAudioFilename = (video) => {
    const world = sanitizeFilename(worldName || 'world');
    const chapterNum = video.chapterNumber || '';
    const chapterTitle = sanitizeFilename(video.chapterTitle || 'chapter');
    return `${world}_${chapterNum}_${chapterTitle}.mp3`;
  };

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
      const filename = getAudioFilename(video);
      downloadFile(video.audioUrl, filename);
    }
  };

  const handleDownloadVideo = (video) => {
    if (video.videoUrl) {
      const filename = getVideoFilename(video);
      downloadFile(video.videoUrl, filename);
    }
  };

  const handleDownloadAllVideos = async (chapterVideos) => {
    const completedVideos = chapterVideos.filter(v => v.heyGenStatus === 'completed' && v.videoUrl);
    if (completedVideos.length === 0) {
      alert('No completed videos available to download for this chapter.');
      return;
    }

    // Get the audio URL from the first video (all videos share the same audio)
    const firstVideo = chapterVideos[0];
    const audioUrl = firstVideo?.audioUrl;
    const chapterTitle = firstVideo?.chapterTitle || 'Chapter';
    const chapterNumber = firstVideo?.chapterNumber || '';

    try {
      const zip = new JSZip();
      
      // Add all completed videos to the zip with proper naming
      for (const video of completedVideos) {
        try {
          const response = await fetch(video.videoUrl);
          const blob = await response.blob();
          const filename = getVideoFilename(video);
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading video for angle ${video.angle}:`, error);
        }
      }

      // Add the audio file if available with proper naming
      if (audioUrl && firstVideo) {
        try {
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          const filename = getAudioFilename(firstVideo);
          zip.file(filename, blob);
        } catch (error) {
          console.error('Error downloading audio:', error);
        }
      }

      // Generate the zip file with proper naming
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      const world = sanitizeFilename(worldName || 'world');
      const chapterTitleSanitized = sanitizeFilename(chapterTitle);
      link.download = `${world}_${chapterNumber}_${chapterTitleSanitized}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Failed to create zip file. Please try downloading files individually.');
    }
  };

  const toggleChapter = (chapterKey) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterKey)) {
      newExpanded.delete(chapterKey);
    } else {
      newExpanded.add(chapterKey);
    }
    setExpandedChapters(newExpanded);
  };

  if (videos.length === 0) {
    return (
      <div className="bg-white border border-gray-300 rounded p-8 text-center">
        <p className="text-gray-600">No chapters created yet. Create your first chapter to get started!</p>
      </div>
    );
  }

  // Group videos by chapter (chapterNumber + chapterTitle)
  // Keep all videos (including placeholders) for accurate counts and deletion
  const allVideosByChapter = videos.reduce((acc, video) => {
    const chapterKey = `${video.chapterNumber}-${video.chapterTitle}`;
    if (!acc[chapterKey]) {
      acc[chapterKey] = [];
    }
    acc[chapterKey].push(video);
    return acc;
  }, {});

  // Group videos for display (filtered)
  const groupedVideos = videos.reduce((acc, video) => {
    const chapterKey = `${video.chapterNumber}-${video.chapterTitle}`;
    if (!acc[chapterKey]) {
      acc[chapterKey] = {
        chapterNumber: video.chapterNumber,
        chapterTitle: video.chapterTitle,
        videos: [],
      };
    }
    acc[chapterKey].videos.push(video);
    return acc;
  }, {});

  // Sort chapters by chapter number
  const sortedChapters = Object.values(groupedVideos).sort((a, b) => {
    return (a.chapterNumber || 0) - (b.chapterNumber || 0);
  });

      // Sort videos within each chapter by angle
      sortedChapters.forEach(chapter => {
        chapter.videos.sort((a, b) => (a.angle || 1) - (b.angle || 1));
      });

      // Filter out placeholder videos (pending status with no heyGenVideoId) from display
      // These are just for storing script/audio data, not actual video generation
      sortedChapters.forEach(chapter => {
        chapter.videos = chapter.videos.filter(v => 
          v.heyGenVideoId || 
          v.heyGenStatus !== 'pending' ||
          v.heyGenStatus === 'processing' ||
          v.heyGenStatus === 'completed' ||
          v.heyGenStatus === 'failed'
        );
      });

  return (
    <div className="bg-white border border-gray-300 rounded overflow-hidden">
      <div className="divide-y divide-gray-200">
        {sortedChapters.map((chapter) => {
          const chapterKey = `${chapter.chapterNumber}-${chapter.chapterTitle}`;
          const isExpanded = expandedChapters.has(chapterKey);
          const allCompleted = chapter.videos.every(v => v.heyGenStatus === 'completed');
          const hasCompletedVideos = chapter.videos.some(v => v.heyGenStatus === 'completed' && v.videoUrl);
          const hasAudio = chapter.videos.some(v => v.audioUrl);
          
          // Check if any videos have been generated (have heyGenVideoId or are processing/completed/failed)
          // A video is only "generated" if it has been sent to HeyGen (has heyGenVideoId) or has a non-pending status
          // Placeholder videos (pending status with no heyGenVideoId) don't count as "generated"
          const hasGeneratedVideos = chapter.videos.some(v => 
            v.heyGenVideoId || 
            (v.heyGenStatus !== 'pending' && v.heyGenStatus !== null) ||
            v.heyGenStatus === 'processing' || 
            v.heyGenStatus === 'completed' || 
            v.heyGenStatus === 'failed'
          );

          return (
            <div key={chapterKey} className="bg-white">
              {/* Chapter Header - Always Visible */}
              <div 
                className={`px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${hasGeneratedVideos || onEditChapter ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  // If no videos generated, open edit modal
                  if (!hasGeneratedVideos && onEditChapter) {
                    e.stopPropagation();
                    const firstVideo = chapter.videos[0]; // Get first video (angle 1) for chapter data
                    onEditChapter({
                      chapterNumber: chapter.chapterNumber,
                      chapterTitle: chapter.chapterTitle,
                      script: firstVideo?.script || '',
                      audioUrl: firstVideo?.audioUrl || null,
                    });
                  } else if (hasGeneratedVideos) {
                    // If videos exist, toggle expansion
                    toggleChapter(chapterKey);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  {hasGeneratedVideos && (
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-black">
                      Chapter {chapter.chapterNumber}
                    </span>
                    <span className="text-sm text-black">
                      {chapter.chapterTitle}
                    </span>
                    {hasGeneratedVideos && (
                      <span className="text-xs text-gray-500">
                        ({chapter.videos.length} {chapter.videos.length === 1 ? 'video' : 'videos'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit button - opens ChapterCreator for this chapter */}
                  {onEditChapter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstVideo = chapter.videos[0]; // Get first video (angle 1) for chapter data
                        onEditChapter({
                          chapterNumber: chapter.chapterNumber,
                          chapterTitle: chapter.chapterTitle,
                          script: firstVideo?.script || '',
                          audioUrl: firstVideo?.audioUrl || null,
                        });
                      }}
                      className="text-xs text-black hover:text-gray-600 underline px-2 py-1"
                      title="Edit chapter and generate script/audio/video"
                    >
                      Edit
                    </button>
                  )}
                  {/* Delete button - deletes all videos for this chapter (including placeholders) */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Get all videos for this chapter (including placeholders that are filtered from display)
                      const allVideosForChapter = allVideosByChapter[chapterKey] || [];
                      const videoCount = allVideosForChapter.length;
                      
                      if (window.confirm(`Are you sure you want to delete Chapter ${chapter.chapterNumber}: "${chapter.chapterTitle}"? This will delete all ${videoCount} video${videoCount === 1 ? '' : 's'} for this chapter (including script and audio data).`)) {
                        try {
                          // Delete all videos for this chapter (including placeholders)
                          for (const video of allVideosForChapter) {
                            console.log('🗑️ Deleting video:', video.id);
                            await deleteVideo(video.id);
                          }
                          console.log('✅ All videos deleted for chapter');
                        } catch (error) {
                          console.error('❌ Error deleting videos:', error);
                          alert('Failed to delete some videos. Please try again.');
                        }
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-800 underline px-2 py-1"
                    title="Delete this chapter and all its videos (including script and audio data)"
                  >
                    Delete
                  </button>
                  {/* Download All button - always visible if has completed videos */}
                  {hasCompletedVideos && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAllVideos(chapter.videos);
                      }}
                      className="text-xs text-black hover:text-gray-600 underline px-2 py-1"
                      title="Download all videos and audio as a zip file"
                    >
                      ↓ Download All
                    </button>
                  )}
                </div>
              </div>

              {/* Chapter Content - Expandable (only if videos have been generated) */}
              {isExpanded && hasGeneratedVideos && (
                <div className="bg-gray-50 border-t border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-black uppercase tracking-wider">Angle</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-black uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-black uppercase tracking-wider">Created</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-black uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {chapter.videos.map((video) => {
                        return (
                          <tr key={video.id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-2 text-sm text-black">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-300 font-medium">
                                {video.angle || 1}
                              </span>
                            </td>
                            <td className="px-4 py-2">
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
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                {video.heyGenStatus === 'completed' && (
                                  <>
                                    {video.videoUrl && (
                                      <>
                                        <a
                                          href={video.videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-black hover:text-gray-600 text-xs underline"
                                        >
                                          View
                                        </a>
                                        <button
                                          onClick={() => handleDownloadVideo(video)}
                                          className="text-black hover:text-gray-600 text-xs underline"
                                          title="Download video"
                                        >
                                          ↓ Video
                                        </button>
                                      </>
                                    )}
                                    {video.audioUrl && (
                                      <button
                                        onClick={() => handleDownloadAudio(video)}
                                        className="text-black hover:text-gray-600 text-xs underline"
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
                                    className="text-black hover:text-gray-600 text-xs underline"
                                  >
                                    View
                                  </a>
                                )}
                                <button
                                  onClick={() => deleteVideo(video.id)}
                                  className="text-black hover:text-gray-600 text-xs underline"
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
