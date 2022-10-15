export function useEnvVar(key: string, usage: string = key): string {
  const variable = Deno.env.get(key)

  if (variable === undefined)
    throw new Error(`${usage} is not registered, please define environment variable '${key}'`)

  return variable
}