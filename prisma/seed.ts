import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // No seed data yet — environment scaffolding only.
  console.log('Seed: nothing to seed yet.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
