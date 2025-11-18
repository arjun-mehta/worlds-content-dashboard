import { useState } from 'react';
import { useWorlds } from '../contexts/WorldsContext';

export default function CreateWorldModal({ onClose }) {
  const { createWorld } = useWorlds();
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [heyGenAvatarId, setHeyGenAvatarId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState(null);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter a book name');
      return;
    }

    createWorld(name, author, elevenLabsVoiceId, heyGenAvatarId, systemPrompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New World</h2>
            <button
              onClick={onClose}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Art of War"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Sun Tzu"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ElevenLabs Voice ID
              </label>
              <input
                type="text"
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                placeholder="Enter ElevenLabs voice ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HeyGen Avatar ID
              </label>
              <input
                type="text"
                value={heyGenAvatarId}
                onChange={(e) => setHeyGenAvatarId(e.target.value)}
                placeholder="Enter HeyGen avatar ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scripting System Prompt (Optional - can edit later)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system prompt that will guide script generation for this world..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create World
              </button>
              <button
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

