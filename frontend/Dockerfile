FROM node:22.12-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:3.21

WORKDIR /dist
COPY --from=build /app/dist /dist

# Publish built SPA assets into the shared volume for Nginx.
CMD ["sh", "-c", "test -f /dist/index.html || { echo 'missing /dist/index.html' >&2; exit 1; }; rm -rf /shared/* /shared/.[!.]* /shared/..?* 2>/dev/null; cp -a /dist/. /shared/ && echo 'frontend assets published'"]
