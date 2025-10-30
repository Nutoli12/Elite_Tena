#!/bin/sh

echo "‚è≥ Waiting for blockchain to be ready..."
# Use nc (netcat) instead of curl since it's available in alpine
until nc -z blockchain 8545; do
  echo "Ì¥Ñ Blockchain not ready yet - sleeping 5 seconds..."
  sleep 5
done

echo "‚úÖ Blockchain is ready!"
