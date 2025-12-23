# Development Dockerfile for Frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Don't copy source code - it comes from volumes!
# This allows hot reload to work properly

# Expose port
EXPOSE 3000

# Start in development mode with hot reload
CMD ["npm", "run", "dev"]
