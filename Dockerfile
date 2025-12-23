FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
ENV LANG C.UTF-8
RUN npx playwright install --with-deps chromium
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
