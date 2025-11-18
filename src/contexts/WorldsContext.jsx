import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

const WorldsContext = createContext();

export const useWorlds = () => {
  const context = useContext(WorldsContext);
  if (!context) {
    throw new Error('useWorlds must be used within a WorldsProvider');
  }
  return context;
};

export const WorldsProvider = ({ children }) => {
  const [worlds, setWorlds] = useState([]);
  const [selectedWorldId, setSelectedWorldId] = useState(null);

  // Load worlds from localStorage on mount
  useEffect(() => {
    try {
      const loadedWorlds = storage.getWorlds();
      if (Array.isArray(loadedWorlds)) {
        setWorlds(loadedWorlds);
        
        // Select first world if available
        if (loadedWorlds.length > 0) {
          setSelectedWorldId(prev => prev || loadedWorlds[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading worlds:', error);
      setWorlds([]);
    }
  }, []);

  // Save to localStorage whenever worlds change
  useEffect(() => {
    if (worlds.length > 0) {
      storage.saveWorlds(worlds);
    }
  }, [worlds]);

  const createWorld = (name, author, elevenLabsVoiceId, heyGenAvatarId, systemPrompt) => {
    const newWorld = {
      id: `world-${Date.now()}`,
      name,
      author: author || '',
      elevenLabsVoiceId: elevenLabsVoiceId || '',
      heyGenAvatarId: heyGenAvatarId || '',
      systemPrompt: systemPrompt || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setWorlds([...worlds, newWorld]);
    setSelectedWorldId(newWorld.id);
    return newWorld;
  };

  const updateWorld = (id, updates) => {
    setWorlds(worlds.map(world => 
      world.id === id 
        ? { ...world, ...updates, updatedAt: new Date().toISOString() }
        : world
    ));
  };

  const deleteWorld = (id) => {
    setWorlds(worlds.filter(world => world.id !== id));
    if (selectedWorldId === id) {
      setSelectedWorldId(worlds.length > 1 ? worlds.find(w => w.id !== id)?.id || null : null);
    }
  };

  const selectedWorld = worlds.find(w => w.id === selectedWorldId);

  return (
    <WorldsContext.Provider
      value={{
        worlds,
        selectedWorld,
        selectedWorldId,
        setSelectedWorldId,
        createWorld,
        updateWorld,
        deleteWorld,
      }}
    >
      {children}
    </WorldsContext.Provider>
  );
};

