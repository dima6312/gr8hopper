# Production Dockerfile for Gr8hopper
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy default routes.json (override with volume mount in docker-compose)
COPY routes.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S redirector -u 1001
USER redirector

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
