ARG PORT=4000

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates netcat-openbsd

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

EXPOSE ${PORT}

CMD ["yarn", "start:stg"]