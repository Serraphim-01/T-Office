# ----------------------------
# Step 1: Base image
# ----------------------------
FROM node:18-alpine

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
