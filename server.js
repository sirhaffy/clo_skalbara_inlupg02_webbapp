const express = require('express');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Skapa AWS SSM client för att hämta hemligheter från Parameter Store
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-west-1' });

// Global variabel för att lagra hämtade hemligheter
let secrets = {};

// Funktion för att hämta hemligheter från AWS Parameter Store
async function getSecret(parameterName) {
    try {
        const command = new GetParameterCommand({
            Name: parameterName,
            WithDecryption: true  // Viktigt! Dekryptera hemligheten
        });
        
        const response = await ssmClient.send(command);
        return response.Parameter.Value;
    } catch (error) {
        console.error(`Error fetching secret ${parameterName}:`, error);
        throw error;
    }
}

// Hämta alla hemligheter vid startup
async function loadSecrets() {
    try {
        console.log('Loading secrets from AWS Parameter Store...');
        
        // 1. SECRET_KEY - Används för JWT-tokens och session-hantering
        secrets.secretKey = await getSecret('/clofresva_skalbara_upg02/secret_key');
        console.log('✓ Secret key loaded for JWT/sessions');
        
        // 2. DB_PASSWORD - Används för databasanslutning
        secrets.dbPassword = await getSecret('/clofresva_skalbara_upg02/db/password');
        console.log('✓ Database password loaded');
        
        // 3. API_KEY - Används för externa API-anrop
        secrets.apiKey = await getSecret('/clofresva_skalbara_upg02/api_key');
        console.log('✓ External API key loaded');
        
        console.log('All secrets loaded successfully!');
    } catch (error) {
        console.error('Failed to load secrets:', error);
        process.exit(1); // Stoppa servern om hemligheter inte kan laddas
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Session middleware - ANVÄNDER secret_key från Parameter Store
app.use(session({
    secret: () => secrets.secretKey, // HÄR ANVÄNDS secret_key!
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 timmar
    }
}));

// Databasanslutning - ANVÄNDER db/password från Parameter Store
let dbConnection;
async function connectToDatabase() {
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'app_user',
            password: secrets.dbPassword, // HÄR ANVÄNDS db/password!
            database: process.env.DB_NAME || 'app_database',
            port: process.env.DB_PORT || 3306
        });
        console.log('✓ Connected to database using Parameter Store password');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

// JWT token-generering - ANVÄNDER secret_key
function generateJWT(userId) {
    return jwt.sign(
        { userId: userId, timestamp: Date.now() },
        secrets.secretKey, // HÄR ANVÄNDS secret_key för JWT!
        { expiresIn: '24h' }
    );
}

// Middleware för JWT-verifiering
function verifyJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, secrets.secretKey); // HÄR ANVÄNDS secret_key!
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ROUTES - Här ser du praktiska exempel på hur hemligheterna används

// 1. Login endpoint - Visar användning av secret_key för JWT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Hämta användare från databas (använder db/password)
        if (dbConnection) {
            const [rows] = await dbConnection.execute(
                'SELECT id, username, password_hash FROM users WHERE username = ?',
                [username]
            );
            
            if (rows.length > 0) {
                const user = rows[0];
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                
                if (isValidPassword) {
                    // Skapa JWT token med secret_key från Parameter Store
                    const token = generateJWT(user.id);
                    
                    // Sätt session (använder också secret_key)
                    req.session.userId = user.id;
                    
                    res.json({
                        success: true,
                        token: token,
                        message: 'Login successful - JWT created with Parameter Store secret!'
                    });
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            } else {
                res.status(401).json({ error: 'User not found' });
            }
        } else {
            // Demo-läge utan databas
            if (username === 'demo' && password === 'demo123') {
                const token = generateJWT('demo_user');
                req.session.userId = 'demo_user';
                
                res.json({
                    success: true,
                    token: token,
                    message: 'Demo login - JWT created with Parameter Store secret!'
                });
            } else {
                res.status(401).json({ error: 'Invalid demo credentials' });
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// 2. Skyddad route som kräver JWT - Visar användning av secret_key
app.get('/api/protected', verifyJWT, (req, res) => {
    res.json({
        message: 'This is protected data!',
        user: req.user,
        note: 'This endpoint was accessed using JWT verified with Parameter Store secret_key'
    });
});

// 3. Extern API-anrop - Visar användning av api_key
app.get('/api/weather/:city', verifyJWT, async (req, res) => {
    const { city } = req.params;
    
    try {
        // Exempel: OpenWeatherMap API-anrop med api_key från Parameter Store
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                    q: city,
                    appid: secrets.apiKey, // HÄR ANVÄNDS api_key!
                    units: 'metric'
                }
            }
        );
        
        res.json({
            weather: response.data,
            note: 'Weather data fetched using API key from Parameter Store!'
        });
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch weather data',
            details: 'Check if API key from Parameter Store is valid'
        });
    }
});

// 4. Databasoperationer - Visar användning av db/password
app.get('/api/users', verifyJWT, async (req, res) => {
    try {
        if (dbConnection) {
            // Hämta användare från databas (anslutning skapad med db/password)
            const [rows] = await dbConnection.execute(
                'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC'
            );
            
            res.json({
                users: rows,
                note: 'User data fetched from database using Parameter Store password!'
            });
        } else {
            res.json({
                users: [
                    { id: 1, username: 'demo', email: 'demo@example.com', created_at: new Date() }
                ],
                note: 'Demo data - database password from Parameter Store would be used for real DB'
            });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        secrets_loaded: Object.keys(secrets).length > 0,
        loaded_secrets: Object.keys(secrets),
        message: 'Server is running with secrets from AWS Parameter Store'
    });
});

// Visa hur hemligheterna används (endast för demo)
app.get('/api/secrets-usage', (req, res) => {
    res.json({
        secret_usage: {
            secret_key: {
                purpose: 'JWT token signing and session encryption',
                used_in: ['JWT signing', 'Session middleware', 'Token verification'],
                example: 'Used every time a user logs in or accesses protected routes'
            },
            db_password: {
                purpose: 'Database connection authentication',
                used_in: ['MySQL connection', 'User queries', 'Data operations'],
                example: 'Used when connecting to database and running SQL queries'
            },
            api_key: {
                purpose: 'External API authentication',
                used_in: ['Weather API calls', 'Third-party services', 'External integrations'],
                example: 'Used when making requests to OpenWeatherMap or other APIs'
            }
        },
        note: 'These secrets are loaded from AWS Parameter Store at server startup'
    });
});

// Starta servern
async function startServer() {
    try {
        // Först: Ladda hemligheter från Parameter Store
        await loadSecrets();
        
        // Sedan: Anslut till databas (om konfigurerad)
        await connectToDatabase();
        
        // Slutligen: Starta HTTP-servern
        app.listen(port, () => {
            console.log(`\n🚀 Server running on port ${port}`);
            console.log(`📡 Health check: http://localhost:${port}/health`);
            console.log(`🔐 Secrets usage info: http://localhost:${port}/api/secrets-usage`);
            console.log(`\n💡 How secrets are used:`);
            console.log(`   - secret_key: JWT tokens & sessions`);
            console.log(`   - db/password: Database connection`);
            console.log(`   - api_key: External API calls`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Starta servern
startServer();