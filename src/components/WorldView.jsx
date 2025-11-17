import { useState } from 'react';
import { useWorlds } from '../contexts/WorldsContext';
import { useVideos } from '../contexts/VideosContext';
import SystemPromptEditor from './SystemPromptEditor';
import VideosList from './VideosList';
import ChapterCreator from './ChapterCreator';

export default function WorldView() {
  const { selectedWorld } = useWorlds();
  const { getVideosByWorldId } = useVideos();
  const [showChapterCreator, setShowChapterCreator] = useState(false);

  if (!selectedWorld) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">No World Selected</h2>
          <p className="text-gray-500">Select a world from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  const videos = getVideosByWorldId(selectedWorld.id);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedWorld.name}</h1>
          <p className="text-gray-600">
            Created {new Date(selectedWorld.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* System Prompt Editor */}
        <div className="mb-8">
          <SystemPromptEditor world={selectedWorld} />
        </div>

        {/* Videos Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Chapters / Videos</h2>
            <button
              onClick={() => setShowChapterCreator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + Create New Chapter
            </button>
          </div>
          <VideosList videos={videos} />
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

