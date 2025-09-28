# CLO Skalbara Uppgift 02 - Webbapplikation

## Översikt
React-frontend med Node.js Express backend som körs i Docker Swarm. Kommunicerar med AWS Lambda API för datahantering och visar realtids server-information.

## Arkitektur
```
React Frontend ← Express Server → AWS API Gateway → Lambda
                      ↓
              Local SQLite (stats)
```

## Funktioner
- **React Frontend** med modern UI
- **CRUD-operationer** för items via AWS API
- **Server-information** från Docker Swarm
- **Statistics** och besökarräkning
- **Responsive design** för olika skärmstorlekar

## Teknologi
- **React**: Frontend framework
- **Node.js + Express**: Backend server
- **Docker**: Containerisering
- **Vite**: Build tool för snabbare utveckling
- **SQLite**: Lokal databas för statistik

## Docker Deployment
Applikationen körs som Docker Swarm service:
- **3 replicas** för hög tillgänglighet
- **Load balancing** mellan instanser
- **Rolling updates** utan driftstopp
- **Health checks** för automatisk recovery

## CI/CD
GitHub Actions hanterar automatisk deployment:
1. **Build** React app med Vite
2. **Docker build** multi-stage för optimering
3. **Push** till Docker Hub
4. **SSH deployment** till Docker Swarm manager
5. **Rolling update** av tjänsten

## Development
```bash
# Installera dependencies
npm install

# Utvecklingsserver
npm run dev

# Bygg för produktion
npm run build

# Docker build
docker build -t webbapp .
```

## Säkerhet
- **Dynamic API configuration** - hämtar API URL runtime
- **Production environment** - NODE_ENV=production
- **Security headers** och CORS-konfiguration
- **Container security** med non-root user