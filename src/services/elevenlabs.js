// ElevenLabs service for audio generation
// Using V3 model (eleven_v3) - most advanced speech synthesis model
// Note: V3 is in public alpha - not optimized for real-time, may require more prompt engineering

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Model selection - can be overridden via environment variable
// Options: 'eleven_v3' (alpha, best quality), 'eleven_multilingual_v2' (stable, recommended for production)
const ELEVENLABS_MODEL = import.meta.env.VITE_ELEVENLABS_MODEL || 'eleven_v3';

export const generateAudio = async (text, voiceId) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is not set. Please add VITE_ELEVENLABS_API_KEY to your .env file.');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required for audio generation.');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: ELEVENLABS_MODEL, // Using V3 by default (can be changed via VITE_ELEVENLABS_MODEL env var)
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail?.message || `Failed to generate audio: ${response.statusText}`);
    }

    // Convert the audio blob to a data URL for storage
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return {
      audioUrl,
      audioBlob, // Keep blob for potential download
    };
  } catch (error) {
    console.error('Error generating audio:', error);
    if (error.message.includes('API key')) {
      throw error;
    }
    throw new Error('Failed to generate audio. Please check your ElevenLabs API key and voice ID.');
  }
};

