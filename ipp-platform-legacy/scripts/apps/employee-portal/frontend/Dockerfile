# Build stage
FROM node:22.14-alpine3.21 AS builder
WORKDIR /app
RUN apk upgrade --no-cache
COPY package.json .
RUN npm install
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Serve stage — nginx on 8080 as non-root (UID 101)
FROM nginx:1.27-alpine3.21
RUN apk upgrade --no-cache && \
    chown -R nginx:nginx /var/cache/nginx /var/run /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid
COPY --from=builder /app/build /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates/default.conf.template
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
