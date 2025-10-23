#!/bin/sh

echo "⏳ Waiting for blockchain to be ready..."
until curl -s http://blockchain:8545 > /dev/null; do
  echo "📡 Blockchain not ready yet - sleeping 5 seconds..."
  sleep 5
done

echo "✅ Blockchain is ready!"

# Check if contract is already deployed
if [ -f "../deployments/local.json" ]; then
    echo "📄 Contract already deployed, skipping deployment..."
else
    echo "🚀 Deploying smart contract..."
    npx hardhat run scripts/deploy.js --network local
fi

echo "🔗 Keeping container alive..."
tail -f /dev/null