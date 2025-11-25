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
    <div className="bg-white border border-gray-300 rounded p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">System Prompt</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-black hover:text-gray-600 font-medium text-sm underline"
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
            className="w-full h-48 p-3 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="bg-white hover:bg-gray-100 text-black font-medium py-2 px-4 rounded transition-colors border border-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-black whitespace-pre-wrap bg-gray-50 p-4 rounded min-h-[120px] border border-gray-200">
          {prompt || (
            <span className="text-gray-500 italic">No system prompt set. Click Edit to add one.</span>
          )}
        </div>
      )}
    </div>
  );
}

