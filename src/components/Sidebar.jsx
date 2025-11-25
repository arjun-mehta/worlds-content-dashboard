import { useWorlds } from '../contexts/WorldsContext';

export default function Sidebar({ onCreateWorld }) {
  const { worlds, selectedWorldId, setSelectedWorldId } = useWorlds();

  return (
    <div className="w-64 bg-black text-white h-screen overflow-y-auto border-r border-gray-200">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Worlds Studio</h1>
      </div>
      
      <div className="p-4">
        <button
          onClick={onCreateWorld}
          className="w-full bg-gray-800 text-white hover:bg-gray-700 font-medium py-2 px-4 rounded transition-colors border border-gray-700"
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
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedWorldId === world.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-900'
                }`}
              >
                <div className="font-medium">{world.name}</div>
                <div className={`text-xs mt-0.5 ${
                  selectedWorldId === world.id ? 'text-gray-400' : 'text-gray-500'
                }`}>
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

