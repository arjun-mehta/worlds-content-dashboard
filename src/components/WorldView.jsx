import { useState } from 'react';
import { useWorlds } from '../contexts/WorldsContext';
import { useVideos } from '../contexts/VideosContext';
import { API_URL } from '../config';
import VideosList from './VideosList';
import ChapterCreator from './ChapterCreator';

export default function WorldView() {
  const { selectedWorld, updateWorld } = useWorlds();
  const { getVideosByWorldId } = useVideos();
  const [showChapterCreator, setShowChapterCreator] = useState(false);
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

  const handleStartEdit = () => {
    setEditedFields({
      name: selectedWorld.name || '',
      author: selectedWorld.author || '',
      elevenLabsVoiceId: selectedWorld.elevenLabsVoiceId || '',
      heyGenAvatarId: selectedWorld.heyGenAvatarId || '',
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
      heyGenAvatarId: selectedWorld.heyGenAvatarId || '',
      heyGenImageKey: selectedWorld.heyGenImageKey || '', // Deprecated, kept for backward compatibility
      heyGenImageKey1: selectedWorld.heyGenImageKey1 || '',
      heyGenImageKey2: selectedWorld.heyGenImageKey2 || '',
      heyGenImageKey3: selectedWorld.heyGenImageKey3 || '',
      systemPrompt: selectedWorld.systemPrompt || '',
    });
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
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  HeyGen Avatar ID
                </label>
                <input
                  type="text"
                  value={editedFields.heyGenAvatarId}
                  onChange={(e) => setEditedFields({ ...editedFields, heyGenAvatarId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Author Images (3 angles for Avatar IV videos)
                </label>
                <div className="space-y-4">
                  {[1, 2, 3].map((angle) => {
                    const imageKeyField = `heyGenImageKey${angle}`;
                    const angleKey = `angle${angle}`;
                    return (
                      <div key={angle} className="border border-gray-300 rounded p-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Angle {angle}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, angle)}
                          disabled={uploadingImage[angleKey]}
                          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-black disabled:opacity-50"
                        />
                        {uploadingImage[angleKey] && (
                          <p className="text-sm text-gray-600 mt-1">Uploading image {angle} to HeyGen...</p>
                        )}
                        {editedFields[imageKeyField] && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-xs text-gray-600 mb-1">Image Key:</p>
                            <p className="text-sm font-mono text-black break-all">{editedFields[imageKeyField]}</p>
                            {editedFields[imageKeyField].startsWith('image/') && (
                              <img
                                src={`https://resource2.heygen.ai/${editedFields[imageKeyField]}`}
                                alt={`Author Angle ${angle}`}
                                className="mt-2 max-h-24 rounded"
                              />
                            )}
                          </div>
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
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <p className="text-sm font-medium text-gray-600">HeyGen Avatar ID</p>
                  <p className="text-black">{selectedWorld.heyGenAvatarId || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600 mb-2">Author Image Keys (3 angles)</p>
                  <div className="space-y-2">
                    {[1, 2, 3].map((angle) => {
                      const imageKey = selectedWorld[`heyGenImageKey${angle}`] || '';
                      return (
                        <div key={angle} className="p-2 bg-gray-50 border border-gray-200 rounded">
                          <p className="text-xs font-medium text-gray-600">Angle {angle}:</p>
                          <p className="text-black font-mono text-xs break-all">
                            {imageKey || '—'}
                          </p>
                          {imageKey && imageKey.startsWith('image/') && (
                            <img
                              src={`https://resource2.heygen.ai/${imageKey}`}
                              alt={`Author Angle ${angle}`}
                              className="mt-2 max-h-20 rounded"
                            />
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
            <button
              onClick={() => setShowChapterCreator(true)}
              className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              + Create New Chapter
            </button>
          </div>
          <VideosList videos={videos} worldName={selectedWorld.name} />
        </div>

        {/* Chapter Creator Modal */}
        {showChapterCreator && (
          <ChapterCreator
            world={selectedWorld}
            onClose={() => setShowChapterCreator(false)}
          />
        )}
      </div>
    </div>
  );
}

