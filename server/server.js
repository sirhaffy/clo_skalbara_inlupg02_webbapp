const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// API endpoint for server information
app.get('/api/server-info', async (req, res) => {
    try {
        // Get container ID (first 12 chars of hostname in Docker)
        const hostname = os.hostname();
        const containerId = hostname.length > 12 ? hostname.substring(0, 12) : hostname;

        // Try to get secrets from AWS Parameter Store (demonstrate security)
        let configLoaded = false;
        try {
            // This would normally fetch from Parameter Store
            // const secret = await getParameterStoreValue('/clofresva_skalbara_upg02/app/secret_key');
            configLoaded = process.env.SECRET_KEY ? true : false;
        } catch (error) {
            console.log('Config not loaded from Parameter Store');
        }

        const serverInfo = {
            hostname: hostname,
            containerId: containerId,
            platform: `${os.platform()} ${os.arch()}`,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            loadBalanced: process.env.LOAD_BALANCED === 'true',
            configLoaded: configLoaded,
            memoryUsage: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(os.totalmem() / 1024 / 1024)
            },
            requestCount: req.app.locals.requestCount || 0
        };

        // Increment request counter
        req.app.locals.requestCount = (req.app.locals.requestCount || 0) + 1;

        res.json(serverInfo);
    } catch (error) {
        console.error('Error getting server info:', error);
        res.status(500).json({ error: 'Failed to get server information' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CLO FreSva app running on port ${port}`);
    console.log(`📊 Server info: ${os.hostname()} (${os.platform()})`);
    console.log(`🐳 Container ID: ${os.hostname().substring(0, 12)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    process.exit(0);
});