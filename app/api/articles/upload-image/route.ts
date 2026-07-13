import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { UserRole } from '@/entities/User';

export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  requireTenant(auth);

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) return Response.json({ message: 'Service upload non configuré' }, { status: 502 });

  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) return Response.json({ message: 'Aucune image fournie' }, { status: 400 });
  if (!file.type.startsWith('image/')) return Response.json({ message: 'Fichier non supporté' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ message: 'Image trop volumineuse (max 5 Mo)' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  const body = new URLSearchParams();
  body.append('image', base64);

  const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body,
  });

  if (!imgbbResponse.ok) {
    console.error('Échec upload ImgBB:', imgbbResponse.status);
    return Response.json({ message: "Échec de l'upload" }, { status: 502 });
  }

  const data = await imgbbResponse.json();
  return Response.json({ url: data.data.url });
});
