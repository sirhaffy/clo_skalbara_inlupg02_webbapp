# Multi-stage build for React (Vite) + Node.js app
FROM node:18-alpine AS builder

# Enable corepack for yarn
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies with yarn
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build React app with Vite
RUN yarn build

# Production stage
FROM node:18-alpine AS production

# Add labels for Watchtower
LABEL com.centurylinklabs.watchtower.enable="true"
LABEL org.opencontainers.image.title="CLO FreSva Webbapp"
LABEL org.opencontainers.image.description="Docker Swarm Test Application"

# Enable corepack for yarn
RUN corepack enable

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json yarn.lock* ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy built React app and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["yarn", "start"]