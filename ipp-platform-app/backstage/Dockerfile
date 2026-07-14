FROM node:22.14-alpine3.21 AS packages
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/backend/package.json packages/backend/
COPY packages/app/package.json packages/app/

FROM node:22.14-alpine3.21 AS build
WORKDIR /app
RUN apk add --no-cache python3 py3-pip make g++ libc6-compat git && \
    apk upgrade --no-cache
COPY --from=packages /app .
RUN yarn install --frozen-lockfile --ignore-engines --network-timeout 600000

COPY . .
RUN yarn --cwd packages/app build
RUN yarn --cwd packages/backend build
# TechDocs site is generated at image-build time (pre-consolidation it was a
# committed build artifact); stage-2 copies it into techdocs-storage below.
RUN (pip3 install --no-cache-dir mkdocs mkdocs-material mkdocs-techdocs-core --break-system-packages 2>/dev/null || \
     pip3 install --no-cache-dir mkdocs mkdocs-material mkdocs-techdocs-core) && \
    mkdocs build

FROM node:22.14-alpine3.21
WORKDIR /app
ENV NODE_ENV production

RUN apk add --no-cache python3 py3-pip make g++ libc6-compat && \
    apk upgrade --no-cache && \
    pip3 install --no-cache-dir mkdocs mkdocs-material mkdocs-techdocs-core --break-system-packages 2>/dev/null || \
    pip3 install --no-cache-dir mkdocs mkdocs-material mkdocs-techdocs-core

COPY --from=build /app/yarn.lock ./
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/backend/dist/bundle.tar.gz ./

RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

RUN yarn install --ignore-engines --production --network-timeout 600000 --prefer-offline

COPY --from=build /app/app-config.yaml ./
COPY --from=build /app/catalog ./catalog
# Pre-built TechDocs: stored at /app/techdocs-storage so they survive pod restarts
COPY --from=build /app/site ./techdocs-storage/default/component/idp-demo-backstage

RUN addgroup --system --gid 1001 nodegroup && \
    adduser --system --uid 1001 --ingroup nodegroup nodeuser && \
    chown -R nodeuser:nodegroup /app
USER nodeuser

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
