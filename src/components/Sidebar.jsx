import { useWorlds } from '../contexts/WorldsContext';

export default function Sidebar({ onCreateWorld }) {
  const { worlds, selectedWorldId, setSelectedWorldId } = useWorlds();

  return (
    <div className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Worlds Dashboard</h1>
      </div>
      
      <div className="p-4">
        <button
          onClick={onCreateWorld}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Create New World
        </button>
      </div>

      <div className="px-2">
        <h2 className="px-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Worlds
        </h2>
        {worlds.length === 0 ? (
          <p className="px-2 text-gray-500 text-sm">No worlds yet. Create one to get started!</p>
        ) : (
          <div className="space-y-1">
            {worlds.map((world) => (
              <button
                key={world.id}
                onClick={() => setSelectedWorldId(world.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedWorldId === world.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium">{world.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(world.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

