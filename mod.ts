import { serve } from 'https://deno.land/std@0.159.0/http/mod.ts'
import { useEnvVar } from './useEnvVar.ts'
import { search } from './hoogle.ts'
import { validateRequest } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { verifySignature } from 'https://deno.land/x/discordeno@17.0.0/mod.ts';

const port = parseInt(useEnvVar('PORT', 'Interaction endpoint port'))
const PUB_KEY = useEnvVar('PUB_KEY', 'Application public key')

async function pingHandler(_: Request): Promise<Response> {
  return new Response(JSON.stringify({ type: 1 }), { status: 200 })
}

async function hoogleCommandHandler(request: Request): Promise<Response> {
  const { data: { options: [ { value: query } ] } } = await request.json()
  const searchResult = await search(query)

  return new Response(
    JSON.stringify({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        embeds: searchResult.map(
          def => ({
            title: def.item,
            description: def.docs,
            url: def.url,
            color: 16750592, // 0xFF9800, yellow
            author: `${def.package}/${def.module}`
          })
        )
      }
    }),
    { status: 200 }
  )
}

const handler = async (request: Request): Promise<Response> => {
  const { error } = await validateRequest(request, {
    POST: {
      headers: ["X-Signature-Ed25519", "X-Signature-Timestamp"],
    }
  })

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: error.status })

  const signature = request.headers.get('X-Signature-Ed25519')!;
  const timestamp = request.headers.get('X-Signature-Timestamp')!;

  const { isValid } = verifySignature({
    publicKey: PUB_KEY,
    signature,
    timestamp,
    body: await request.text(),
  })

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid request; could not verify the request' }),
      { status: 401 }
    )
  }

  const jsonBody = await request.json()

  if (request.method === 'POST' && jsonBody?.type === 1) return pingHandler(request)
  if (request.method === 'POST' && jsonBody?.type === 2 && jsonBody?.data?.name === 'hoogle') return hoogleCommandHandler(request)
  else return new Response('cannot interpret request', { status: 404 })
}

await serve(handler, { port, onListen: () => console.log(`HTTP webserver running on port ${port}`) })