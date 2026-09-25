FROM node:22-alpine3.22

RUN apk add --no-cache \
    ca-certificates \
    python3 \
    py3-ephem \
    tzdata

COPY computer /opt/synthai/computer

RUN mkdir -p /var/lib/synthai /root /tmp \
    && node --version \
    && python3 -c "import ephem; print(ephem.__version__)" \
    && test -f /opt/synthai/computer/backend/local-server.mjs

WORKDIR /opt/synthai

ENV HOME=/root
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
