# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since we might not have package-lock.json)
RUN npm install --omit=dev

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

# Install curl for health checks
# Install curl for health checks and ffmpeg for media processing
#RUN apk update && apk add --no-cache curl
#RUN apk update && apk add --no-cache ffmpeg
RUN apk update && apk add --no-cache wget
RUN apk update && apk add --no-cache ffmpeg

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=frontend-builder /public/admin-new ./public/admin-new

# Copy source code and package files
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./


# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Create logs directory and ensure permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "src/index.js"]