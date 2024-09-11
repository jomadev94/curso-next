import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Solo estoy usando Credentials provider, aunque en la documentacion
  // de NextAuth podemos implementar otros providers como OAuth o email.
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validacion de los datos de entrada
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          // Chequeo si existe el usuario
          const user = await getUser(email);
          if (!user) return null;
          // Comparo las contraseña ingresada con la que se encuentra en la bd.
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        // Usuario invalido
        return null;
      },
    }),
  ],
});
