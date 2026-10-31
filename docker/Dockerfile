# syntax=docker/dockerfile:1

# Node.js on Alpine, pinned by digest; shared by every stage
FROM node:26.12-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies, cached until the lockfile changes
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Dev server with hot reload for docker/development.yaml
FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

# Production build; settings and keys are read when the server starts, not here
FROM deps AS build
COPY . .
RUN npm run build

# Nightly dumps with the tools for offsite copies built in, see docker/backup.sh
FROM postgres:18-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873 AS backup
RUN apk add --no-cache rclone age
COPY docker/backup.sh /usr/local/bin/backup.sh
ENTRYPOINT ["/bin/sh", "/usr/local/bin/backup.sh"]

# Non-root standalone server with the schema it applies when it starts
FROM base AS runtime
ARG APP_ENV=production
ENV NODE_ENV=production APP_ENV=${APP_ENV} HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node --exclude=.env* /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/db ./db
# Runs as the unprivileged node user
USER node
EXPOSE 3000
# Docker marks the container unhealthy when it or its database stops answering
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:3000/healthz?db=1" || exit 1
CMD ["node", "server.js"]
