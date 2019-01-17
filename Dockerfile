FROM node:9-alpine
MAINTAINER Harry Walter <harwale@cisco.com>

ENV TINI_VERSION v0.14.0
ENV NODE_ENV production

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static-amd64 /bin/tini
RUN set -x \
    && mkdir -p /usr/src/app \
    && chmod +x /bin/tini

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN set -x \
    && apk add --no-cache git build-base \
    && npm install -g modclean \
    && npm install -q \
    && npm prune && modclean \
    && apk del --no-cache git build-base \
    && npm uninstall modclean

COPY certs/ /usr/src/app/certs/
COPY src/ /usr/src/app/src/

EXPOSE 3000

ENTRYPOINT [ "tini", "--", "node", "src/index.js" ]
