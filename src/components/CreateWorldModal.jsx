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
      <div className="bg-white rounded border border-gray-300 max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Create New World</h2>
            <button
              onClick={onClose}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Book Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Art of War"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Sun Tzu"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                ElevenLabs Voice ID
              </label>
              <input
                type="text"
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                placeholder="Enter ElevenLabs voice ID"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                HeyGen Avatar ID
              </label>
              <input
                type="text"
                value={heyGenAvatarId}
                onChange={(e) => setHeyGenAvatarId(e.target.value)}
                placeholder="Enter HeyGen avatar ID"
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Scripting System Prompt (Optional - can edit later)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system prompt that will guide script generation for this world..."
                className="w-full h-32 p-3 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Create World
              </button>
              <button
                onClick={onClose}
                className="bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
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

