# Build stage
FROM node:lts-alpine as build
WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
COPY . .

RUN npm i --silent
RUN npm run build

# Production stage
FROM nginx:stable-alpine as production
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
