import { withAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';

export const GET = withAuth(async (_request, auth) => {
  const db = await getDb();
  const user = await db.getRepository(User).findOne({ where: { id: auth.userId } });

  if (!user) {
    return Response.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
  }

  const { password_hash: _, ...userWithoutPassword } = user;
  return Response.json(userWithoutPassword);
});
