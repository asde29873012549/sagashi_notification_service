# Use the official Node.js 20 image from Docker Hub
FROM node:lts-alpine3.18

# Create app directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Bundle app source inside Docker image
COPY . .

# Your app binds to port 8080 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 8000

# Define the command to run your app using CMD which defines your runtime
CMD [ "npm", "start" ]
