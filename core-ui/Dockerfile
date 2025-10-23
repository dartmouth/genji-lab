FROM node:lts-alpine as build
RUN apk update && apk upgrade
RUN rm -rf /var/cache/apk/*
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install @types/node
COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk update && apk upgrade
RUN rm -rf /var/cache/apk/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]