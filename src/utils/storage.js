// LocalStorage utilities

const STORAGE_KEYS = {
  WORLDS: 'worlds-content-dashboard-worlds',
  VIDEOS: 'worlds-content-dashboard-videos',
};

export const storage = {
  // Worlds
  getWorlds: () => {
    const data = localStorage.getItem(STORAGE_KEYS.WORLDS);
    return data ? JSON.parse(data) : [];
  },
  
  saveWorlds: (worlds) => {
    localStorage.setItem(STORAGE_KEYS.WORLDS, JSON.stringify(worlds));
  },
  
  // Videos
  getVideos: () => {
    const data = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    return data ? JSON.parse(data) : [];
  },
  
  saveVideos: (videos) => {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
  },
  
  // Helper to get videos for a specific world
  getVideosByWorldId: (worldId) => {
    const videos = storage.getVideos();
    return videos.filter(video => video.worldId === worldId);
  },
};

