ARG BUILDPLATFORM
FROM --platform=${BUILDPLATFORM} docker.io/library/node:22-alpine AS builder

WORKDIR /code
COPY . .

RUN npm install
RUN npm run bootstrap
RUN npm run build-all

ARG TARGETPLATFORM
FROM --platform=${TARGETPLATFORM} docker.io/library/busybox:1.37.0-musl

COPY --from=builder /code/packages/k8s/dist/index.js index.js
