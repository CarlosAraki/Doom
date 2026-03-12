import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { authenticateUser, registerUser, saveGameScore, getTopScores, getUserBestScore } from "./db";

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
          ctx.res.cookie(COOKIE_NAME, JSON.stringify({ email: input.email }), cookieOptions);
          
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
  scores: router({
    save: protectedProcedure
      .input(z.object({
        score: z.number().int().positive(),
        gameMode: z.string().default("singleplayer"),
        enemiesKilled: z.number().int().default(0),
        timePlayedSeconds: z.number().int().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          if (!ctx.user) {
            throw new Error("User not authenticated");
          }
          
          await saveGameScore({
            userId: ctx.user.id,
            score: input.score,
            gameMode: input.gameMode,
            enemiesKilled: input.enemiesKilled,
            timePlayedSeconds: input.timePlayedSeconds,
          });
          
          return { success: true };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Erro ao salvar score");
        }
      }),
    getLeaderboard: publicProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(100).default(10),
      }))
      .query(async ({ input }) => {
        try {
          const scores = await getTopScores(input.limit);
          return scores;
        } catch (error) {
          console.error("Error getting leaderboard:", error);
          return [];
        }
      }),
    getUserBest: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          if (!ctx.user) {
            return null;
          }
          
          const bestScore = await getUserBestScore(ctx.user.id);
          return bestScore;
        } catch (error) {
          console.error("Error getting user best score:", error);
          return null;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
