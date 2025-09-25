import React, { useState, useEffect } from 'react'
import './App.css'

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
    timestamp: 'Laddar...',
    environment: 'Laddar...',
    platform: 'Laddar...',
    refreshCount: 0
  })

  const [dbStats, setDbStats] = useState({
    totalVisits: 0,
    visitsByContainer: [],
    recentMessages: [],
    containerStats: []
  })

  const [newMessage, setNewMessage] = useState('')
  const [messageAuthor, setMessageAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchServerInfo = async () => {
    try {
      setError(null)
      const response = await fetch('/api/server-info')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setServerInfo(prev => ({
        hostname: data.hostname || 'Data saknas',
        containerId: data.containerId || 'Data saknas',
        containerName: data.containerName || 'Data saknas',
        nodeName: data.nodeName || 'Data saknas',
        nodeId: data.nodeId || 'Data saknas',
        serviceName: data.serviceName || 'Data saknas',
        timestamp: new Date(data.timestamp).toLocaleString('sv-SE') || 'Data saknas',
        environment: data.environment || 'unknown',
        platform: data.platform || 'Data saknas',
        refreshCount: prev.refreshCount + 1
      }))

      setLoading(false)
    } catch (err) {
      console.error('Error fetching server info:', err)
      setError(err.message)

      // Fallback till lokala värden om API misslyckas
      setServerInfo(prev => ({
        hostname: window.location.hostname || 'localhost',
        containerId: 'Data saknas (API-fel)',
        containerName: 'Data saknas (API-fel)',
        nodeName: 'Data saknas (API-fel)',
        nodeId: 'Data saknas (API-fel)',
        serviceName: 'Data saknas (API-fel)',
        timestamp: new Date().toLocaleString('sv-SE'),
        environment: 'development',
        platform: 'browser',
        refreshCount: prev.refreshCount + 1
      }))

      setLoading(false)
    }
  }

  const fetchDbStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      setDbStats({
        totalVisits: data.total_visits || 0,
        visitsByContainer: data.visits_by_container || [],
        recentMessages: data.recent_messages || [],
        containerStats: data.container_stats || []
      })
    } catch (err) {
      console.error('Error fetching database stats:', err)
    }
  }

  const submitMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          author: messageAuthor.trim() || 'Anonymous'
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const result = await response.json()
      console.log('Message submitted:', result)

      // Clear form
      setNewMessage('')
      setMessageAuthor('')

      // Refresh stats
      await fetchDbStats()

    } catch (err) {
      console.error('Error submitting message:', err)
      setError('Failed to submit message: ' + err.message)
    } finally {
      setSubmitting(false)
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

    // Auto-refresh var 5:e sekund för att visa load balancing
    const interval = setInterval(fetchAllData, 5000)
    return () => clearInterval(interval)
  }, [])

  const isProduction = serverInfo.environment === 'production'

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🐳 Docker Swarm - Webbapp</h1>
          <div className={`status-badge ${isProduction ? 'production' : 'development'}`}>
            {isProduction ? '🚀 Production' : '🔧 Development'}
          </div>
          {error && <div className="error-badge">⚠️ API Error: {error}</div>}
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
            <p className="info-value container-id">{serverInfo.containerId}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🏷️</div>
            <h3>Container Name</h3>
            <p className="info-value">{serverInfo.containerName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">�</div>
            <h3>Docker Node</h3>
            <p className="info-value">{serverInfo.nodeName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">⚙️</div>
            <h3>Service</h3>
            <p className="info-value">{serverInfo.serviceName}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">�🕒</div>
            <h3>Senaste Uppdatering</h3>
            <p className="info-value">{serverInfo.timestamp}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🔄</div>
            <h3>Refresh Count</h3>
            <p className="info-value">{serverInfo.refreshCount}</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🌐</div>
            <h3>Environment</h3>
            <p className="info-value">{serverInfo.environment}</p>
          </div>
        </div>

        {/* Database Statistics Section */}
        <div className="database-section">
          <h2>📊 Databas & Load Balancing</h2>

          <div className="db-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <h4>Totala Besök</h4>
              <p className="stat-value">{dbStats.totalVisits}</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <h4>Load Distribution</h4>
              <div className="container-stats">
                {dbStats.containerStats.map((stat, index) => (
                  <div key={index} className="container-stat">
                    <span className="container-name">{stat.hostname}</span>
                    <span className="request-count">{stat.request_count} requests</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message System */}
          <div className="message-section">
            <h3>💬 Skicka Meddelande</h3>
            <form onSubmit={submitMessage} className="message-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Ditt namn (frivilligt)"
                  value={messageAuthor}
                  onChange={(e) => setMessageAuthor(e.target.value)}
                  className="author-input"
                />
              </div>
              <div className="form-row">
                <textarea
                  placeholder="Skriv ditt meddelande här..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows="3"
                  className="message-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !newMessage.trim()}
                className="submit-btn"
              >
                {submitting ? '📤 Skickar...' : '📤 Skicka Meddelande'}
              </button>
            </form>
          </div>

          {/* Recent Messages */}
          <div className="messages-display">
            <h3>📝 Senaste Meddelanden</h3>
            <div className="messages-list">
              {dbStats.recentMessages.length === 0 ? (
                <p className="no-messages">Inga meddelanden än. Var först att skriva!</p>
              ) : (
                dbStats.recentMessages.map((msg, index) => (
                  <div key={msg.id || index} className="message-item">
                    <div className="message-header">
                      <strong>{msg.author}</strong>
                      <span className="message-meta">
                        {new Date(msg.timestamp).toLocaleString('sv-SE')}
                        <span className="processed-by"> via {msg.hostname}</span>
                      </span>
                    </div>
                    <p className="message-content">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
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