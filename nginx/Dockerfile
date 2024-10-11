FROM nginx:stable-alpine

WORKDIR /nginx

ARG BASE_PATH
# Copy the nginx templates
COPY root.template /etc/nginx/templates/root.template

COPY subpath.template /etc/nginx/templates/subpath.template
# Copy the script
COPY select-template.sh /usr/local/bin/select-template.sh

RUN chmod +x /usr/local/bin/select-template.sh
# Set the config file based on the build argument
RUN /usr/local/bin/select-template.sh

CMD ["nginx", "-g", "daemon off;"]
