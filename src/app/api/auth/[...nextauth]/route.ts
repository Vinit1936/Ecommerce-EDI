/** NextAuth v5 catch-all route. Session/signin/signout/csrf all land here. */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
