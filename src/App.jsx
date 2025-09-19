import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [serverInfo, setServerInfo] = useState({
    hostname: 'Laddar...',
    timestamp: 'Laddar...',
    containerId: 'Laddar...',
    userAgent: 'Laddar...',
    refreshCount: 0
  })

  const fetchServerInfo = () => {
    // Hämta endast riktig data, ingen simulering
    const now = new Date().toLocaleString('sv-SE')

    setServerInfo(prev => ({
      hostname: window.location.hostname || 'Data saknas',
      timestamp: now,
      containerId: window.CONTAINER_HOSTNAME || 'Data saknas (kör lokalt)',
      userAgent: navigator.userAgent.split(' ')[0] || 'Data saknas',
      refreshCount: prev.refreshCount + 1
    }))

    // Ta bort loading efter första fetch
    if (loading) {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServerInfo()
    // Auto-refresh var 10:e sekund för att simulera load balancing
    const interval = setInterval(fetchServerInfo, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🐳 Docker Swarm Load Balancer</h1>
          <div className="status-badge">✅ Aktiv</div>
        </header>

        <div className="info-grid">
          <div className="info-card">
            <div className="card-icon">🖥️</div>
            <h3>Server/Host</h3>
            <p className="info-value">{serverInfo.hostname}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">📦</div>
            <h3>Container ID</h3>
            <p className="info-value">{serverInfo.containerId}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🕒</div>
            <h3>Senaste Uppdatering</h3>
            <p className="info-value">{serverInfo.timestamp}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🔄</div>
            <h3>Refresh Count</h3>
            <p className="info-value">{serverInfo.refreshCount}</p>
          </div>
        </div>

        <div className="actions">
          <button
            className="refresh-btn"
            onClick={fetchServerInfo}
          >
            🔄 Uppdatera Server Info
          </button>
        </div>

        <div className="description">
          <h3>🎯 Docker Swarm Demo</h3>
          <p>
            Denna React-app visar Docker Swarm load balancing genom att visa
            vilken server/container som servar innehållet. I en riktig Docker Swarm
            miljö kommer olika containers på olika workers att svara på förfrågningar.
          </p>
          <div className="tech-stack">
            <span className="tech-tag">React</span>
            <span className="tech-tag">Vite</span>
            <span className="tech-tag">Docker Swarm</span>
            <span className="tech-tag">Nginx</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App