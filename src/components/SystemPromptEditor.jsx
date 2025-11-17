import { useState } from 'react';
import { useWorlds } from '../contexts/WorldsContext';

export default function SystemPromptEditor({ world }) {
  const { updateWorld } = useWorlds();
  const [prompt, setPrompt] = useState(world.systemPrompt || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    updateWorld(world.id, { systemPrompt: prompt });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPrompt(world.systemPrompt || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Prompt</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter the system prompt that will guide script generation for this world..."
            className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg min-h-[120px]">
          {prompt || (
            <span className="text-gray-400 italic">No system prompt set. Click Edit to add one.</span>
          )}
        </div>
      )}
    </div>
  );
}

