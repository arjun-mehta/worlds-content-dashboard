import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

const VideosContext = createContext();

export const useVideos = () => {
  const context = useContext(VideosContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideosProvider');
  }
  return context;
};

export const VideosProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);

  // Load videos from localStorage on mount
  useEffect(() => {
    try {
      const loadedVideos = storage.getVideos();
      if (Array.isArray(loadedVideos)) {
        setVideos(loadedVideos);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setVideos([]);
    }
  }, []);

  // Save to localStorage whenever videos change (skip initial empty array)
  useEffect(() => {
    // Only save if we've loaded initial data (prevents saving empty array on mount)
    if (videos.length > 0 || localStorage.getItem('worlds-content-dashboard-videos')) {
      storage.saveVideos(videos);
    }
  }, [videos]);

  const createVideo = (worldId, chapterTitle, script, avatarId) => {
    const videosForWorld = videos.filter(v => v.worldId === worldId);
    const chapterNumber = videosForWorld.length + 1;
    
    const newVideo = {
      id: `video-${Date.now()}`,
      worldId,
      chapterTitle,
      chapterNumber,
      script,
      audioUrl: null,
      heyGenVideoId: null,
      heyGenStatus: 'pending',
      avatarId,
      videoUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setVideos([...videos, newVideo]);
    return newVideo;
  };

  const updateVideo = (id, updates) => {
    setVideos(videos.map(video =>
      video.id === id
        ? { ...video, ...updates, updatedAt: new Date().toISOString() }
        : video
    ));
  };

  const deleteVideo = (id) => {
    setVideos(videos.filter(video => video.id !== id));
  };

  const getVideosByWorldId = (worldId) => {
    return videos.filter(video => video.worldId === worldId);
  };

  return (
    <VideosContext.Provider
      value={{
        videos,
        createVideo,
        updateVideo,
        deleteVideo,
        getVideosByWorldId,
      }}
    >
      {children}
    </VideosContext.Provider>
  );
};

