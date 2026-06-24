#!/bin/sh
set -e

mc alias set local http://minio:9000 minioadmin minioadmin123
mc mb local/myapp-files --ignore-existing
mc anonymous set download local/myapp-files

echo 'MinIO bucket [myapp-files] created and configured successfully'
echo 'CORS is configured via MINIO_API_CORS_ALLOW_ORIGIN on the minio service'
