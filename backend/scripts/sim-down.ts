/**
 * Wipe all simulated demo users and their cascaded data.
 * Also removes RAG chunks that came from simulated posts.
 *
 * Usage:
 *   npm run sim:down
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { isSimulated: true },
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('sim:down — no simulated users found.');
    return;
  }

  const userIds = users.map((u) => u.id);
  console.log(`sim:down — removing ${userIds.length} simulated users…`);

  const posts = await prisma.post.findMany({
    where: { authorId: { in: userIds } },
    select: { id: true },
  });
  const postIds = posts.map((p) => p.id);

  if (postIds.length > 0) {
    // RagChunk sourceId format: post:{id}
    const sourceIds = postIds.map((id) => `post:${id}`);
    const deletedChunks = await prisma.ragChunk.deleteMany({
      where: {
        sourceId: { in: sourceIds },
      },
    });
    console.log(`Removed ${deletedChunks.count} RAG chunks from sim posts`);
  }

  // Stories / posts / saves / profiles cascade from User
  const deletedUsers = await prisma.user.deleteMany({
    where: { isSimulated: true },
  });

  console.log(
    JSON.stringify(
      {
        deletedUsers: deletedUsers.count,
        deletedPosts: postIds.length,
        tag: 'User.isSimulated=true',
      },
      null,
      2,
    ),
  );
  console.log('sim:down complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
