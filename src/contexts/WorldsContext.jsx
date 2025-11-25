import { createContext, useContext, useState, useEffect } from 'react';
import { dbWorlds } from '../services/database';

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
  const [isLoading, setIsLoading] = useState(true);

  // Load worlds from database on mount
  useEffect(() => {
    const loadWorlds = async () => {
      try {
        setIsLoading(true);
        const loadedWorlds = await dbWorlds.getAll();
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
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWorlds();
  }, []);

  const createWorld = async (name, author, elevenLabsVoiceId, heyGenAvatarId, systemPrompt) => {
    const newWorld = {
      name,
      author: author || '',
      elevenLabsVoiceId: elevenLabsVoiceId || '',
      heyGenAvatarId: heyGenAvatarId || '',
      systemPrompt: systemPrompt || '',
    };
    
    try {
      const created = await dbWorlds.create(newWorld);
      setWorlds(prev => [...prev, created]);
      setSelectedWorldId(created.id);
      return created;
    } catch (error) {
      console.error('Error creating world:', error);
      // Fallback: create with timestamp ID
      const fallbackWorld = {
        ...newWorld,
        id: `world-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWorlds(prev => [...prev, fallbackWorld]);
      setSelectedWorldId(fallbackWorld.id);
      return fallbackWorld;
    }
  };

  const updateWorld = async (id, updates) => {
    try {
      const updated = await dbWorlds.update(id, updates);
      setWorlds(prev => prev.map(world => 
        world.id === id ? updated : world
      ));
      return updated;
    } catch (error) {
      console.error('Error updating world:', error);
      // Fallback: update locally
      setWorlds(prev => prev.map(world => 
        world.id === id 
          ? { ...world, ...updates, updatedAt: new Date().toISOString() }
          : world
      ));
    }
  };

  const deleteWorld = async (id) => {
    try {
      await dbWorlds.delete(id);
      setWorlds(prev => {
        const remaining = prev.filter(world => world.id !== id);
        if (selectedWorldId === id) {
          setSelectedWorldId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
    } catch (error) {
      console.error('Error deleting world:', error);
      // Fallback: delete locally
      setWorlds(prev => {
        const remaining = prev.filter(world => world.id !== id);
        if (selectedWorldId === id) {
          setSelectedWorldId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
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
        isLoading,
      }}
    >
      {children}
    </WorldsContext.Provider>
  );
};

