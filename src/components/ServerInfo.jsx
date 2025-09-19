import React from 'react';

function ServerInfo({ data, onRefresh }) {
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="server-info">
      <div className="server-info__header">
        <h2>Server Information</h2>
        <button className="refresh-btn" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="server-info__grid">
        <div className="info-card">
          <h3>🖥️ System</h3>
          <div className="info-item">
            <span className="label">Hostname:</span>
            <span className="value">{data.hostname}</span>
          </div>
          <div className="info-item">
            <span className="label">Container ID:</span>
            <span className="value">{data.containerId}</span>
          </div>
          <div className="info-item">
            <span className="label">Platform:</span>
            <span className="value">{data.platform}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>⏰ Runtime</h3>
          <div className="info-item">
            <span className="label">Current Time:</span>
            <span className="value">{new Date(data.timestamp).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="label">Uptime:</span>
            <span className="value">{formatUptime(data.uptime)}</span>
          </div>
          <div className="info-item">
            <span className="label">Node Version:</span>
            <span className="value">{data.nodeVersion}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>🔧 Environment</h3>
          <div className="info-item">
            <span className="label">Environment:</span>
            <span className="value">{data.environment}</span>
          </div>
          <div className="info-item">
            <span className="label">Load Balancer:</span>
            <span className="value">{data.loadBalanced ? '✅ Active' : '❌ Direct'}</span>
          </div>
          <div className="info-item">
            <span className="label">Config Loaded:</span>
            <span className="value">{data.configLoaded ? '✅ Yes' : '❌ No'}</span>
          </div>
        </div>
      </div>

      <div className="status-indicator">
        <div className="status-dot"></div>
        <span>Container is healthy and responding</span>
      </div>
    </div>
  );
}

export default ServerInfo;