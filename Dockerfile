# Multi-stage build for React app with Express backend
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

# Production stage with nginx and node
FROM node:18-alpine AS production

# Install nginx
RUN apk add --no-cache nginx

# Add labels for Watchtower
LABEL com.centurylinklabs.watchtower.enable="true"
LABEL org.opencontainers.image.title="CLO FreSva Webbapp"
LABEL org.opencontainers.image.description="Docker Swarm React Frontend with Express Backend"

# Create app directory
WORKDIR /app

# Copy built React app to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy backend files
COPY app.js package.json ./
COPY node_modules ./node_modules

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create data directory for SQLite with proper permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Add hostname injection script
RUN echo '#!/bin/sh' > /docker-entrypoint.d/inject-hostname.sh && \
    echo 'echo "window.CONTAINER_HOSTNAME=\"$(hostname)\";" > /usr/share/nginx/html/hostname.js' >> /docker-entrypoint.d/inject-hostname.sh && \
    chmod +x /docker-entrypoint.d/inject-hostname.sh

# Create nginx directories
RUN mkdir -p /docker-entrypoint.d /var/log/nginx /var/lib/nginx/tmp

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting Express backend..."' >> /start.sh && \
    echo 'cd /app && node app.js &' >> /start.sh && \
    echo 'echo "Starting Nginx..."' >> /start.sh && \
    echo '/docker-entrypoint.d/inject-hostname.sh' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80

# Start both services
CMD ["/start.sh"]