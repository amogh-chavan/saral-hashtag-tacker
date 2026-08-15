FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the application
RUN npm run build

# Default command (will be overridden in docker-compose.yml)
CMD ["npm", "run", "start:server"]
