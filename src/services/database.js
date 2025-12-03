import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { storage } from '../utils/storage';

/**
 * Database service layer that uses Supabase when available,
 * falls back to localStorage otherwise
 */

// ==================== WORLDS ====================

export const dbWorlds = {
  /**
   * Get all worlds
   */
  async getAll() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('worlds')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching worlds from Supabase:', error);
          // Fallback to localStorage on error
          return storage.getWorlds();
        }
        
        // Transform Supabase data to match our format
        return data.map(world => ({
          id: world.id,
          name: world.name,
          author: world.author || '',
          elevenLabsVoiceId: world.eleven_labs_voice_id || '',
          heyGenAvatarId: world.hey_gen_avatar_id || '',
          heyGenImageKey: world.hey_gen_image_key || '', // Deprecated, kept for backward compatibility
          heyGenImageKey1: world.hey_gen_image_key_1 || '',
          heyGenImageKey2: world.hey_gen_image_key_2 || '',
          heyGenImageKey3: world.hey_gen_image_key_3 || '',
          systemPrompt: world.system_prompt || '',
          createdAt: world.created_at,
          updatedAt: world.updated_at,
        }));
      } catch (error) {
        console.error('Exception fetching worlds from Supabase:', error);
        return storage.getWorlds();
      }
    }
    
    // Fallback to localStorage
    return storage.getWorlds();
  },

  /**
   * Create a new world
   */
  async create(world) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('worlds')
          .insert({
            name: world.name,
            author: world.author || '',
            eleven_labs_voice_id: world.elevenLabsVoiceId || '',
            hey_gen_avatar_id: world.heyGenAvatarId || '',
            hey_gen_image_key: world.heyGenImageKey || '', // Deprecated, kept for backward compatibility
            hey_gen_image_key_1: world.heyGenImageKey1 || '',
            hey_gen_image_key_2: world.heyGenImageKey2 || '',
            hey_gen_image_key_3: world.heyGenImageKey3 || '',
            system_prompt: world.systemPrompt || '',
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating world in Supabase:', error);
          // Fallback to localStorage
          const worlds = storage.getWorlds();
          const newWorld = { ...world, id: `world-${Date.now()}` };
          storage.saveWorlds([...worlds, newWorld]);
          return newWorld;
        }
        
        // Transform response
        return {
          id: data.id,
          name: data.name,
          author: data.author || '',
          elevenLabsVoiceId: data.eleven_labs_voice_id || '',
          heyGenAvatarId: data.hey_gen_avatar_id || '',
          heyGenImageKey: data.hey_gen_image_key || '', // Deprecated, kept for backward compatibility
          heyGenImageKey1: data.hey_gen_image_key_1 || '',
          heyGenImageKey2: data.hey_gen_image_key_2 || '',
          heyGenImageKey3: data.hey_gen_image_key_3 || '',
          systemPrompt: data.system_prompt || '',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (error) {
        console.error('Exception creating world in Supabase:', error);
        // Fallback to localStorage
        const worlds = storage.getWorlds();
        const newWorld = { ...world, id: `world-${Date.now()}` };
        storage.saveWorlds([...worlds, newWorld]);
        return newWorld;
      }
    }
    
    // Fallback to localStorage
    const worlds = storage.getWorlds();
    const newWorld = { ...world, id: `world-${Date.now()}` };
    storage.saveWorlds([...worlds, newWorld]);
    return newWorld;
  },

  /**
   * Update a world
   */
  async update(id, updates) {
    if (isSupabaseConfigured()) {
      try {
        const updateData = {
          name: updates.name,
          author: updates.author,
          eleven_labs_voice_id: updates.elevenLabsVoiceId,
          hey_gen_avatar_id: updates.heyGenAvatarId,
          hey_gen_image_key: updates.heyGenImageKey, // Deprecated, kept for backward compatibility
          hey_gen_image_key_1: updates.heyGenImageKey1,
          hey_gen_image_key_2: updates.heyGenImageKey2,
          hey_gen_image_key_3: updates.heyGenImageKey3,
          system_prompt: updates.systemPrompt,
          updated_at: new Date().toISOString(),
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
          updateData[key] === undefined && delete updateData[key]
        );
        
        const { data, error } = await supabase
          .from('worlds')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating world in Supabase:', error);
          // Fallback to localStorage
          const worlds = storage.getWorlds();
          const updated = worlds.map(w => 
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          );
          storage.saveWorlds(updated);
          return updated.find(w => w.id === id);
        }
        
        // Transform response
        return {
          id: data.id,
          name: data.name,
          author: data.author || '',
          elevenLabsVoiceId: data.eleven_labs_voice_id || '',
          heyGenAvatarId: data.hey_gen_avatar_id || '',
          heyGenImageKey: data.hey_gen_image_key || '', // Deprecated, kept for backward compatibility
          heyGenImageKey1: data.hey_gen_image_key_1 || '',
          heyGenImageKey2: data.hey_gen_image_key_2 || '',
          heyGenImageKey3: data.hey_gen_image_key_3 || '',
          systemPrompt: data.system_prompt || '',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (error) {
        console.error('Exception updating world in Supabase:', error);
        // Fallback to localStorage
        const worlds = storage.getWorlds();
        const updated = worlds.map(w => 
          w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
        );
        storage.saveWorlds(updated);
        return updated.find(w => w.id === id);
      }
    }
    
    // Fallback to localStorage
    const worlds = storage.getWorlds();
    const updated = worlds.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
    );
    storage.saveWorlds(updated);
    return updated.find(w => w.id === id);
  },

  /**
   * Delete a world
   */
  async delete(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('worlds')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Error deleting world from Supabase:', error);
          // Fallback to localStorage
          const worlds = storage.getWorlds();
          storage.saveWorlds(worlds.filter(w => w.id !== id));
        }
      } catch (error) {
        console.error('Exception deleting world from Supabase:', error);
        // Fallback to localStorage
        const worlds = storage.getWorlds();
        storage.saveWorlds(worlds.filter(w => w.id !== id));
      }
    } else {
      // Fallback to localStorage
      const worlds = storage.getWorlds();
      storage.saveWorlds(worlds.filter(w => w.id !== id));
    }
  },
};

