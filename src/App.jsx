import React, { useState, useEffect } from 'react'
import './App.css'
import ItemsManager from './components/ItemsManager'

function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [serverInfo, setServerInfo] = useState({
    hostname: 'Laddar...',
    containerId: 'Laddar...',
    containerName: 'Laddar...',
    nodeName: 'Laddar...',
    nodeId: 'Laddar...',
    serviceName: 'Laddar...',
    taskSlot: 'Laddar...',
    timestamp: 'Laddar...',
    platform: 'Laddar...',
    environment: 'development'
  })

  const [dbStats, setDbStats] = useState({
    visitsByContainer: [],
    containerStats: []
  })

  const fetchServerInfo = async () => {
    try {
      setError(null)
      const response = await fetch('/api/server-info')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON - API endpoint not available')
      }

      const data = await response.json()

      setServerInfo(prev => ({
        hostname: data.hostname || 'Data saknas',
        containerId: data.containerId || 'Data saknas',
        containerName: data.containerName || 'Data saknas',
        nodeName: data.nodeName || 'Data saknas',
        nodeId: data.nodeId || 'Data saknas',
        serviceName: data.serviceName || 'Data saknas',
        taskSlot: data.taskSlot || 'Data saknas',
        timestamp: new Date(data.timestamp).toLocaleString('sv-SE') || 'Data saknas',
        platform: data.platform || 'Data saknas',
        environment: data.environment || 'development'
      }))

      setLoading(false)
    } catch (err) {
      console.error('Error fetching server info:', err)
      setError(err.message)

      // Fallback values if API fails
      setServerInfo(prev => ({
        hostname: window.location.hostname || 'localhost',
        containerId: 'Data saknas (API-fel)',
        containerName: 'Data saknas (API-fel)',
        nodeName: 'Data saknas (API-fel)',
        nodeId: 'Data saknas (API-fel)',
        serviceName: 'Data saknas (API-fel)',
        taskSlot: 'Data saknas (API-fel)',
        timestamp: new Date().toLocaleString('sv-SE'),
        platform: 'browser',
        environment: 'development'
      }))

      setLoading(false)
    }
  }

  const fetchDbStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON - API endpoint not available')
      }

      const data = await response.json()
      setDbStats({
        visitsByContainer: data.visits_by_container || [],
        containerStats: data.container_stats || []
      })
    } catch (err) {
      console.error('Error fetching database stats:', err)
    }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchServerInfo(),
        fetchDbStats()
      ])
    }

    fetchAllData()
  }, [])

  const isProduction = serverInfo.environment === 'production'

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🐳 Docker Swarm - Webbapp v2.1.4</h1>
          <div className={`status-badge ${isProduction ? 'production' : 'development'}`}>
            {isProduction ? '🚀 Production - Rolling Updates Active!' : '🔧 Development'}
          </div>
          {error && <div className="error-badge">⚠️ API Error: {error}</div>}
        </header>

        <div className="info-grid">
          <div className="info-card">
            <div className="card-icon">📦</div>
            <h3>Container ID</h3>
            <p className="info-value container-id">{serverInfo.containerId}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🏷️</div>
            <h3>Container Name</h3>
            <p className="info-value">{serverInfo.containerName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🐳</div>
            <h3>Docker Node</h3>
            <p className="info-value">{serverInfo.nodeName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">⚙️</div>
            <h3>Service</h3>
            <p className="info-value">{serverInfo.serviceName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🎯</div>
            <h3>Task Slot</h3>
            <p className="info-value">{serverInfo.taskSlot}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🕒</div>
            <h3>Senaste Uppdatering</h3>
            <p className="info-value">{serverInfo.timestamp}</p>
          </div>
        </div>

        <div className="actions">
          <button
            className="refresh-btn"
            onClick={() => Promise.all([fetchServerInfo(), fetchDbStats()])}
          >
            🔄 Uppdatera All Info
          </button>
        </div>

        <div className="load-section">
          <h2>⚖️ Load Distribution</h2>
          <p className="section-description">
            Visar fördelningen av HTTP-requests mellan olika containers i Docker Swarm clustret.
            Varje container rapporterar sitt hostname och antal requests den har behandlat.
          </p>
          <div className="db-stats-grid">
            <div className="stat-card">
              <div className="container-stats">
                {dbStats.containerStats.length === 0 ? (
                  <div className="container-stat loading-stat">
                    <span className="container-name">Laddar container-statistik...</span>
                    <span className="request-count">⏳</span>
                  </div>
                ) : (
                  dbStats.containerStats.map((stat, index) => (
                    <div key={index} className="container-stat">
                      <span className="container-name" title={stat.hostname}>
                        {stat.hostname}
                      </span>
                      <span className="request-count">
                        {stat.request_count} requests
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AWS Lambda API Section */}
        <div className="database-section">
          <h2>🪅 AWS Lambda API Integration</h2>
          <p className="sync-info">CRUD-operationer mot AWS Lambda API Gateway och DynamoDB-databas.</p>
          <ItemsManager />
        </div>

        <div className="description">
          <h3>Docker Swarm Webbapp</h3>
          <p>
            Denna React-app visar Docker Swarm load balancing genom att visa
            vilken server/container som servar innehållet. I en riktig Docker Swarm
            miljö kommer olika containers på olika workers att svara på förfrågningar.
          </p>
          <div className="tech-stack">
            <span className="tech-tag">React</span>
            <span className="tech-tag">Vite</span>
            <span className="tech-tag">Docker Swarm</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App