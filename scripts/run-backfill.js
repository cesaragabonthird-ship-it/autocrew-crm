const fs = require('fs');
const path = require('path');
const { ConvexClient } = require('convex/browser');

// 1. Read NEXT_PUBLIC_CONVEX_URL from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let convexUrl = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/NEXT_PUBLIC_CONVEX_URL\s*=\s*(.*)/);
  if (match) {
    convexUrl = match[1].trim().replace(/['"]/g, '');
  }
}

if (!convexUrl) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

console.log("Connecting to Convex at:", convexUrl);

// 2. Initialize Convex Client and invoke migration
const client = new ConvexClient(convexUrl);
const tenantId = 'm170wrqvs14fre74q24ht0j4jd88d3kw';
const targetBranchName = 'DM Car Accessories - Davao';

async function run() {
  try {
    console.log(`Running backfill for tenant: ${tenantId}...`);
    // In Convex Node client, we import and call api.branches.backfillBranchNames
    // Since we don't have code-generated 'api' import in commonjs node directly,
    // we can pass the path as a string "branches:backfillBranchNames" or similar!
    // Let's use the raw string path identifier
    const count = await client.mutation('branches:backfillBranchNames', {
      tenantId,
      targetBranchName
    });
    console.log(`Migration complete! Successfully updated ${count} records to "${targetBranchName}".`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
