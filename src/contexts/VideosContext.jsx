import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbVideos } from '../services/database';

const VideosContext = createContext();

// Polling intervals storage (to allow cleanup)
const pollingIntervals = new Map();

export const useVideos = () => {
  const context = useContext(VideosContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideosProvider');
  }
  return context;
};

export const VideosProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Poll for video status until it's completed or failed
  const pollVideoStatus = async (videoId, heyGenVideoId, updateVideoFn) => {
    const maxAttempts = 240; // Poll for up to 20 minutes (240 * 5 seconds)
    let attempts = 0;
    let pollInterval = null;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.warn('⚠️ Polling stopped: max attempts reached for video', videoId);
        updateVideoFn(videoId, { heyGenStatus: 'failed' });
        if (pollInterval) clearTimeout(pollInterval);
        pollingIntervals.delete(videoId);
        return;
      }

      attempts++;
      console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} for video ${heyGenVideoId}`);

      try {
        const { checkVideoStatus } = await import('../services/heygen');
        const statusResponse = await checkVideoStatus(heyGenVideoId);
        console.log('📹 Status check result:', {
          videoId,
          heyGenVideoId,
          status: statusResponse.status,
          videoUrl: statusResponse.videoUrl,
        });
        
        await updateVideoFn(videoId, {
          heyGenStatus: statusResponse.status,
          videoUrl: statusResponse.videoUrl || null,
        });
        console.log('✅ Video updated in database');

        // Check if we should continue polling
        // Status is already normalized by checkVideoStatus, so we can check directly
        const isFinalStatus = statusResponse.status === 'completed' || statusResponse.status === 'failed';
        
        if (isFinalStatus) {
          // If completed or failed, stop polling
          console.log('✅ Video status final:', statusResponse.status, 'videoUrl:', statusResponse.videoUrl);
          if (statusResponse.status === 'completed') {
            console.log('🎉 Video completed! URL:', statusResponse.videoUrl);
          }
          if (pollInterval) clearTimeout(pollInterval);
          pollingIntervals.delete(videoId);
        } else {
          // If still processing/pending, poll again after 5 seconds
          console.log(`⏳ Video still ${statusResponse.status}, will check again in 5 seconds...`);
          pollInterval = setTimeout(poll, 5000);
          pollingIntervals.set(videoId, pollInterval);
        }
      } catch (error) {
        console.error('❌ Error polling video status:', error);
        // Continue polling on error (might be temporary network issue)
        if (attempts < maxAttempts) {
          console.log(`🔄 Retrying in 5 seconds... (attempt ${attempts}/${maxAttempts})`);
          pollInterval = setTimeout(poll, 5000);
          pollingIntervals.set(videoId, pollInterval);
        } else {
          console.error('❌ Max polling attempts reached, marking as failed');
          updateVideoFn(videoId, { heyGenStatus: 'failed' });
          if (pollInterval) clearTimeout(pollInterval);
          pollingIntervals.delete(videoId);
        }
      }
    };

    // Start polling after a short delay
    console.log('🚀 Starting to poll for video status:', { videoId, heyGenVideoId });
    pollInterval = setTimeout(poll, 2000);
    pollingIntervals.set(videoId, pollInterval);
  };

  // Resume polling for videos that are still processing
  const resumePollingForProcessingVideos = (videosList, updateVideoFn) => {
    videosList.forEach(video => {
      // Resume polling for videos that are processing/pending and have a heyGenVideoId
      if (
        (video.heyGenStatus === 'processing' || video.heyGenStatus === 'pending') &&
        video.heyGenVideoId &&
        !pollingIntervals.has(video.id)
      ) {
        console.log('🔄 Resuming polling for video:', video.id, 'heyGenVideoId:', video.heyGenVideoId);
        pollVideoStatus(video.id, video.heyGenVideoId, updateVideoFn);
      }
    });
  };

  // Load videos from database on mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoading(true);
        const loadedVideos = await dbVideos.getAll();
        if (Array.isArray(loadedVideos)) {
          setVideos(loadedVideos);
          
          // Resume polling for any videos that are still processing
          resumePollingForProcessingVideos(loadedVideos, updateVideo);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVideos();
    
    // Cleanup polling intervals on unmount
    return () => {
      pollingIntervals.forEach((interval, videoId) => {
        clearTimeout(interval);
        pollingIntervals.delete(videoId);
      });
    };
  }, []);

  const createVideo = async (worldId, chapterTitle, chapterNumber, script, avatarId, audioUrl = null, angle = 1) => {
    const newVideo = {
      worldId,
      chapterTitle,
      chapterNumber: chapterNumber || 1, // Use provided chapter number, default to 1
      angle: angle || 1, // Which angle (1, 2, or 3) this video represents
      script,
      audioUrl: audioUrl || null, // Include audio URL if provided (Supabase URL)
      heyGenVideoId: null,
      heyGenStatus: 'pending',
      avatarId,
      videoUrl: null,
    };
    
    try {
      const created = await dbVideos.create(newVideo);
      setVideos(prev => [...prev, created]);
      return created;
    } catch (error) {
      console.error('Error creating video:', error);
      // Fallback: create with timestamp ID
      const fallbackVideo = {
        ...newVideo,
        id: `video-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVideos(prev => [...prev, fallbackVideo]);
      return fallbackVideo;
    }
  };

  const updateVideo = async (id, updates) => {
    console.log('🔄 updateVideo called for:', id, 'updates:', updates);
    try {
      const updated = await dbVideos.update(id, updates);
      
      // If update returned undefined or null, fall back to local update
      if (!updated) {
        console.warn('⚠️ Database update returned no data, falling back to local update');
        setVideos(prevVideos => {
          const existingVideo = prevVideos.find(v => v.id === id);
          if (!existingVideo) {
            console.error('❌ Video not found for update:', id);
            return prevVideos;
          }
          const updatedVideo = { ...existingVideo, ...updates, updatedAt: new Date().toISOString() };
          return prevVideos.map(video => video.id === id ? updatedVideo : video);
        });
        return;
      }
      
      setVideos(prevVideos => {
        const existingVideo = prevVideos.find(v => v.id === id);
        if (!existingVideo) {
          console.warn('⚠️ Video not in local state, adding it:', updated);
          return [...prevVideos, updated];
        }
        const newVideos = prevVideos.map(video =>
          video.id === id ? updated : video
        );
        console.log('📝 Updated videos array, found video:', newVideos.find(v => v.id === id));
        return newVideos;
      });
    } catch (error) {
      console.error('Error updating video:', error);
      // Fallback: update locally
      setVideos(prevVideos => {
        const existingVideo = prevVideos.find(v => v.id === id);
        if (!existingVideo) {
          console.error('❌ Video not found for update (fallback):', id);
          return prevVideos;
        }
        const updated = prevVideos.map(video =>
          video.id === id
            ? { ...video, ...updates, updatedAt: new Date().toISOString() }
            : video
        );
        console.log('📝 Updated videos array (fallback), found video:', updated.find(v => v.id === id));
        return updated;
      });
    }
  };

  const deleteVideo = async (id) => {
    try {
      await dbVideos.delete(id);
      setVideos(prev => prev.filter(video => video.id !== id));
    } catch (error) {
      console.error('Error deleting video:', error);
      // Fallback: delete locally
      setVideos(prev => prev.filter(video => video.id !== id));
    }
  };

  const getVideosByWorldId = (worldId) => {
    return videos.filter(video => video.worldId === worldId);
  };

  const refreshVideoStatus = async (videoId, heyGenVideoId) => {
    if (!heyGenVideoId) {
      console.warn('No HeyGen video ID provided for refresh');
      return;
    }

    try {
      const { checkVideoStatus } = await import('../services/heygen');
      const statusResponse = await checkVideoStatus(heyGenVideoId);
      console.log('🔄 Manual refresh - Status:', statusResponse.status, 'URL:', statusResponse.videoUrl);
      
      await updateVideo(videoId, {
        heyGenStatus: statusResponse.status,
        videoUrl: statusResponse.videoUrl || null,
      });
      
      return statusResponse;
    } catch (error) {
      console.error('Error refreshing video status:', error);
      throw error;
    }
  };

  return (
    <VideosContext.Provider
      value={{
        videos,
        createVideo,
        updateVideo,
        deleteVideo,
        getVideosByWorldId,
        refreshVideoStatus,
        pollVideoStatus: (videoId, heyGenVideoId) => pollVideoStatus(videoId, heyGenVideoId, updateVideo),
        isLoading,
      }}
    >
      {children}
    </VideosContext.Provider>
  );
};

