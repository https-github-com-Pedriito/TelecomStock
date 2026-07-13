import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { withAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';

export const PUT = withAuth(async (request: NextRequest, auth) => {
  const { oldPassword, newPassword } = await request.json();
  if (!oldPassword || !newPassword) {
    return Response.json({ message: 'Ancien et nouveau mot de passe requis' }, { status: 400 });
  }

  const db = await getDb();
  const repo = db.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.userId } });

  if (!user) {
    return Response.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
  }

  const valid = await bcryptjs.compare(oldPassword, user.password_hash);
  if (!valid) {
    return Response.json({ message: 'Mot de passe actuel incorrect' }, { status: 401 });
  }

  user.password_hash = await bcryptjs.hash(newPassword, 10);
  await repo.save(user);

  return Response.json({ message: 'Mot de passe modifié avec succès' });
});
