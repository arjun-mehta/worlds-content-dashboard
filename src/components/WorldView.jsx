import { useState } from 'react';
import JSZip from 'jszip';
import { useWorlds } from '../contexts/WorldsContext';
import { useVideos } from '../contexts/VideosContext';
import { API_URL } from '../config';
import { generateChapters } from '../services/openai';
import VideosList from './VideosList';
import ChapterCreator from './ChapterCreator';

export default function WorldView() {
  const { selectedWorld, updateWorld } = useWorlds();
  const { getVideosByWorldId, createVideo } = useVideos();
  const [showChapterCreator, setShowChapterCreator] = useState(false);
  const [showChapterImporter, setShowChapterImporter] = useState(false);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [generatedChapters, setGeneratedChapters] = useState([]);
  const [editingChapterIndex, setEditingChapterIndex] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null); // Chapter being edited
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedFields, setEditedFields] = useState({
    name: '',
    author: '',
    elevenLabsVoiceId: '',
    heyGenAvatarId: '',
    heyGenImageKey: '',
    heyGenImageKey1: '',
    heyGenImageKey2: '',
    heyGenImageKey3: '',
    systemPrompt: '',
  });
  const [uploadingImage, setUploadingImage] = useState({ angle1: false, angle2: false, angle3: false });

  if (!selectedWorld) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-black mb-2">No World Selected</h2>
          <p className="text-gray-600">Select a world from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  const videos = getVideosByWorldId(selectedWorld.id);
  console.log('📹 Videos for world', selectedWorld.id, ':', videos.length, videos);

  // Helper function to sanitize filenames
  const sanitizeFilename = (str) => {
    return str
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Helper function to generate video filename: world_chapter#_chaptertitle_angle
  const getVideoFilename = (video) => {
    const world = sanitizeFilename(selectedWorld.name || 'world');
    const chapterNum = video.chapterNumber || '';
    const chapterTitle = sanitizeFilename(video.chapterTitle || 'chapter');
    const angle = video.angle || 1;
    return `${world}_${chapterNum}_${chapterTitle}_${angle}.mp4`;
  };

  // Helper function to generate audio filename: world_chapter#_chaptertitle
  const getAudioFilename = (video) => {
    const world = sanitizeFilename(selectedWorld.name || 'world');
    const chapterNum = video.chapterNumber || '';
    const chapterTitle = sanitizeFilename(video.chapterTitle || 'chapter');
    return `${world}_${chapterNum}_${chapterTitle}.mp3`;
  };

  const handleDownloadAllWorldVideos = async () => {
    const completedVideos = videos.filter(v => v.heyGenStatus === 'completed' && v.videoUrl);
    if (completedVideos.length === 0) {
      alert('No completed videos available to download for this world.');
      return;
    }

    try {
      const zip = new JSZip();
      
      // Group videos by chapter
      const videosByChapter = completedVideos.reduce((acc, video) => {
        const chapterKey = `${video.chapterNumber}-${video.chapterTitle}`;
        if (!acc[chapterKey]) {
          acc[chapterKey] = {
            chapterNumber: video.chapterNumber,
            chapterTitle: video.chapterTitle,
            videos: [],
            audioUrl: null,
          };
        }
        acc[chapterKey].videos.push(video);
        // Store audio URL from first video (all videos in a chapter share the same audio)
        if (!acc[chapterKey].audioUrl && video.audioUrl) {
          acc[chapterKey].audioUrl = video.audioUrl;
        }
        return acc;
      }, {});

      // Add videos and audio for each chapter in chapter folders
      for (const chapter of Object.values(videosByChapter)) {
        // Create folder name for this chapter
        const chapterFolderName = `Chapter_${chapter.chapterNumber}_${sanitizeFilename(chapter.chapterTitle)}`;
        
        // Add all videos for this chapter to the chapter folder
        for (const video of chapter.videos) {
          try {
            const response = await fetch(video.videoUrl);
            const blob = await response.blob();
            const filename = getVideoFilename(video);
            zip.file(`${chapterFolderName}/${filename}`, blob);
          } catch (error) {
            console.error(`Error downloading video for chapter ${chapter.chapterNumber}, angle ${video.angle}:`, error);
          }
        }

        // Add audio file for this chapter (once per chapter) to the chapter folder
        if (chapter.audioUrl && chapter.videos.length > 0) {
          try {
            const response = await fetch(chapter.audioUrl);
            const blob = await response.blob();
            const filename = getAudioFilename(chapter.videos[0]);
            zip.file(`${chapterFolderName}/${filename}`, blob);
          } catch (error) {
            console.error(`Error downloading audio for chapter ${chapter.chapterNumber}:`, error);
          }
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      const worldName = sanitizeFilename(selectedWorld.name || 'world');
      link.download = `${worldName}_all_chapters.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Failed to create zip file. Please try downloading chapters individually.');
    }
  };

  const handleStartEdit = () => {
    setEditedFields({
      name: selectedWorld.name || '',
      author: selectedWorld.author || '',
      elevenLabsVoiceId: selectedWorld.elevenLabsVoiceId || '',
      heyGenImageKey: selectedWorld.heyGenImageKey || '', // Deprecated, kept for backward compatibility
      heyGenImageKey1: selectedWorld.heyGenImageKey1 || '',
      heyGenImageKey2: selectedWorld.heyGenImageKey2 || '',
      heyGenImageKey3: selectedWorld.heyGenImageKey3 || '',
      systemPrompt: selectedWorld.systemPrompt || '',
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = () => {
    updateWorld(selectedWorld.id, editedFields);
    setIsEditingDetails(false);
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    setEditedFields({
      name: selectedWorld.name || '',
      author: selectedWorld.author || '',
      elevenLabsVoiceId: selectedWorld.elevenLabsVoiceId || '',
      heyGenImageKey: selectedWorld.heyGenImageKey || '', // Deprecated, kept for backward compatibility
      heyGenImageKey1: selectedWorld.heyGenImageKey1 || '',
      heyGenImageKey2: selectedWorld.heyGenImageKey2 || '',
      heyGenImageKey3: selectedWorld.heyGenImageKey3 || '',
      systemPrompt: selectedWorld.systemPrompt || '',
    });
  };

  const handleGenerateChapters = async () => {
    if (!selectedWorld.name || !selectedWorld.author) {
      alert('Please set the book name and author in World Details first.');
      return;
    }

    setIsGeneratingChapters(true);
    try {
      const chapters = await generateChapters(selectedWorld.name, selectedWorld.author);
      setGeneratedChapters(chapters);
      setShowChapterImporter(true);
    } catch (error) {
      alert(error.message || 'Failed to generate chapters. Please try again.');
    } finally {
      setIsGeneratingChapters(false);
    }
  };

  const handleEditChapter = (index, field, value) => {
    const updated = [...generatedChapters];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedChapters(updated);
  };

  const handleDeleteChapter = (index) => {
    const updated = generatedChapters.filter((_, i) => i !== index);
    // Renumber all chapters sequentially starting from 1
    const renumbered = updated.map((chapter, idx) => ({
      ...chapter,
      chapterNumber: idx + 1,
    }));
    setGeneratedChapters(renumbered);
  };

  const handleAddChapter = () => {
    const maxChapterNumber = generatedChapters.length > 0
      ? Math.max(...generatedChapters.map(ch => ch.chapterNumber || 0))
      : 0;
    const newChapter = {
      chapterNumber: maxChapterNumber + 1,
      chapterTitle: '',
    };
    setGeneratedChapters([...generatedChapters, newChapter]);
    setEditingChapterIndex(generatedChapters.length); // Edit the newly added chapter
  };

  const handleImportChapters = async () => {
    if (generatedChapters.length === 0) return;

    // Validate all chapters have titles
    const invalidChapters = generatedChapters.filter(ch => !ch.chapterTitle || !ch.chapterTitle.trim());
    if (invalidChapters.length > 0) {
      alert('Please provide titles for all chapters before importing.');
      return;
    }

    try {
      // Create placeholder video records for each chapter (angle 1 only for now)
      // Users can later generate scripts/audio/videos for each chapter
      let importedCount = 0;
      for (const chapter of generatedChapters) {
        // Check if chapter already exists
        const existingChapter = videos.find(
          v => v.chapterNumber === chapter.chapterNumber && v.worldId === selectedWorld.id
        );
        
        if (!existingChapter) {
          await createVideo(
            selectedWorld.id,
            chapter.chapterTitle.trim(),
            chapter.chapterNumber,
            '', // No script yet
            '', // No avatarId
            null, // No audio yet
            1 // Default to angle 1 (users can generate all 3 angles later)
          );
          importedCount++;
        }
      }
      
      setShowChapterImporter(false);
      setGeneratedChapters([]);
      setEditingChapterIndex(null);
    } catch (error) {
      console.error('Error importing chapters:', error);
      alert('Failed to import some chapters. Please try again.');
    }
  };

  const handleImageUpload = async (event, angle) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB');
      return;
    }

    const angleKey = `angle${angle}`;
    setUploadingImage({ ...uploadingImage, [angleKey]: true });
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/api/heygen/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      console.log(`✅ Image ${angle} uploaded to HeyGen, image_key:`, data.image_key);
      
      // Update the editedFields with the new image_key for the specific angle
      const imageKeyField = `heyGenImageKey${angle}`;
      setEditedFields({
        ...editedFields,
        [imageKeyField]: data.image_key,
      });
      
      // Also update the world immediately
      const updateData = { [imageKeyField]: data.image_key };
      await updateWorld(selectedWorld.id, updateData);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image to HeyGen');
    } finally {
      setUploadingImage({ ...uploadingImage, [angleKey]: false });
      // Reset file input
      event.target.value = '';
    }
  };

  // Helper function to get preview of system prompt
  const getSystemPromptPreview = (prompt) => {
    if (!prompt) return '—';
    const maxLength = 200;
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">{selectedWorld.name}</h1>
          <p className="text-gray-600">
            Created {new Date(selectedWorld.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* World Details Editor */}
        <div className="mb-8 bg-white border border-gray-300 rounded p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">World Details</h3>
            {!isEditingDetails && (
              <button
                onClick={handleStartEdit}
                className="text-black hover:text-gray-600 font-medium text-sm underline"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Book Name
                  </label>
                  <input
                    type="text"
                    value={editedFields.name}
                    onChange={(e) => setEditedFields({ ...editedFields, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={editedFields.author}
                    onChange={(e) => setEditedFields({ ...editedFields, author: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    ElevenLabs Voice ID
                  </label>
                  <input
                    type="text"
                    value={editedFields.elevenLabsVoiceId}
                    onChange={(e) => setEditedFields({ ...editedFields, elevenLabsVoiceId: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-3">
                  Author Images (3 angles for Avatar IV videos)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((angle) => {
                    const imageKeyField = `heyGenImageKey${angle}`;
                    const angleKey = `angle${angle}`;
                    const hasImage = editedFields[imageKeyField];
                    return (
                      <div key={angle} className="border border-gray-300 rounded-lg p-4 bg-white hover:border-gray-400 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-black">Angle {angle}</span>
                          {hasImage && (
                            <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>
                          )}
                        </div>
                        {hasImage && editedFields[imageKeyField].startsWith('image/') ? (
                          <div className="mb-3">
                            <img
                              src={`https://resource2.heygen.ai/${editedFields[imageKeyField]}`}
                              alt={`Author Angle ${angle}`}
                              className="w-full rounded border border-gray-200"
                              style={{ maxHeight: '200px', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div className="mb-3 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, angle)}
                            disabled={uploadingImage[angleKey]}
                            className="w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer disabled:opacity-50 cursor-pointer"
                          />
                        </label>
                        {uploadingImage[angleKey] && (
                          <p className="text-xs text-gray-500 mt-2">Uploading...</p>
                        )}
                        {hasImage && (
                          <p className="text-xs text-gray-500 mt-2 font-mono truncate" title={editedFields[imageKeyField]}>
                            {editedFields[imageKeyField].substring(0, 20)}...
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Scripting System Prompt
                </label>
                <textarea
                  value={editedFields.systemPrompt}
                  onChange={(e) => setEditedFields({ ...editedFields, systemPrompt: e.target.value })}
                  placeholder="Enter the system prompt that will guide script generation for this world..."
                  className="w-full h-48 p-3 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDetails}
                  className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Book</p>
                  <p className="text-black">{selectedWorld.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Author</p>
                  <p className="text-black">{selectedWorld.author || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">ElevenLabs Voice ID</p>
                  <p className="text-black">{selectedWorld.elevenLabsVoiceId || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600 mb-3">Author Images (3 angles)</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((angle) => {
                      const imageKey = selectedWorld[`heyGenImageKey${angle}`] || '';
                      return (
                        <div key={angle} className="border border-gray-300 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Angle {angle}</span>
                            {imageKey && (
                              <span className="text-xs text-green-600 font-medium">✓</span>
                            )}
                          </div>
                          {imageKey && imageKey.startsWith('image/') ? (
                            <img
                              src={`https://resource2.heygen.ai/${imageKey}`}
                              alt={`Author Angle ${angle}`}
                              className="w-full rounded border border-gray-200 mb-2"
                              style={{ maxHeight: '200px', objectFit: 'contain' }}
                            />
                          ) : (
                            <div className="h-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center mb-2">
                              <span className="text-xs text-gray-400">No image</span>
                            </div>
                          )}
                          {imageKey && (
                            <p className="text-xs text-gray-500 font-mono truncate" title={imageKey}>
                              {imageKey.substring(0, 18)}...
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Scripting System Prompt</p>
                <div className="text-black whitespace-pre-wrap bg-gray-50 p-4 rounded max-h-32 overflow-y-auto border border-gray-200">
                  {getSystemPromptPreview(selectedWorld.systemPrompt)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Videos Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-black">Chapters / Videos</h2>
            <div className="flex items-center gap-3">
              {videos.some(v => v.heyGenStatus === 'completed' && v.videoUrl) && (
                <button
                  onClick={handleDownloadAllWorldVideos}
                  className="text-sm text-black hover:text-gray-600 underline"
                  title="Download all completed videos and audio for this world"
                >
                  ↓ Download All
                </button>
              )}
              <button
                onClick={handleGenerateChapters}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedWorld.name || !selectedWorld.author || isGeneratingChapters}
                title={!selectedWorld.name || !selectedWorld.author ? 'Book name and author are required' : 'Generate chapters from book title and author'}
              >
                {isGeneratingChapters ? 'Generating...' : '📚 Generate Chapters'}
              </button>
              <button
                onClick={() => setShowChapterCreator(true)}
                className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                + Create New Chapter
              </button>
            </div>
          </div>
          <VideosList 
            videos={videos} 
            worldName={selectedWorld.name}
            onEditChapter={(chapter) => {
              setEditingChapter(chapter);
              setShowChapterCreator(true);
            }}
          />
        </div>

        {/* Chapter Creator Modal */}
        {showChapterCreator && (
          <ChapterCreator
            world={selectedWorld}
            existingChapter={editingChapter}
            onClose={() => {
              setShowChapterCreator(false);
              setEditingChapter(null);
            }}
          />
        )}

        {/* Chapter Importer Modal */}
        {showChapterImporter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded border border-gray-300 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-black">Import Chapters</h2>
                  <button
                    onClick={() => {
                      setShowChapterImporter(false);
                      setGeneratedChapters([]);
                      setEditingChapterIndex(null);
                    }}
                    className="text-gray-500 hover:text-black"
                  >
                    ✕
                  </button>
                </div>
                
                {generatedChapters.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Review and edit {generatedChapters.length} chapters for "{selectedWorld.name}" by {selectedWorld.author}. 
                      You can edit titles, delete chapters, or add new ones before importing.
                    </p>
                    <div className="border border-gray-300 rounded max-h-96 overflow-y-auto mb-4">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-300 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-black">Chapter</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-black">Title</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-black w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {generatedChapters.map((chapter, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={chapter.chapterNumber}
                                  onChange={(e) => handleEditChapter(index, 'chapterNumber', parseInt(e.target.value) || 1)}
                                  min="1"
                                  className="w-20 p-1.5 border border-gray-300 rounded focus:outline-none focus:border-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={chapter.chapterTitle}
                                  onChange={(e) => handleEditChapter(index, 'chapterTitle', e.target.value)}
                                  placeholder="Chapter title"
                                  className="w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-black text-sm"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => handleDeleteChapter(index)}
                                  className="text-red-600 hover:text-red-800 text-xs underline"
                                  title="Delete chapter"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handleAddChapter}
                        className="text-sm text-black hover:text-gray-600 underline"
                      >
                        + Add Chapter
                      </button>
                      <span className="text-xs text-gray-500">
                        {generatedChapters.length} chapter{generatedChapters.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleImportChapters}
                        className="flex-1 bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
                      >
                        Import All ({generatedChapters.length} chapters)
                      </button>
                      <button
                        onClick={() => {
                          setShowChapterImporter(false);
                          setGeneratedChapters([]);
                          setEditingChapterIndex(null);
                        }}
                        className="bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No chapters found. Please try again.</p>
                    <button
                      onClick={() => {
                        setShowChapterImporter(false);
                        setGeneratedChapters([]);
                        setEditingChapterIndex(null);
                      }}
                      className="mt-4 bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

