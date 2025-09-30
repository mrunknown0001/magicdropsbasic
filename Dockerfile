# Multi-stage build for production deployment
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files and lock files
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/

# Install dependencies
RUN npm ci --omit=dev --ignore-scripts
RUN cd server && npm ci --omit=dev --ignore-scripts

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files and lock files
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts
RUN cd server && npm ci --ignore-scripts

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build backend
RUN cd server && npm run build

# Production image with Nginx + Node.js
FROM nginx:alpine AS runner

# Install Node.js and required packages
RUN apk add --no-cache nodejs npm dumb-init curl supervisor

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built frontend to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy built backend
COPY --from=builder --chown=nextjs:nodejs /app/server/dist /app/backend
COPY --from=deps --chown=nextjs:nodejs /app/server/node_modules /app/backend/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/server/package.json /app/backend/

# Copy email templates if they exist
COPY --from=builder --chown=nextjs:nodejs /app/server/src/templates /app/backend/templates

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create supervisor configuration
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:backend]' >> /etc/supervisord.conf && \
    echo 'command=node /app/backend/index.js' >> /etc/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisord.conf && \
    echo 'user=nextjs' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf

# Expose port 80 for Nginx
EXPOSE 80

# Health check for the frontend
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start both Nginx and Node.js using supervisor
ENTRYPOINT ["dumb-init", "--"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
