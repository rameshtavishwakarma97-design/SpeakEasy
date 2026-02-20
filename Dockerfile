# Use Node.js to build and serve the app
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project (token will be injected at runtime, not build time)
RUN npm run build

# Expose port 7860 (Required by Hugging Face Spaces)
EXPOSE 7860

# Use custom server that injects HF Space secrets at runtime
CMD ["node", "server.cjs"]
