const express = require('express');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 80;

// Create data directory if it doesn't exist
const dataDir = '/app/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // Visitor counter table
  db.run(`CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT,
    container_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    author TEXT DEFAULT 'Anonymous',
    hostname TEXT,
    container_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Container stats table
  db.run(`CREATE TABLE IF NOT EXISTS container_stats (
    hostname TEXT PRIMARY KEY,
    request_count INTEGER DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Serve static files from public directory (built React app)
app.use(express.static(path.join(__dirname, 'public')));

// Inject hostname for frontend
app.get('/hostname.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.CONTAINER_HOSTNAME="${os.hostname()}";`);
});

// Track visits middleware
app.use('/api', (req, res, next) => {
  const hostname = os.hostname();
  const containerId = process.env.HOSTNAME || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Record visit
  db.run(
    'INSERT INTO visits (hostname, container_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
    [hostname, containerId, ipAddress, userAgent]
  );

  // Update container stats
  db.run(
    'INSERT OR REPLACE INTO container_stats (hostname, request_count, last_seen) VALUES (?, COALESCE((SELECT request_count FROM container_stats WHERE hostname = ?) + 1, 1), CURRENT_TIMESTAMP)',
    [hostname, hostname]
  );

  next();
});

// API endpoint for server info
app.get('/api/server-info', (req, res) => {
  const serverInfo = {
    hostname: os.hostname(),
    containerId: process.env.HOSTNAME || 'unknown',
    containerName: process.env.CONTAINER_NAME || 'unknown',
    nodeName: process.env.NODE_NAME || 'unknown',
    nodeId: process.env.NODE_ID || 'unknown',
    serviceName: process.env.SERVICE_NAME || 'unknown',
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadAvg: os.loadavg(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(serverInfo);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hostname: os.hostname()
  });
});

// Database endpoints
app.get('/api/stats', (req, res) => {
  const hostname = os.hostname();

  Promise.all([
    // Total visits
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM visits', (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),

    // Visits by container
    new Promise((resolve, reject) => {
      db.all('SELECT hostname, COUNT(*) as count FROM visits GROUP BY hostname ORDER BY count DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),

    // Recent messages
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),

    // Container request stats
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM container_stats ORDER BY request_count DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ])
    .then(([totalVisits, visitsByContainer, recentMessages, containerStats]) => {
      res.json({
        current_container: hostname,
        total_visits: totalVisits,
        visits_by_container: visitsByContainer,
        recent_messages: recentMessages,
        container_stats: containerStats,
        timestamp: new Date().toISOString()
      });
    })
    .catch(err => {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error', message: err.message });
    });
});

// Add message endpoint
app.post('/api/messages', (req, res) => {
  const { message, author = 'Anonymous' } = req.body;
  const hostname = os.hostname();
  const containerId = process.env.HOSTNAME || 'unknown';

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  db.run(
    'INSERT INTO messages (message, author, hostname, container_id) VALUES (?, ?, ?, ?)',
    [message.trim(), author.trim(), hostname, containerId],
    function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      res.json({
        success: true,
        message_id: this.lastID,
        processed_by: hostname,
        timestamp: new Date().toISOString()
      });
    }
  );
});

// Get messages endpoint
app.get('/api/messages', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  db.all('SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', message: err.message });
    }

    res.json({
      messages: rows,
      current_container: os.hostname(),
      timestamp: new Date().toISOString()
    });
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <body>
      <h1>CLO FreSva</h1>
      <p>Hoppla.</p>
      <p><strong>Denna körs på server:</strong> ${os.hostname()}</p>
      <p><strong>Container ID:</strong> ${process.env.HOSTNAME || 'Unknown'}</p>
      <p><strong>Tid:</strong> ${new Date().toISOString()}</p>
      <p><strong>Platform:</strong> ${os.platform()}</p>
    </body>
    </html>
  `);
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App running on port ${port}`);
  console.log(`Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, closing database...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database closed.');
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing database...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database closed.');
    }
    process.exit(0);
  });
});