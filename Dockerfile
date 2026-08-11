# =============================================================================
# CawStream — production image
# Build:  docker build --build-arg VITE_CONVEX_URL=https://<deploy>.convex.cloud -t cawstream .
# Run:    docker run -p 80:80 cawstream
# =============================================================================

# ---- Build stage ------------------------------------------------------------
FROM oven/bun:1 AS build
WORKDIR /app

# Dependencies first (better layer caching).
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Source + build. VITE_CONVEX_URL is baked into the bundle at build time.
COPY . .
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN bun run build

# ---- Serve stage ------------------------------------------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
