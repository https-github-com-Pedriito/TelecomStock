import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { sendPasswordResetRequestEmail } from '@/lib/mailer';
import { User } from '@/entities/User';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ message: 'Email requis' }, { status: 400 });
    }

    const db = await getDb();
    const repo = db.getRepository(User);
    const user = await repo.findOne({ where: { email } });

    if (user) {
      user.reset_requested_at = new Date();
      await repo.save(user);
      try {
        await sendPasswordResetRequestEmail(user.email);
      } catch (emailErr) {
        console.error('Erreur envoi email reset:', emailErr);
      }
    }

    return Response.json({
      message: 'Si ce compte existe, une demande a été transmise à votre administrateur.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
