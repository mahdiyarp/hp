### Multi-stage Dockerfile: build with Node, serve with nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package.json
COPY package-lock.json package-lock.json
# Ensure devDependencies (like Vite) are installed in builder reproducibly
RUN npm ci --include=dev

# Copy source and build
COPY . .
# Enable optional developer autologin in build-time env when desired
ENV VITE_DEV_AUTOLOGIN=true
# Mitigate potential memory issues during build
ENV NODE_OPTIONS=--max-old-space-size=512
RUN npm run build

### Production image
FROM nginx:stable-alpine
RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html

# ensure nginx serves index.html for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

