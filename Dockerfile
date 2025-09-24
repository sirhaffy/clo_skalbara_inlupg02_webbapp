# React app with Nginx serving
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

# Production stage with nginx
FROM nginx:alpine AS production

# Add labels for Watchtower
LABEL com.centurylinklabs.watchtower.enable="true"
LABEL org.opencontainers.image.title="CLO FreSva Webbapp"
LABEL org.opencontainers.image.description="Docker Swarm React Frontend"

# Copy built React app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add hostname injection script
RUN echo '#!/bin/sh' > /docker-entrypoint.d/inject-hostname.sh && \
    echo 'echo "window.CONTAINER_HOSTNAME=\"$(hostname)\";" > /usr/share/nginx/html/hostname.js' >> /docker-entrypoint.d/inject-hostname.sh && \
    chmod +x /docker-entrypoint.d/inject-hostname.sh

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]