#!/bin/sh
set -e

mc alias set local http://minio:9000 minioadmin minioadmin123
mc mb local/messenger-files --ignore-existing
mc anonymous set download local/messenger-files

echo 'MinIO bucket [messenger-files] created and configured successfully'
echo 'CORS is configured via MINIO_API_CORS_ALLOW_ORIGIN on the minio service'
