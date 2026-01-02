import { env } from '@/configs/env';
import {
  createWorkspaceWithMembers,
  deleteUserAndRelatedData
} from '@/controllers/workspace';
import prisma from '@/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { sendEmailForVerification } from '@/services/mailer';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BASE_URL,
  trustedOrigins: [env.CLIENT_URL],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/sign-up')) {
        const session = ctx.context.newSession;
        if (session) {
          await createWorkspaceWithMembers({
            name: 'Workspace 1',
            ownerId: session?.user.id as string,
            userIds: [session?.user.id] as string[]
          });
        }
      }
    })
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, token }) {
      await sendEmailForVerification(user.email, token);
    }
  },
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => deleteUserAndRelatedData(user.id)
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignInAfterVerification: true
  }
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// requireEmailVerification: true, // Only if you want to block login completely
// async sendResetPassword({ user, url }) {
//   await sendEmail({
//     to: user.email,
//     subject: 'Reset your password',
//     text: `Click the link to reset your password: ${url}`
//   });
// }
//   socialProviders: {
//     google: {
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!
//     },
//     github: {
//       clientId: process.env.GITHUB_CLIENT_ID!,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET!
//     }
//   },
//   emailVerification: {
//     sendOnSignUp: true,
//     autoSignInAfterVerification: true,
//     async sendVerificationEmail({ user, url }) {
//       await sendEmail({
//         to: user.email,
//         subject: 'Verify your email',
//         text: `Click the link to verify your email: ${url}`
//       });
//     }
//   },
//   user: {
//     changeEmail: {
//       enabled: true,
//       async sendChangeEmailVerification({ user, newEmail, url }) {
//         await sendEmail({
//           to: user.email,
//           subject: 'Approve email change',
//           text: `Your email has been changed to ${newEmail}. Click the link to approve the change: ${url}`
//         });
//       }
//     },
//     additionalFields: {
//       role: {
//         type: 'string',
//         input: false
//       }
//     }
//   },
//   hooks: {
//     before: createAuthMiddleware(async (ctx) => {
//       if (
//         ctx.path === '/sign-up/email' ||
//         ctx.path === '/reset-password' ||
//         ctx.path === '/change-password'
//       ) {
//         const password = ctx.body.password || ctx.body.newPassword;
//         const { error } = passwordSchema.safeParse(password);
//         if (error) {
//           throw new APIError('BAD_REQUEST', {
//             message: 'Password not strong enough'
//           });
//         }
//       }
//     })
//   }
