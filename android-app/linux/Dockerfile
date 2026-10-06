# Frontend output is architecture-independent. Run Vite/npm on the builder
# rather than emulating ARM64 native install scripts under QEMU.
FROM --platform=$BUILDPLATFORM node:22-alpine3.22 AS resonance-frontend
WORKDIR /build
COPY computer/donors/resonance-network/frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY computer/donors/resonance-network/frontend ./
RUN npm run build

FROM node:22-alpine3.22

RUN apk add --no-cache \
    ca-certificates \
    python3 \
    py3-ephem \
    py3-pip \
    tzdata

COPY computer /opt/synthai/computer
COPY computer/donors/resonance-network /opt/resonance
COPY --from=resonance-frontend /build/dist /opt/resonance/frontend/dist
RUN apk add --no-cache py3-numpy \
    && python3 -m venv --system-site-packages /opt/resonance-venv \
    && /opt/resonance-venv/bin/pip install --no-cache-dir -r /opt/resonance/backend/requirements.txt \
    && rm -rf /opt/synthai/computer/donors/resonance-network


# Embedded Synthia Server (checked out by CI at a pinned SHA into ./synthia-server).
# Only the lite Node bus and the Python API run on the phone, so heavy/native
# Node deps that lite.js never loads are dropped before install.
COPY synthia-server /opt/synthia-server

RUN cd /opt/synthia-server \
    && node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));for(const d of ['onnxruntime-node','exceljs','pdf-parse','mammoth','@supabase/supabase-js','socket.io','simple-git','jszip','multer','node-cron','ws'])delete (p.dependencies||{})[d];delete p.devDependencies;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')" \
    && npm install --omit=dev --no-audit --no-fund --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /root/.npm /tmp/*

RUN cd /opt/synthia-server \
    && ( pip install --break-system-packages --no-cache-dir --prefer-binary -r requirements-mobile.txt \
         || ( echo "pip wheels unavailable; falling back to Alpine packages" \
              && apk add --no-cache py3-fastapi py3-uvicorn py3-httpx py3-python-multipart \
              && pip install --break-system-packages --no-cache-dir --prefer-binary 'sse-starlette>=2.0.0' 'mcp>=1.0.0,<2' ) ) \
    && rm -rf /root/.cache/pip /tmp/*

RUN mkdir -p /var/lib/synthai /root /tmp \
    && node --version \
    && python3 -c "import ephem; print(ephem.__version__)" \
    && test -f /opt/synthai/computer/backend/local-server.mjs \
    && test -f /opt/synthai/computer/backend/synthia-supervisor.mjs \
    && test -f /opt/synthia-server/server/lite.js \
    && test -f /opt/synthia-server/server/computer-github-routes.js \
    && test -f /opt/synthia-server/render-server.py \
    && test -f /opt/synthia-server/server.py \
    && python3 -c 'import fastapi, uvicorn, sse_starlette, httpx; print("synthia python deps ok")' \
    && (python3 -c 'import mcp.server.fastmcp; print("mcp ok")' || echo "WARN: python mcp unavailable; Trident python MCP disabled") \
    && cd /opt/synthia-server \
    && DATA_DIR=/tmp/synthia-import-check python3 -c 'import server; print("synthia server.py imports ok")' \
    && rm -rf /tmp/synthia-import-check /opt/synthia-server/__pycache__ /opt/synthia-server/data \
    && node -e "require('express');require('cors');require('helmet');require('compression');require('express-rate-limit');require('dotenv');require('./server/computer-github-routes');console.log('synthia node deps ok')"

WORKDIR /opt/synthai

ENV HOME=/root
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
