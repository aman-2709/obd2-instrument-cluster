# One install step, two images:
#   dev   the Create React App dev server with hot reload. docker-compose.yml builds this one
#         (`target: dev`) and bind-mounts src and public over it.
#   prod  the production build served by nginx. It is the LAST stage, so a plain `docker build`
#         (release.yml and deploy.yml) produces it.

# The JavaScript is built on the machine running the build, even for another CPU (linux/arm64 on
# an amd64 runner): the output is plain files, so nothing here needs emulating. `dev` is only
# ever built for the machine that runs it.
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
CMD ["npm", "start"]

FROM deps AS build
COPY . .
# No source maps in the shipped image: they are several MB that nobody opens on the car's Pi.
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# -slim: the same nginx and entrypoint without the perl/njs/otel modules this site never loads.
FROM nginx:1.30-alpine-slim AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Executable in git; the nginx entrypoint runs it before starting nginx (see the script).
COPY docker-entrypoint.d/40-cluster-config.sh /docker-entrypoint.d/40-cluster-config.sh
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
# busybox wget: the nginx image has no curl.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
