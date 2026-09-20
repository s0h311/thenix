FROM node:26-alpine3.24

WORKDIR /app

RUN npm i -g corepack

RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
RUN pnpm install -y

COPY . .

RUN pnpm build

RUN chmod +x start.sh

CMD ["./start.sh"]