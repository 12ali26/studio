import { stackServerApp } from '@/stack';

export async function getStackUser(request: Request) {
  try {
    const user = await stackServerApp.getUser({ request });
    return user;
  } catch (error) {
    console.error('Error getting Stack user:', error);
    return null;
  }
}

export async function requireStackUser(request: Request) {
  const user = await getStackUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}