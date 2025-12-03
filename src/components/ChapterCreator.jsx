import { useState } from 'react';
import { useVideos } from '../contexts/VideosContext';
import { generateScript } from '../services/openai';
import { generateAudio } from '../services/elevenlabs';
import { generateVideo } from '../services/heygen';

export default function ChapterCreator({ world, onClose }) {
  const { createVideo, updateVideo, pollVideoStatus, getVideosByWorldId } = useVideos();
  const existingVideos = getVideosByWorldId(world.id);
  const maxChapterNumber = existingVideos.length > 0 
    ? Math.max(...existingVideos.map(v => v.chapterNumber || 0))
    : 0;
  const suggestedChapterNumber = maxChapterNumber + 1;
  
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState(suggestedChapterNumber.toString());
  const [avatarId, setAvatarId] = useState(''); // Deprecated: kept for backward compatibility but not used (Avatar IV uses image_key)
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'script' | 'generating-audio' | 'audio' | 'generating-video' | 'complete'
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const handleGenerateScript = async () => {
    if (!chapterTitle.trim()) {
      setError('Please enter a chapter title');
      return;
    }

    if (!chapterNumber || isNaN(parseInt(chapterNumber)) || parseInt(chapterNumber) < 1) {
      setError('Please enter a valid chapter number (must be 1 or greater)');
      return;
    }

    if (!world.systemPrompt?.trim()) {
      setError('Please set a system prompt for this world first');
      return;
    }

    setIsGeneratingScript(true);
    setError(null);
    setStep('generating');

    try {
      const generatedScript = await generateScript(
        world.systemPrompt,
        chapterTitle,
        parseInt(chapterNumber),
        world.name
      );
      setScript(generatedScript);
      setStep('script');
    } catch (err) {
      setError(err.message || 'Failed to generate script');
      setStep('input');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!world.elevenLabsVoiceId?.trim()) {
      setError('Please set an ElevenLabs Voice ID for this world first');
      return;
    }

    setIsGeneratingAudio(true);
    setError(null);
    setStep('generating-audio');

    try {
      const audioResponse = await generateAudio(script, world.elevenLabsVoiceId);
      setAudioUrl(audioResponse.audioUrl);
      setAudioBlob(audioResponse.audioBlob);
      setStep('audio');
    } catch (err) {
      setError(err.message || 'Failed to generate audio');
      setStep('script');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateVideo = async () => {
    // Check if we have at least one image key (Avatar IV requires image_key, not avatar_id)
    const imageKeys = [
      world.heyGenImageKey1 || world.heyGenImageKey || '',
      world.heyGenImageKey2 || world.heyGenImageKey || '',
      world.heyGenImageKey3 || world.heyGenImageKey || '',
    ];
    
    const hasAtLeastOneImage = imageKeys.some(key => key && key.trim());
    if (!hasAtLeastOneImage) {
      setError('Please upload at least one author image in World Details or provide an image key');
      return;
    }

    if (!audioBlob) {
      setError('Audio is required to generate video. Please generate audio first.');
      return;
    }

    setIsGeneratingVideo(true);
    setError(null);
    setStep('generating-video');

    try {
      // Generate 3 Avatar IV videos (one for each angle)
      const videos = [];
      let sharedAudioUrl = null; // Will be set from the first response
      
      for (let angle = 1; angle <= 3; angle++) {
        const imageKey = imageKeys[angle - 1];
        if (!imageKey || !imageKey.trim()) {
          console.warn(`⚠️ Skipping angle ${angle} - no image key available`);
          continue;
        }
        
        console.log(`🎬 Generating video for angle ${angle} with image key:`, imageKey);
        const heyGenResponse = await generateVideo(audioBlob, imageKey, script, `${chapterTitle} - Angle ${angle}`);
        console.log(`✅ HeyGen response for angle ${angle}:`, heyGenResponse);
        
        // Use audio URL from first response for all videos
        if (angle === 1) {
          sharedAudioUrl = heyGenResponse.audioUrl;
        }
        const finalAudioUrl = sharedAudioUrl || heyGenResponse.audioUrl;
        
        // Create video record with the Supabase audio URL from HeyGen response
        const video = await createVideo(
          world.id, 
          chapterTitle, 
          parseInt(chapterNumber),
          script, 
          avatarId, 
          finalAudioUrl, // Pass Supabase URL directly to createVideo
          angle // Specify which angle this video represents
        );
        console.log(`✅ Video ${angle} created with Supabase audio URL:`, video);
        
        // Update video with HeyGen info
        await updateVideo(video.id, {
          heyGenVideoId: heyGenResponse.videoId,
          heyGenStatus: heyGenResponse.status,
        });
        console.log(`✅ Video ${angle} updated with HeyGen info`);

        // Start polling for video status if it's processing
        if (heyGenResponse.status === 'processing' && heyGenResponse.videoId) {
          console.log(`🔄 Starting to poll for video ${angle} status...`);
          pollVideoStatus(video.id, heyGenResponse.videoId);
        }
        
        videos.push(video);
      }
      
      if (videos.length === 0) {
        throw new Error('No videos were created. Please ensure at least one author image is uploaded.');
      }

      setStep('complete');
      console.log(`✅ Step set to complete - ${videos.length} videos should be visible in dashboard`);
      
      // Auto-close modal after 2 seconds so user can see the videos in the dashboard
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to generate video');
      setStep('audio');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleClose = () => {
    setChapterTitle('');
    setChapterNumber('');
    setScript('');
    setAudioUrl(null);
    setAudioBlob(null);
    // avatarId is deprecated - Avatar IV uses image_key instead
    setStep('input');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded border border-gray-300 max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Create New Chapter</h2>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-black text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-400 rounded text-black">
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Chapter Number
                </label>
                <input
                  type="number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder={`Suggested: ${suggestedChapterNumber}`}
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                />
                {suggestedChapterNumber > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {suggestedChapterNumber} (next available)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g., Introduction to Quantum Physics"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateScript}
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Generate Script
                </button>
                <button
                  onClick={handleClose}
                  className="bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Generating Script */}
          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Generating script...</p>
            </div>
          )}

          {/* Step 2: Review Script */}
          {step === 'script' && (
            <div className="grid grid-cols-2 gap-6 min-h-[70vh]">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-black mb-2">
                  Generated Script
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="flex-1 w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div className="flex flex-col justify-end space-y-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio}
                    className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                  </button>
                  <button
                    onClick={() => setStep('input')}
                    className="w-full bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generating Audio */}
          {step === 'generating-audio' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Generating audio...</p>
            </div>
          )}

          {/* Step 3: Audio Ready */}
          {step === 'audio' && (
            <div className="grid grid-cols-2 gap-6 min-h-[70vh]">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-black mb-2">
                  Generated Script
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="flex-1 w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
                  readOnly
                />
              </div>
              <div className="flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Generated Audio
                  </label>
                  {audioUrl && (
                    <audio controls className="w-full mb-2">
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Videos will use the 3 author images uploaded in World Details. Make sure all 3 angles are uploaded before generating videos.
                  </p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo}
                    className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    {isGeneratingVideo ? 'Generating...' : 'Generate Video'}
                  </button>
                  <button
                    onClick={() => setStep('script')}
                    className="w-full bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generating Video */}
          {step === 'generating-video' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Generating video...</p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="text-black text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-black mb-2">Video Generation Started!</h3>
              <p className="text-gray-600 mb-6">
                Your video is being generated. Check back later to see the completed video.
              </p>
              <button
                onClick={handleClose}
                className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

