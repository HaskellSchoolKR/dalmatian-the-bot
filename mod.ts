import { serve } from 'https://deno.land/std@0.159.0/http/mod.ts'
import { useEnvVar } from './useEnvVar.ts'
import { search } from './hoogle.ts'
import { validateRequest, json } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { verifySignature } from 'https://deno.land/x/discordeno@17.0.0/mod.ts';
import { outdent } from 'https://deno.land/x/outdent@v0.8.0/src/index.ts';

const port = parseInt(useEnvVar('PORT', 'Interaction endpoint port'))
const PUB_KEY = useEnvVar('PUB_KEY', 'Application public key')

async function pingHandler(): Promise<Response> {
  return json({ type: 1 })
}

async function hoogleCommandHandler(jsonBody: any): Promise<Response> {
  const { data: { options: [ { value: query } ] } } = jsonBody

  console.info(outdent`
    incoming query: ${query}
  `)

  const searchResult = await search(query)

  console.info(outdent`
    search result: ${JSON.stringify(searchResult)}
  `)

  if (searchResult.length === 0) return json({ type: 4, data: { content: 'no search result'} })

  return json({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: searchResult.map(
        def => ({
          title: def.item,
          description: def.docs,
          url: def.url,
          color: 16750592, // 0xFF9800, yellow
          author: {
            name: `${def.package.name}/${def.module.name}`
          }
        })
      ),
      "components": [
        {
          "type": 1,
          "components": [
            {
              "type": 2,
              "label": "Click me!",
              "style": 1,
              "custom_id": "click_one"
            }
          ]

        }
      ]
    }
  })
}

const handler = async (request: Request): Promise<Response> => {
  const { error } = await validateRequest(request, {
    POST: {
      headers: ["X-Signature-Ed25519", "X-Signature-Timestamp"],
    }
  })

  if (error)
    return json({ error: error.message }, { status: error.status })

  const signature = request.headers.get('X-Signature-Ed25519')!;
  const timestamp = request.headers.get('X-Signature-Timestamp')!;

  const { body, isValid } = verifySignature({
    publicKey: PUB_KEY,
    signature,
    timestamp,
    body: await request.text(),
  })

  if (!isValid) {
    return json({ error: 'Invalid request; could not verify the request' }, { status: 401 })
  }

  const jsonBody = JSON.parse(body)

  console.info(outdent`
    incoming json: ${body}
  `)

  if (request.method === 'POST' && jsonBody?.type === 1) return pingHandler()
  if (request.method === 'POST' && jsonBody?.type === 2 && jsonBody?.data?.name === 'hoogle') return hoogleCommandHandler(jsonBody)
  else return new Response('cannot interpret request', { status: 404 })
}

await serve(handler, { port, onListen: () => console.log(`HTTP webserver running on port ${port}`) })