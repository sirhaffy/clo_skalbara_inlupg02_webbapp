import React, { useState, useEffect } from 'react';
import ServerInfo from './components/ServerInfo';
import './styles/App.scss';

function App() {
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServerInfo();
    // Refresh every 30 seconds
    const interval = setInterval(fetchServerInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch('/api/server-info');
      if (!response.ok) throw new Error('Failed to fetch server info');
      const data = await response.json();
      setServerData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CLO FreSva</h1>
        <p className="app-subtitle">Docker Swarm Test Application</p>
      </header>

      <main className="app-main">
        {loading && <div className="loading">Loading server information...</div>}
        {error && <div className="error">Error: {error}</div>}
        {serverData && <ServerInfo data={serverData} onRefresh={fetchServerInfo} />}
      </main>

      <footer className="app-footer">
        <p>Hoppla. 🐳</p>
      </footer>
    </div>
  );
}

export default App;