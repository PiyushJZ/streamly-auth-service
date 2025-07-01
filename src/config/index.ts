import { z } from 'zod';
import { envSchema } from '@lib/config';

export const configuration = () => ({
  ...process.env,
});

export type ConfigType = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, string>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors,
    );
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}
