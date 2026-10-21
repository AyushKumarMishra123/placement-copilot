FROM node:20-alpine

WORKDIR /app

# Install dependencies first for optimal caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Expose backend API port
EXPOSE 5001

ENV NODE_ENV=production
ENV PORT=5001

CMD ["node", "server.js"]
