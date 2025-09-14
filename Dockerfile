FROM node:lts-alpine3.22 AS app-env

# Install Python and Java and pre-cache emulator dependencies.
RUN apk add --no-cache python3 py3-pip openjdk11-jre bash && \
    npm install -g firebase-tools && \
    firebase setup:emulators:firestore && \
    firebase setup:emulators:database && \
    firebase setup:emulators:pubsub && \
    firebase setup:emulators:storage && \
    firebase setup:emulators:ui && \
    rm -rf /var/cache/apk/*

WORKDIR /app

COPY . .
## UI
RUN npm install
RUN npm run build:docker
## Functions
RUN npm --prefix functions install
RUN npm --prefix functions run build

CMD ["npm", "run", "emulator"]
