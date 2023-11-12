# Use the official Node.js 14 image as the base image
FROM node:21

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the dependencies
RUN npm install --force

# Copy the index.js file to the container
COPY index.js .

# Specify the command to run when the container starts
CMD [ "node", "index.js" ]

