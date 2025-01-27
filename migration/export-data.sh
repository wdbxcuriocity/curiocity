#!/bin/bash

# Load environment variables
source .env

# Create data directory if it doesn't exist
mkdir -p migration/data

# Export DynamoDB tables
echo "Exporting Documents table..."
aws dynamodb scan \
  --table-name ${DOCUMENT_TABLE} \
  --output json > migration/data/documents.json

echo "Exporting Resources table..."
aws dynamodb scan \
  --table-name ${RESOURCE_TABLE} \
  --output json > migration/data/resources.json

echo "Exporting ResourceMeta table..."
aws dynamodb scan \
  --table-name ${RESOURCEMETA_TABLE} \
  --output json > migration/data/resource_meta.json

echo "Exporting Users table..."
aws dynamodb scan \
  --table-name ${USER_TABLE_NAME} \
  --output json > migration/data/users.json

echo "Exporting LocalLoginUsers table..."
aws dynamodb scan \
  --table-name "curiocity-local-login-users" \
  --output json > migration/data/local_login_users.json

echo "Export complete!" 