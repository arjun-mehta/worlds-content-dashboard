// HeyGen service for video generation
// Uses backend server to avoid CORS issues
import { API_URL } from '../config';

// Normalize HeyGen status to match database constraint
// Database allows: 'pending', 'processing', 'completed', 'failed'
const normalizeStatus = (status) => {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase();
  
  // Map HeyGen statuses to our database values
  if (normalized === 'waiting' || normalized === 'pending') {
    return 'pending';
  }
  if (normalized === 'processing' || normalized === 'generating') {
    return 'processing';
  }
  if (normalized === 'completed' || normalized === 'done' || normalized === 'success') {
    return 'completed';
  }
  if (normalized === 'failed' || normalized === 'error' || normalized === 'cancelled') {
    return 'failed';
  }
  
  // Default to pending for unknown statuses
  console.warn('⚠️ Unknown HeyGen status:', status, '- mapping to pending');
  return 'pending';
};

// Upload audio to HeyGen via backend server (avoids CORS)
const uploadAudioAsset = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.mp3');

    console.log('Sending audio to backend, size:', audioBlob.size);
    const response = await fetch(`${API_URL}/api/heygen/upload-audio`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    console.log('Backend response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || 'Failed to upload audio');
    }

    const data = await response.json();
    console.log('Backend success, audio_url:', data.audio_url);
    return data.audio_url; // Return URL instead of asset_id
  } catch (error) {
    console.error('Error uploading audio asset:', error);
    throw new Error(error.message || 'Failed to upload audio file to HeyGen.');
  }
};

// Generate video using HeyGen Avatar IV API
// Docs: https://docs.heygen.com/docs/create-avatar-iv-videos
export const generateVideo = async (audioBlob, imageKey, script, videoTitle = 'Generated Video', customMotionPrompt = null) => {
  if (!imageKey) {
    throw new Error('Image key is required for video generation.');
  }

  if (!script) {
    throw new Error('Script is required for video generation.');
  }

  try {
    // Step 1: Upload audio to get public URL via backend server
    const audioUrl = await uploadAudioAsset(audioBlob);

    // Step 2: Generate Avatar IV video via backend server
    // Avatar IV API requires: image_key, script, and audio_url (or voice_id)
    const requestBody = {
      image_key: imageKey,
      video_title: videoTitle,
      script: script,
      audio_url: audioUrl,
    };
    
    // Optional: Add custom motion prompt for gestures
    if (customMotionPrompt) {
      requestBody.custom_motion_prompt = customMotionPrompt;
    }
    
    const response = await fetch(`${API_URL}/api/heygen/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate video: ${response.statusText}`);
    }

    const data = await response.json();
    const rawStatus = data.status || 'processing';
    const normalizedStatus = normalizeStatus(rawStatus);
    
    return {
      videoId: data.video_id,
      status: normalizedStatus,
      audioUrl: audioUrl, // Return the Supabase audio URL so it can be saved to DB
    };
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error(error.message || 'Failed to generate video. Please check your backend server is running.');
  }
};

// Check video status and get video URL
export const checkVideoStatus = async (videoId) => {
  try {
    const response = await fetch(`${API_URL}/api/heygen/video-status/${videoId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to check video status: ${response.statusText}`);
    }

    const data = await response.json();
    const rawStatus = data.status;
    const normalizedStatus = normalizeStatus(rawStatus);
    
    return {
      status: normalizedStatus,
      videoUrl: data.video_url || null,
    };
  } catch (error) {
    console.error('Error checking video status:', error);
    throw new Error(error.message || 'Failed to check video status.');
  }
};

