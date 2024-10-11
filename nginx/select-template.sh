#!/bin/sh

# Print the value of BASE_PATH for debugging
echo "BASE_PATH is: $BASE_PATH"

if [ -z "$BASE_PATH" ]; then
    echo "BASE_PATH is empty or not set. Using root.template."
    cp /etc/nginx/templates/root.template /etc/nginx/templates/default.conf.template
else
    echo "BASE_PATH is set to: $BASE_PATH. Using subpath.template."
    cp /etc/nginx/templates/subpath.template /etc/nginx/templates/default.conf.template
fi
