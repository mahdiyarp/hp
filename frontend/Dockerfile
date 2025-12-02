### Production image: serve prebuilt dist with nginx
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Copy prebuilt assets (ensure `frontend/dist` exists before building)
COPY dist/ .

# ensure nginx serves index.html for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

