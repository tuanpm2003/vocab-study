# syntax=docker/dockerfile:1
# Ba image từ một file:
#   --target runtime  (mặc định)  chạy API, chỉ có dependency production
#   --target migrate              chạy `prisma migrate deploy`, cần Prisma CLI (devDependency)

FROM node:22-alpine AS deps
WORKDIR /app
# postinstall chạy `prisma generate`, nên schema và config phải có mặt TRƯỚC `npm ci`.
# tsconfig.json cũng vậy: thiếu nó, Prisma sinh import đuôi ".ts" thay vì ".js" và app
# biên dịch xong sẽ chết lúc khởi động với ERR_MODULE_NOT_FOUND.
COPY package.json package-lock.json prisma7.config.ts tsconfig.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM deps AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: postinstall gọi Prisma CLI, thứ không có khi bỏ devDependencies.
# Prisma Client đã được biên dịch vào dist/generated ở stage build.
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/main.js"]
