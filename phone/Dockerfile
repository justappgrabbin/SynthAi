FROM node:22-bookworm-slim AS javascript
WORKDIR /build
COPY web/package*.json web/
RUN npm ci --prefix web
COPY web web
RUN npm run build --prefix web
COPY runtimes/isohuman/package*.json runtimes/isohuman/
RUN npm ci --ignore-scripts --prefix runtimes/isohuman
COPY runtimes/isohuman runtimes/isohuman
RUN npm run build --prefix runtimes/isohuman
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY --from=javascript /usr/local/bin/node /usr/local/bin/node
COPY requirements-web.txt .
RUN pip install --no-cache-dir -r requirements-web.txt
COPY . .
COPY --from=javascript /build/web/dist web/dist
COPY --from=javascript /build/runtimes/isohuman/dist runtimes/isohuman/dist
COPY --from=javascript /build/runtimes/isohuman/node_modules runtimes/isohuman/node_modules
RUN useradd --uid 10001 --create-home synthia && mkdir -p /app/data && chown -R synthia:synthia /app
USER synthia
EXPOSE 8000
VOLUME ["/app/data"]
CMD ["python", "run_app.py"]
