import { useState } from 'react';
import { useVideos } from '../contexts/VideosContext';
import { generateScript } from '../services/openai';
import { generateAudio } from '../services/elevenlabs';
import { generateVideo } from '../services/heygen';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export default function ChapterCreator({ world, onClose, existingChapter = null }) {
  const { createVideo, updateVideo, pollVideoStatus, getVideosByWorldId } = useVideos();
  const existingVideos = getVideosByWorldId(world.id);
  const maxChapterNumber = existingVideos.length > 0 
    ? Math.max(...existingVideos.map(v => v.chapterNumber || 0))
    : 0;
  const suggestedChapterNumber = maxChapterNumber + 1;
  
  // If editing existing chapter, pre-fill the data
  const isEditing = !!existingChapter;
  const existingVideo = existingChapter 
    ? existingVideos.find(v => v.chapterNumber === existingChapter.chapterNumber && v.angle === 1)
    : null;
  
  const [chapterTitle, setChapterTitle] = useState(existingChapter?.chapterTitle || '');
  const [chapterNumber, setChapterNumber] = useState(existingChapter?.chapterNumber?.toString() || suggestedChapterNumber.toString());
  const [avatarId, setAvatarId] = useState(''); // Deprecated: kept for backward compatibility but not used (Avatar IV uses image_key)
  const [step, setStep] = useState(
    existingVideo?.script ? (existingVideo.audioUrl ? 'audio' : 'script') : 'input'
  ); // 'input' | 'generating' | 'script' | 'generating-audio' | 'audio' | 'generating-video' | 'complete'
  const [script, setScript] = useState(existingVideo?.script || '');
  const [audioUrl, setAudioUrl] = useState(existingVideo?.audioUrl || null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [placeholderVideoId, setPlaceholderVideoId] = useState(null); // Track placeholder video for new chapters

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
      
      // Save script to database
      if (isEditing && existingVideo) {
        // Update existing video's script
        await updateVideo(existingVideo.id, {
          script: generatedScript,
          chapterTitle, // Update title in case it changed
        });
      } else if (!isEditing) {
        // For new chapters, create a placeholder video record to save the script
        // This ensures the script is persisted even if user closes modal before generating video
        if (!placeholderVideoId) {
          const placeholderVideo = await createVideo(
            world.id,
            chapterTitle,
            parseInt(chapterNumber),
            generatedScript, // Save script immediately
            '', // No avatarId
            null, // No audio yet
            1 // Default to angle 1 (will create other angles when video is generated)
          );
          setPlaceholderVideoId(placeholderVideo.id);
          console.log('✅ Created placeholder video record to save script:', placeholderVideo.id);
        } else {
          // Update existing placeholder with new script
          await updateVideo(placeholderVideoId, {
            script: generatedScript,
            chapterTitle, // Update title in case it changed
          });
        }
      }
      
      setStep('script');
    } catch (err) {
      setError(err.message || 'Failed to generate script');
      setStep('input');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Upload audio blob to Supabase Storage and get public URL
  const uploadAudioToSupabase = async (audioBlob) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured, cannot upload audio');
      return null;
    }

    try {
      const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
      console.log('📤 Uploading audio to Supabase Storage:', fileName);
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      if (publicUrl) {
        console.log('✅ Audio uploaded to Supabase:', publicUrl);
        return publicUrl;
      } else {
        console.error('❌ Failed to get public URL from Supabase');
        return null;
      }
    } catch (error) {
      console.error('❌ Error uploading audio to Supabase:', error);
      return null;
    }
  };

  const handleGenerateAudio = async () => {
    if (!world.elevenLabsVoiceId?.trim()) {
      setError('Please set an ElevenLabs Voice ID for this world first');
      return;
    }

    if (!script.trim()) {
      setError('Please generate a script first');
      return;
    }

    setIsGeneratingAudio(true);
    setError(null);
    setStep('generating-audio');

    try {
      const audioResponse = await generateAudio(script, world.elevenLabsVoiceId);
      console.log('🎵 Audio generated, response:', audioResponse);
      console.log('🎵 Audio blob URL (temporary):', audioResponse.audioUrl);
      
      // Upload audio to Supabase Storage to get a persistent URL
      let persistentAudioUrl = audioResponse.audioUrl; // Fallback to blob URL
      if (audioResponse.audioBlob) {
        const supabaseUrl = await uploadAudioToSupabase(audioResponse.audioBlob);
        if (supabaseUrl) {
          persistentAudioUrl = supabaseUrl;
          console.log('✅ Using Supabase URL for audio:', persistentAudioUrl);
        } else {
          console.warn('⚠️ Failed to upload to Supabase, using blob URL (temporary)');
        }
      }
      
      setAudioUrl(persistentAudioUrl);
      setAudioBlob(audioResponse.audioBlob);
      
      // Save persistent audio URL to database
      if (isEditing) {
        if (existingVideo) {
          // Update existing video's audio URL
          console.log('💾 Saving audio to DB for existing video:', existingVideo.id, 'audioUrl:', persistentAudioUrl);
          await updateVideo(existingVideo.id, {
            audioUrl: persistentAudioUrl,
          });
          console.log('✅ Audio saved to DB for video:', existingVideo.id);
        } else {
          // If editing but no video record exists, create one
          // This can happen if chapter was imported but no script/audio generated yet
          const video = await createVideo(
            world.id,
            chapterTitle,
            parseInt(chapterNumber),
            script, // Use current script
            '', // No avatarId
            persistentAudioUrl, // Save persistent audio URL
            1 // Default to angle 1
          );
          console.log('✅ Created video record for editing chapter with audio:', video.id);
        }
      } else {
        // For new chapters, ensure we have a placeholder video record
        if (!placeholderVideoId) {
          // Create placeholder if it doesn't exist (shouldn't happen normally, but handle edge case)
          console.log('💾 Creating placeholder video with audio URL:', persistentAudioUrl);
          const placeholderVideo = await createVideo(
            world.id,
            chapterTitle,
            parseInt(chapterNumber),
            script, // Use current script
            '', // No avatarId
            persistentAudioUrl, // Save persistent audio URL
            1 // Default to angle 1
          );
          setPlaceholderVideoId(placeholderVideo.id);
          console.log('✅ Created placeholder video record to save audio:', placeholderVideo.id, 'audioUrl:', placeholderVideo.audioUrl);
        } else {
          // Update existing placeholder with audio URL
          console.log('💾 Updating placeholder video with audio URL:', placeholderVideoId, 'audioUrl:', persistentAudioUrl);
          await updateVideo(placeholderVideoId, {
            audioUrl: persistentAudioUrl,
          });
          console.log('✅ Audio saved to DB for placeholder video:', placeholderVideoId);
        }
      }
      
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

    // Check if we have audio (either blob or URL)
    if (!audioBlob && !audioUrl) {
      setError('Audio is required to generate video. Please generate audio first.');
      return;
    }

    // If we have audioUrl but no audioBlob, fetch the audio to get the blob
    let audioBlobToUse = audioBlob;
    if (!audioBlobToUse && audioUrl) {
      try {
        console.log('📥 Fetching audio from URL to get blob:', audioUrl);
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
        }
        audioBlobToUse = await audioResponse.blob();
        console.log('✅ Audio blob fetched successfully');
      } catch (error) {
        console.error('❌ Error fetching audio:', error);
        setError(`Failed to load audio: ${error.message}. Please regenerate audio.`);
        return;
      }
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
        const heyGenResponse = await generateVideo(audioBlobToUse, imageKey, script, `${chapterTitle} - Angle ${angle}`);
        console.log(`✅ HeyGen response for angle ${angle}:`, heyGenResponse);
        
        // Use audio URL from first response for all videos
        if (angle === 1) {
          sharedAudioUrl = heyGenResponse.audioUrl;
        }
        const finalAudioUrl = sharedAudioUrl || heyGenResponse.audioUrl;
        
        // Check if we're editing and if a video for this angle already exists
        let video;
        if (isEditing) {
          const existingVideoForAngle = existingVideos.find(
            v => v.chapterNumber === parseInt(chapterNumber) && v.angle === angle
          );
          
          if (existingVideoForAngle) {
            // Update existing video
            await updateVideo(existingVideoForAngle.id, {
              chapterTitle,
              script,
              audioUrl: finalAudioUrl,
              heyGenVideoId: heyGenResponse.videoId,
              heyGenStatus: heyGenResponse.status,
            });
            video = { ...existingVideoForAngle, ...{
              chapterTitle,
              script,
              audioUrl: finalAudioUrl,
              heyGenVideoId: heyGenResponse.videoId,
              heyGenStatus: heyGenResponse.status,
            }};
            console.log(`✅ Video ${angle} updated with new content`);
          } else {
            // Create new video for this angle (if it didn't exist)
            video = await createVideo(
              world.id, 
              chapterTitle, 
              parseInt(chapterNumber),
              script, 
              avatarId, 
              finalAudioUrl,
              angle
            );
            console.log(`✅ Video ${angle} created with Supabase audio URL:`, video);
          }
        } else {
          // For new chapters, if this is angle 1 and we have a placeholder, update it instead of creating new
          if (angle === 1 && placeholderVideoId) {
            await updateVideo(placeholderVideoId, {
              chapterTitle,
              script,
              audioUrl: finalAudioUrl,
              heyGenVideoId: heyGenResponse.videoId,
              heyGenStatus: heyGenResponse.status,
            });
            // Get the updated video from context (it should be updated there)
            const updatedVideos = getVideosByWorldId(world.id);
            video = updatedVideos.find(v => v.id === placeholderVideoId);
            if (!video) {
              // Fallback: create new if update didn't work or video not found
              video = await createVideo(
                world.id, 
                chapterTitle, 
                parseInt(chapterNumber),
                script, 
                avatarId, 
                finalAudioUrl,
                angle
              );
            } else {
              // Ensure video object has all the latest data
              video = {
                ...video,
                chapterTitle,
                script,
                audioUrl: finalAudioUrl,
                heyGenVideoId: heyGenResponse.videoId,
                heyGenStatus: heyGenResponse.status,
              };
            }
            console.log(`✅ Video ${angle} updated from placeholder with Supabase audio URL:`, video);
          } else {
            // Create new video record for angles 2 and 3, or if no placeholder exists
            video = await createVideo(
              world.id, 
              chapterTitle, 
              parseInt(chapterNumber),
              script, 
              avatarId, 
              finalAudioUrl,
              angle
            );
            console.log(`✅ Video ${angle} created with Supabase audio URL:`, video);
          }
        }
        
        // Update video with HeyGen info (if not already updated above)
        if (!isEditing || !existingVideos.find(v => v.chapterNumber === parseInt(chapterNumber) && v.angle === angle)) {
          await updateVideo(video.id, {
            heyGenVideoId: heyGenResponse.videoId,
            heyGenStatus: heyGenResponse.status,
          });
          console.log(`✅ Video ${angle} updated with HeyGen info`);
        }

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
            <h2 className="text-2xl font-bold text-black">
              {isEditing ? `Edit Chapter ${chapterNumber}: ${chapterTitle}` : 'Create New Chapter'}
            </h2>
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

