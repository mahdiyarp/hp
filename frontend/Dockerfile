### Multi-stage Dockerfile: build with Node, serve with nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY vite.config.ts vite.config.ts
COPY postcss.config.cjs postcss.config.cjs
COPY tailwind.config.cjs tailwind.config.cjs
# Ensure devDependencies (like Vite) are installed in builder
RUN npm install --include=dev

# Copy source and build
COPY . .
# Enable optional developer autologin in build-time env when desired
ENV VITE_DEV_AUTOLOGIN=true
RUN npm run build

### Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# ensure nginx serves index.html for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

