# This is the base image for creating our image
# This is the builder image
FROM node:alpine  as builder

# This is changing the directory we are in
WORKDIR /app 

# This is copying the package.json and package-lock.json files to the /app directory
COPY package.json package-lock.json ./ 

# Installing needed packages for our application faster and more consistent
RUN npm ci 

# Copying the rest of the application files to the /app directory
COPY . . 

# Running the build command
RUN npm run build


# This is the base image for creating our image
FROM node:alpine  

# Creating a non-root group and user for security purposes
# similar to linux commands
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# This is changing the directory we are in
WORKDIR /app

# This is copying the package.json and package-lock.json files to the /app directory
COPY package.json package-lock.json ./
RUN npm ci --only-production


COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
# Files are owned by nodeuser immediately

# Switching to the non-root user
USER nodeuser

# Exposing the port our application runs on(labelling)
EXPOSE 3000 

#For many ports use this
# EXPOSE 3000 4000 5000 

#Running the application
CMD [ "node","dist/index.js" ]