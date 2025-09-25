# Multi-stage build for React app with Express backend
FROM node:18-alpine AS builder

# Build arguments for version info
ARG BUILD_DATE
ARG VERSION=2.1
ARG COMMIT_SHA=unknown

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

# Create build info file
RUN echo "{\"version\":\"${VERSION:-2.1}\",\"buildDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commitSha\":\"${COMMIT_SHA:-unknown}\"}" > public/build-info.json

# Build React app with Vite
RUN yarn build

# Production stage - Express server only
FROM node:18-alpine AS production

# Add labels for Watchtower
LABEL com.centurylinklabs.watchtower.enable="true"
LABEL org.opencontainers.image.title="CLO FreSva Webbapp"
LABEL org.opencontainers.image.description="Docker Swarm React Frontend with Express Backend"

# Create app directory
WORKDIR /app

# Copy built React app to public directory
COPY --from=builder /app/dist ./public

# Copy backend files
COPY app.js package.json yarn.lock ./

# Install only production dependencies for backend
RUN yarn install --production --frozen-lockfile

# Create data directory for SQLite with proper permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to node user for security
USER node

# Expose port 80
EXPOSE 80

# Start Express server directly
CMD ["node", "app.js"]