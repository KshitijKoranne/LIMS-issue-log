import { applySchema } from "../lib/db";

async function main() {
  const count = await applySchema();

  console.log(`Applied ${count} schema statements.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
