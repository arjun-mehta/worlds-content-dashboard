// ElevenLabs service for audio generation

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

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
        model_id: 'eleven_monolingual_v1',
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

