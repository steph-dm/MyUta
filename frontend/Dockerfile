# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID

RUN npm run build

# --- Production ---
FROM nginx:1.27-alpine3.21

RUN adduser -D -u 1001 appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/build /usr/share/nginx/html
RUN chown -R appuser:appuser /usr/share/nginx/html

USER appuser

ENV PORT=8080
ENV BACKEND_URL=http://localhost:4000
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
