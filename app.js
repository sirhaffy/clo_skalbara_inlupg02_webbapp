const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 80;

// Get API Gateway URL from multiple sources with fallback
const getAPIGatewayURL = async () => {
  // 1. Environment variable (set by Docker/Ansible)
  if (process.env.API_GATEWAY_URL && process.env.API_GATEWAY_URL !== 'https://your-api-gateway-url.amazonaws.com/prod') {
    console.log('✅ Using API Gateway URL from environment:', process.env.API_GATEWAY_URL);
    return process.env.API_GATEWAY_URL;
  }

  // 2. Try to get from AWS SSM Parameter Store (if running on EC2 with IAM role)
  try {
    const AWS = require('aws-sdk');
    const ssm = new AWS.SSM({ region: process.env.AWS_REGION || 'eu-north-1' });
    const result = await ssm.getParameter({ Name: '/app/api-gateway-url' }).promise();
    if (result.Parameter && result.Parameter.Value) {
      console.log('✅ Using API Gateway URL from AWS SSM:', result.Parameter.Value);
      return result.Parameter.Value;
    }
  } catch (error) {
    console.log('⚠️  Could not fetch API Gateway URL from AWS SSM:', error.message);
  }

  // 3. Fallback to default/placeholder
  console.log('⚠️  Using fallback API Gateway URL - API calls will fail');
  return 'https://api-not-configured.example.com';
};

// Initialize API Gateway URL
let API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

// Try to get the real URL at startup
getAPIGatewayURL().then(url => {
  API_GATEWAY_URL = url;
  console.log(`🚀 Server ready with API Gateway URL: ${API_GATEWAY_URL}`);
}).catch(error => {
  console.error('❌ Failed to determine API Gateway URL:', error);
});

console.log(`Starting server on port ${port}`);
console.log(`API Gateway URL: ${API_GATEWAY_URL}`);

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

// Helper function to call AWS API
const callAPI = async (endpoint, method = 'GET', body = null) => {
  try {
    const url = `${API_GATEWAY_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `webbapp-container-${os.hostname()}`
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`Making API call: ${method} ${url}`);
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Simple in-memory stats for load balancing demo (since AWS API doesn't have this)
let containerStats = new Map();
const updateContainerStats = (hostname) => {
  if (!containerStats.has(hostname)) {
    containerStats.set(hostname, { hostname, request_count: 0, last_seen: new Date() });
  }
  const stats = containerStats.get(hostname);
  stats.request_count += 1;
  stats.last_seen = new Date();
};

// Track visits for load balancing display
app.use('/api', (req, res, next) => {
  const hostname = os.hostname();
  updateContainerStats(hostname);
  next();
});

// API endpoint for server info
app.get('/api/server-info', (req, res) => {
  const serverInfo = {
    hostname: os.hostname(), // Actual container hostname
    containerId: process.env.CONTAINER_ID || process.env.HOSTNAME || os.hostname().substring(0, 12),
    containerName: process.env.CONTAINER_NAME || 'unknown',
    nodeName: process.env.NODE_NAME || 'unknown',
    nodeId: process.env.NODE_ID || 'unknown',
    serviceName: process.env.SERVICE_NAME || 'unknown',
    taskSlot: process.env.TASK_SLOT || 'unknown',
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadAvg: os.loadavg(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    apiGatewayUrl: API_GATEWAY_URL
  };

  res.json(serverInfo);
});

// Stats endpoint that combines local container stats with AWS API data
app.get('/api/stats', async (req, res) => {
  try {
    const hostname = os.hostname();

    // Get messages from AWS API
    let recentMessages = [];
    try {
      recentMessages = await callAPI('/items') || [];
      // Transform AWS API items to message format
      recentMessages = recentMessages.map(item => ({
        id: item.id,
        message: item.description,
        author: item.name,
        hostname: hostname, // Show which container fetched it
        timestamp: item.createdAt
      }));
    } catch (error) {
      console.error('Failed to fetch messages from AWS API:', error);
    }

    // Get local container stats
    const containerStatsArray = Array.from(containerStats.values());

    res.json({
      current_container: hostname,
      recent_messages: recentMessages,
      container_stats: containerStatsArray,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({
      error: 'Stats API error',
      message: error.message,
      current_container: os.hostname(),
      recent_messages: [],
      container_stats: Array.from(containerStats.values())
    });
  }
});

// Add message endpoint - posts to AWS API
app.post('/api/messages', async (req, res) => {
  try {
    const { message, author = 'Anonymous' } = req.body;
    const hostname = os.hostname();

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Post to AWS API
    const newItem = await callAPI('/items', 'POST', {
      name: author.trim(),
      description: message.trim()
    });

    res.json({
      success: true,
      message_id: newItem.id,
      processed_by: hostname,
      timestamp: new Date().toISOString(),
      aws_item: newItem
    });
  } catch (error) {
    console.error('Error posting message to AWS API:', error);
    res.status(500).json({
      error: 'Failed to post message',
      message: error.message,
      processed_by: os.hostname()
    });
  }
});

// Delete message endpoint - deletes from AWS API
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await callAPI(`/items/${id}`, 'DELETE');

    res.json({
      success: true,
      deleted_id: id,
      processed_by: os.hostname(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting message from AWS API:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      message: error.message,
      processed_by: os.hostname()
    });
  }
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