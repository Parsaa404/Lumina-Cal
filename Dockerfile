# Use Node 22 Alpine for a lightweight base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first to cache dependencies
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Build the Vite frontend (creates the /dist directory)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production so Express serves the built frontend
ENV NODE_ENV=production

# Start the server using tsx
CMD ["npx", "tsx", "server.ts"]
