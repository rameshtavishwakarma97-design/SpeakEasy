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

# Build the project
RUN npm run build

# Install a simple static file server
RUN npm install -g serve

# Expose port 7860 (Required by Hugging Face Spaces)
EXPOSE 7860

# Start the server on port 7860, serving the 'dist' directory as a Single Page App
CMD ["serve", "-s", "dist", "-l", "7860"]
