
# FROM node:lts-alpine

# # install simple http server for serving static content
# RUN npm install -g serve


# # make the 'app' folder the current working directory
# WORKDIR /app

# # copy both 'package.json' and 'package-lock.json' (if available)
# COPY package*.json ./

# # install project dependencies
# RUN npm install 
# RUN npm install -D @types/node

# # copy project files and folders to the current working directory (i.e. 'app' folder)
# COPY . .

# # build app for production with minification
# RUN npm run build

# EXPOSE 5173
# CMD [ "serve", "-s", "dist", "-l", "5173"]

FROM node:lts-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install @types/node
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]