// ==================== VIDEOS ====================

export const dbVideos = {
  /**
   * Get all videos
   */
  async getAll() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching videos from Supabase:', error);
          return storage.getVideos();
        }
        
        // Transform Supabase data to match our format
        return data.map(video => ({
          id: video.id,
          worldId: video.world_id,
          chapterTitle: video.chapter_title,
          chapterNumber: video.chapter_number,
          angle: video.angle || 1, // Default to 1 if not set
          script: video.script || '',
          audioUrl: video.audio_url,
          heyGenVideoId: video.hey_gen_video_id,
          heyGenStatus: video.hey_gen_status || 'pending',
          avatarId: video.avatar_id || '',
          videoUrl: video.video_url,
          createdAt: video.created_at,
          updatedAt: video.updated_at,
        }));
      } catch (error) {
        console.error('Exception fetching videos from Supabase:', error);
        return storage.getVideos();
      }
    }
    
    return storage.getVideos();
  },

  /**
   * Get videos by world ID
   */
  async getByWorldId(worldId) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('world_id', worldId)
          .order('chapter_number', { ascending: true });
        
        if (error) {
          console.error('Error fetching videos by world from Supabase:', error);
          return storage.getVideosByWorldId(worldId);
        }
        
        return data.map(video => ({
          id: video.id,
          worldId: video.world_id,
          chapterTitle: video.chapter_title,
          chapterNumber: video.chapter_number,
          angle: video.angle || 1, // Default to 1 if not set
          script: video.script || '',
          audioUrl: video.audio_url,
          heyGenVideoId: video.hey_gen_video_id,
          heyGenStatus: video.hey_gen_status || 'pending',
          avatarId: video.avatar_id || '',
          videoUrl: video.video_url,
          createdAt: video.created_at,
          updatedAt: video.updated_at,
        }));
      } catch (error) {
        console.error('Exception fetching videos by world from Supabase:', error);
        return storage.getVideosByWorldId(worldId);
      }
    }
    
    return storage.getVideosByWorldId(worldId);
  },

  /**
   * Create a new video
   */
  async create(video) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .insert({
            world_id: video.worldId,
            chapter_title: video.chapterTitle,
            chapter_number: video.chapterNumber,
            angle: video.angle || 1, // Default to 1 if not set
            script: video.script || '',
            audio_url: video.audioUrl,
            hey_gen_video_id: video.heyGenVideoId,
            hey_gen_status: video.heyGenStatus || 'pending',
            avatar_id: video.avatarId || '',
            video_url: video.videoUrl,
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating video in Supabase:', error);
          // Fallback to localStorage
          const videos = storage.getVideos();
          const newVideo = { ...video, id: `video-${Date.now()}` };
          storage.saveVideos([...videos, newVideo]);
          return newVideo;
        }
        
        // Transform response
        return {
          id: data.id,
          worldId: data.world_id,
          chapterTitle: data.chapter_title,
          chapterNumber: data.chapter_number,
          script: data.script || '',
          audioUrl: data.audio_url,
          heyGenVideoId: data.hey_gen_video_id,
          heyGenStatus: data.hey_gen_status || 'pending',
          avatarId: data.avatar_id || '',
          videoUrl: data.video_url,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (error) {
        console.error('Exception creating video in Supabase:', error);
        // Fallback to localStorage
        const videos = storage.getVideos();
        const newVideo = { ...video, id: `video-${Date.now()}` };
        storage.saveVideos([...videos, newVideo]);
        return newVideo;
      }
    }
    
    // Fallback to localStorage
    const videos = storage.getVideos();
    const newVideo = { ...video, id: `video-${Date.now()}` };
    storage.saveVideos([...videos, newVideo]);
    return newVideo;
  },

  /**
   * Update a video
   */
  async update(id, updates) {
    // Check if ID is a UUID (Supabase format) or a fallback ID (timestamp format)
    // UUIDs are in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isSupabaseConfigured() && isUUID) {
      try {
        const updateData = {
          chapter_title: updates.chapterTitle,
          chapter_number: updates.chapterNumber,
          angle: updates.angle,
          script: updates.script,
          audio_url: updates.audioUrl,
          hey_gen_video_id: updates.heyGenVideoId,
          hey_gen_status: updates.heyGenStatus,
          avatar_id: updates.avatarId,
          video_url: updates.videoUrl,
          updated_at: new Date().toISOString(),
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
          updateData[key] === undefined && delete updateData[key]
        );
        
        const { data, error } = await supabase
          .from('videos')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating video in Supabase:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          // Fallback to localStorage
          const videos = storage.getVideos();
          const existingVideo = videos.find(v => v.id === id);
          if (!existingVideo) {
            console.warn('⚠️ Video not found in localStorage for update:', id);
            // Return a basic updated object based on the updates provided
            return {
              id,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }
          const updated = videos.map(v => 
            v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
          );
          storage.saveVideos(updated);
          const result = updated.find(v => v.id === id);
          return result || { id, ...updates, updatedAt: new Date().toISOString() };
        }
        
        // Transform response
        return {
          id: data.id,
          worldId: data.world_id,
          chapterTitle: data.chapter_title,
          chapterNumber: data.chapter_number,
          angle: data.angle || 1, // Default to 1 if not set
          script: data.script || '',
          audioUrl: data.audio_url,
          heyGenVideoId: data.hey_gen_video_id,
          heyGenStatus: data.hey_gen_status || 'pending',
          avatarId: data.avatar_id || '',
          videoUrl: data.video_url,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (error) {
        console.error('Exception updating video in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }
    
    // Fallback to localStorage if not a UUID or Supabase not configured or failed
    try {
      const videos = storage.getVideos();
      const existingVideo = videos.find(v => v.id === id);
      if (!existingVideo) {
        console.warn('⚠️ Video not found in localStorage for update:', id);
        return {
          id,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      const updated = videos.map(v => 
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      );
      storage.saveVideos(updated);
      const result = updated.find(v => v.id === id);
      return result || { id, ...updates, updatedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Exception in localStorage fallback:', error);
      // Return a minimal object to prevent undefined errors
      return { id, ...updates, updatedAt: new Date().toISOString() };
    }
    const videos = storage.getVideos();
    const updated = videos.map(v => 
      v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    );
    storage.saveVideos(updated);
    return updated.find(v => v.id === id);
  },

  /**
   * Delete a video
   */
  async delete(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Error deleting video from Supabase:', error);
          // Fallback to localStorage
          const videos = storage.getVideos();
          storage.saveVideos(videos.filter(v => v.id !== id));
        }
      } catch (error) {
        console.error('Exception deleting video from Supabase:', error);
        // Fallback to localStorage
        const videos = storage.getVideos();
        storage.saveVideos(videos.filter(v => v.id !== id));
      }
    } else {
      // Fallback to localStorage
      const videos = storage.getVideos();
      storage.saveVideos(videos.filter(v => v.id !== id));
    }
  },
};

