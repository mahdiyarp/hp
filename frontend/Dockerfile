### Multi-stage Dockerfile: build with Node, serve with nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (fallback to npm install if lockfile missing)
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.json
COPY vite.config.ts vite.config.ts
COPY postcss.config.cjs postcss.config.cjs
COPY tailwind.config.cjs tailwind.config.cjs
RUN if [ -f package-lock.json ]; then npm ci --silent; else echo "[INFO] package-lock.json missing -> using npm install" && npm install --silent; fi

# Copy source and build
COPY . .
RUN npm run build

### Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# ensure nginx serves index.html for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

