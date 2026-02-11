# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks and ffmpeg for media processing
RUN apk update && apk add --no-cache wget ffmpeg

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend and backend source
COPY --from=frontend-builder /public/admin-new ./public/admin-new
COPY src/ ./src/
COPY public/ ./public/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Create logs directory and ensure permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3002/health || exit 1

# Start application
CMD ["node", "src/index.js"]
