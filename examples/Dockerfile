# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user and data directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gr8hopper -u 1001 -G nodejs && \
    mkdir -p /app/data && \
    chown gr8hopper:nodejs /app/data

USER gr8hopper

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_FILE=/app/data/routes.json

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
