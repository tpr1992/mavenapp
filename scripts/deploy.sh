#!/bin/bash
set -e

# Usage: ./scripts/deploy.sh "commit message"

MSG="$1"
if [ -z "$MSG" ]; then
  echo "Usage: ./scripts/deploy.sh \"commit message\""
  exit 1
fi

echo "→ Committing..."
git add -A
git commit -m "$MSG"

echo "→ Pushing to dev..."
git push origin dev

echo "→ Creating PR..."
PR_URL=$(gh pr create --title "$MSG" --body "" --base main --head dev 2>&1)
PR_NUM=$(echo "$PR_URL" | grep -o '[0-9]*$')
echo "  PR #$PR_NUM created"

echo "→ Merging PR #$PR_NUM (rebase)..."
gh pr merge "$PR_NUM" --rebase

echo "→ Syncing dev with main..."
git pull origin main --rebase
git push origin dev --force-with-lease

echo "✓ Deployed! Vercel will pick up the changes on main."
