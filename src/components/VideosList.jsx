import { useVideos } from '../contexts/VideosContext';

export default function VideosList({ videos }) {
  const { deleteVideo } = useVideos();

  if (videos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No chapters created yet. Create your first chapter to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <div key={video.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{video.chapterTitle}</h3>
              <p className="text-sm text-gray-500">Chapter {video.chapterNumber}</p>
            </div>
            <button
              onClick={() => deleteVideo(video.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
          
          <div className="mb-3">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              video.heyGenStatus === 'completed' ? 'bg-green-100 text-green-800' :
              video.heyGenStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
              video.heyGenStatus === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {video.heyGenStatus}
            </span>
          </div>

          {video.videoUrl && (
            <div className="mt-3">
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Video →
              </a>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-400">
            {new Date(video.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

