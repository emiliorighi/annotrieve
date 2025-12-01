FROM node:22-alpine AS builder

WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build


FROM nginx:stable-alpine

COPY --from=builder /app/out /usr/share/nginx/html/annotrieve
COPY subpath.template /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]