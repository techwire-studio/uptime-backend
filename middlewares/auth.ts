import { auth } from '@/services/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { RequestHandler } from 'express';

export const authenticationMiddleware: RequestHandler = async (
  request,
  response,
  next
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  request.userId = session?.user.id as string;
  request.email = session?.user.email as string;

  if (!session || !session.user) {
    response.status(401).json({ error: 'Unauthorized user' });
    return;
  }

  next();
};
