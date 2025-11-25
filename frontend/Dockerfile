# Use official Node.js runtime as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
# RUN npm run build

# Expose port
# EXPOSE 3000

# Start the application
# CMD ["npm", "run", "dev"]
