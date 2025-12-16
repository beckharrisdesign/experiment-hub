#!/bin/bash

# Test Acceptance Script
# Run this as part of your commit workflow or CI pipeline

set -e

echo "🧪 Running acceptance tests..."
echo ""

# Run tests with CI settings
npm run test:ci

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ All tests passed!"
  exit 0
else
  echo ""
  echo "❌ Tests failed. Please fix issues before committing."
  exit 1
fi

