#!/bin/bash

# Function to convert DynamoDB JSON to SQL INSERT statements
convert_to_sql() {
  local input_file=$1
  local table_name=$2
  
  echo "Converting $input_file to SQL for table $table_name..."
  
  # Use jq to parse JSON and convert to SQL
  jq -r '.Items[] | to_entries | map(.key + "=" + (.value | tostring)) | join(", ")' "$input_file" | \
  while read -r line; do
    # Clean up DynamoDB types (S, N, etc)
    cleaned=$(echo "$line" | sed -E 's/\{[SN]:"([^"]*)"\}/\1/g' | sed 's/\{L:\[\]\}/\[\]/g' | sed 's/\{M:\{\}\}/{}/g')
    echo "INSERT INTO $table_name ($cleaned);"
  done
}

# Process each table
convert_to_sql "migration/data/documents.json" "Documents" > "migration/data/documents.sql"
convert_to_sql "migration/data/resources.json" "Resources" > "migration/data/resources.sql"
convert_to_sql "migration/data/resource_meta.json" "ResourceMeta" > "migration/data/resource_meta.sql"
convert_to_sql "migration/data/users.json" "Users" > "migration/data/users.sql"
convert_to_sql "migration/data/local_login_users.json" "LocalLoginUsers" > "migration/data/local_login_users.sql"

echo "Conversion complete!" 