# =============================================================================
# Vidood Stream — production image (self-hosted, no Convex)
# Build:  docker build -t vidood .
# Run:    docker run -p 80:8787 -v vidood-data:/app/data -v vidood-storage:/app/storage vidood
# =============================================================================

# ---- Build stage: frontend --------------------------------------------------
FROM oven/bun:1 AS build
WORKDIR /app

# Dependencies first (better layer caching).
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Source + build.
COPY . .
RUN bun run build

# ---- Runtime stage: Bun server (API + media + static dist) ------------------
FROM oven/bun:1 AS runtime
WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock* ./
RUN bun install --frozen-lockfile --production || bun install --production
COPY --from=build /app/dist ./dist
COPY server ./server
COPY tsconfig.server.json ./tsconfig.server.json

ENV PORT=8787
EXPOSE 8787

# Persist database + uploaded media outside the container.
VOLUME ["/app/data", "/app/storage"]

CMD ["bun", "run", "server/index.ts"]
