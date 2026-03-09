# Use Node.js 20 as base image (matching your package.json engines requirement)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create data directory for volumes
RUN mkdir -p /data

# Expose the port (adjust if your app uses a different port)
EXPOSE 3000

# Health check (using the same path as in railway.toml)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/drive/status || exit 1

# Start the application
CMD ["npm", "start"]