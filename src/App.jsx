import { useState } from 'react';
import { WorldsProvider } from './contexts/WorldsContext';
import { VideosProvider } from './contexts/VideosContext';
import Sidebar from './components/Sidebar';
import WorldView from './components/WorldView';
import CreateWorldModal from './components/CreateWorldModal';

function App() {
  const [showCreateWorldModal, setShowCreateWorldModal] = useState(false);

  return (
    <WorldsProvider>
      <VideosProvider>
        <div className="flex h-screen bg-white">
          <Sidebar onCreateWorld={() => setShowCreateWorldModal(true)} />
          <WorldView />
          {showCreateWorldModal && (
            <CreateWorldModal onClose={() => setShowCreateWorldModal(false)} />
          )}
        </div>
      </VideosProvider>
    </WorldsProvider>
  );
}

export default App;
