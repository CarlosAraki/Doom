import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { authenticateUser, registerUser } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const isValid = await authenticateUser(input.email, input.password);
          if (!isValid) {
            throw new Error("Email ou senha inválidos");
          }
          
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, input.email, cookieOptions);
          
          return {
            success: true,
            email: input.email,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Erro ao fazer login");
        }
      }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        try {
          await registerUser(input.email, input.password);
          return {
            success: true,
            email: input.email,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Erro ao registrar usuário");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
