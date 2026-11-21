# syntax=docker/dockerfile:1

# --- build ----------------------------------------------------------------------------
FROM node:22-alpine AS builder
# npm 10 crashes resolving vitest's optional peers; the project pins npm 11 (package.json).
RUN npm install -g npm@11.21.3
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Analytics are compiled in; empty values disable them.
ARG VITE_UMAMI_SCRIPT_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_UMAMI_SCRIPT_URL=$VITE_UMAMI_SCRIPT_URL VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
RUN npm run build

# --- runtime --------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.31-alpine

COPY nginx/default.conf /etc/nginx/templates/conf.d/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/templates/snippets/security-headers.conf.template
COPY --from=builder /app/build /usr/share/nginx/html

ENV PORT=8080 \
    BACKEND_URL=http://backend:4000 \
    NGINX_RESOLVER=127.0.0.11 \
    REAL_IP_FROM=127.0.0.1/32 \
    CSP_ANALYTICS_ORIGIN="" \
    # templates/<path>.template is rendered to /etc/nginx/<path> at start-up
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/nginx-health" || exit 1
