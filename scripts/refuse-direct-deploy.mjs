#!/usr/bin/env node
// Match CFLab's release policy: a local convenience command must not publish.
console.error(`Production releases are published by GitHub Actions.

  git push origin main -> validate -> deploy -> verify the committed revision

npm run deploy deliberately refuses to publish. Push a reviewed commit to main;
GitHub Actions installs dependencies, runs all required checks, and deploys only
if validation succeeds. Pull requests validate without deploying.

Validate locally: npm run test:all
Check production: EXPECTED_COMMIT=<full Git SHA> npm run verify:production
Runbook: docs/DEPLOYMENT.md
`);
process.exitCode = 1;
