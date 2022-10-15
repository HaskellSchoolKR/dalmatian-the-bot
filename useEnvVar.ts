import { outdent } from 'https://deno.land/x/outdent@v0.8.0/src/index.ts';

export function useEnvVar(key: string, usage?: string): string {
  const variable = Deno.env.get(key)

  if (variable === undefined)
    throw new Error(outdent`
      ${usage ?? `'${key}'`} is not registered, please define environment variable '${key}'
    `)

  return variable
}