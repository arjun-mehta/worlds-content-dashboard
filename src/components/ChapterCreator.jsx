import { useState } from 'react';
import { useVideos } from '../contexts/VideosContext';
import { generateScript } from '../services/openai';
import { generateAudio } from '../services/elevenlabs';
import { generateVideo } from '../services/heygen';

export default function ChapterCreator({ world, onClose }) {
  const { createVideo, updateVideo } = useVideos();
  const [chapterTitle, setChapterTitle] = useState('');
  const [avatarId, setAvatarId] = useState(world.heyGenAvatarId || '');
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'script' | 'generating-audio' | 'audio' | 'generating-video' | 'complete'
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const handleGenerateScript = async () => {
    if (!chapterTitle.trim()) {
      setError('Please enter a chapter title');
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
      setStep('audio');
    } catch (err) {
      setError(err.message || 'Failed to generate audio');
      setStep('script');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!avatarId.trim()) {
      setError('Please enter an avatar ID');
      return;
    }

    setIsGeneratingVideo(true);
    setError(null);
    setStep('generating-video');

    try {
      // Create video record
      const video = createVideo(world.id, chapterTitle, script, avatarId);
      
      // Update video with audio URL if available
      if (audioUrl) {
        updateVideo(video.id, { audioUrl });
      }
      
      // Generate video via HeyGen
      const heyGenResponse = await generateVideo(script, avatarId);
      
      // Update video with HeyGen info
      updateVideo(video.id, {
        heyGenVideoId: heyGenResponse.videoId,
        heyGenStatus: heyGenResponse.status,
      });

      setStep('complete');
    } catch (err) {
      setError(err.message || 'Failed to generate video');
      setStep('audio');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleClose = () => {
    setChapterTitle('');
    setScript('');
    setAudioUrl(null);
    setAvatarId(world.heyGenAvatarId || '');
    setStep('input');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Chapter</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g., Introduction to Quantum Physics"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateScript}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Generate Script
                </button>
                <button
                  onClick={handleClose}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Generating Script */}
          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating script...</p>
            </div>
          )}

          {/* Step 2: Review Script */}
          {step === 'script' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Script
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                </button>
                <button
                  onClick={() => setStep('input')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Generating Audio */}
          {step === 'generating-audio' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating audio...</p>
            </div>
          )}

          {/* Step 3: Audio Ready */}
          {step === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Script
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar ID (HeyGen)
                </label>
                <input
                  type="text"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                  placeholder="Enter HeyGen avatar ID"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGeneratingVideo ? 'Generating...' : 'Generate Video'}
                </button>
                <button
                  onClick={() => setStep('script')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Generating Video */}
          {step === 'generating-video' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating video...</p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Generation Started!</h3>
              <p className="text-gray-600 mb-6">
                Your video is being generated. Check back later to see the completed video.
              </p>
              <button
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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

