# ----------------------------
# Step 1: Base image
# ----------------------------
FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Expose API port
EXPOSE 4000

# Start the backend
CMD ["npm", "run", "dev"]
