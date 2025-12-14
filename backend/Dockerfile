# Development Dockerfile for Backend
FROM node:20-alpine

# Install build dependencies and OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start in development mode with hot reload
CMD ["npm", "run", "start:dev"]
