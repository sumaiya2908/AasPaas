import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Seed = GeoNames-derived canonical cities import.
 * Experience content (moments) still keyed by stable slugs: jaipur, goa, kochi, hampi.
 */
async function main() {
  const script = path.join(__dirname, '../scripts/import-geonames.ts');
  console.log('Seeding canonical cities via GeoNames import…');
  execSync(`npx ts-node "${script}"`, { stdio: 'inherit' });

  const active = await prisma.city.count({ where: { status: 'ACTIVE' } });
  console.log(`Active cities ready: ${active}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
