import { execSync } from 'child_process';

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Error! There is no migration name.');
  process.exit(1);
}

const command = `typeorm-ts-node-commonjs migration:generate ./src/migrations/migrations/${migrationName} -d ./src/migrations/data-source.ts`;

try {
  execSync(command, { stdio: 'inherit' });
  console.log(`The migration: "${migrationName}" was successfully created`);
} catch (error) {
  console.error('Error:', error.message);
}
