import { serve } from 'https://deno.land/std@0.159.0/http/mod.ts'
import { useEnvVar } from './useEnvVar.ts'
import { search, SearchResult } from './hoogle.ts'
import { validateRequest, json } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { verifySignature } from 'https://deno.land/x/discordeno@17.0.0/mod.ts'
import { outdent } from 'https://deno.land/x/outdent@v0.8.0/src/index.ts'

const port = parseInt(useEnvVar('PORT', 'Interaction endpoint port'))
const PUB_KEY = useEnvVar('PUB_KEY', 'Application public key')

//@TODO: use sift's high level api

async function pingHandler(): Promise<Response> {
  return json({ type: 1 }) // ping
}

// 4 means CHANNEL_MESSAGE_WITH_SOURCE, 7 means UPDATE_MESSAGE
function hoogleSearchResultMessageTemplate(type: 4 | 7, query: string, index: number, searchResult: SearchResult) {
  return {
    type,
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
      components: [
        {
          type: 1, // action rows
          components: [
            {
              type: 2, // button
              label: 'previous',
              style: 1, // primary button
              custom_id: JSON.stringify({ type: 'prev', index, query }),
              disabled: index === 0
            },
            {
              type: 2, // button
              label: 'next',
              style: 1, // primary button
              custom_id: JSON.stringify({ type: 'next', index, query })
            }
          ]
        }
      ]
    }
  }
}

function createHoogleSearchResultMessage(query: string, searchResult: SearchResult) {
  return hoogleSearchResultMessageTemplate(4, query, 0, searchResult) // 4 means CHANNEL_MESSAGE_WITH_SOURCE
}

function updateHoogleSearchResultMessage(query: string, index: number, searchResult: SearchResult) {
  return hoogleSearchResultMessageTemplate(7, query, index, searchResult) // 7 means UPDATE_MESSAGE
}

async function hoogleCommandHandler(jsonBody: any): Promise<Response> {
  const { data: { options: [ { value: query } ] } } = jsonBody

  console.info(outdent`
    now processing query '${query}'
  `)

  try {
    const searchResult = await search(query)

    console.info(outdent`
      result searching query '${query}': 
      ${JSON.stringify(searchResult)}
    `)

    //@TODO add delete button
    if (searchResult.length === 0)
      // 4 means CHANNEL_MESSAGE_WITH_SOURCE
      return json({ type: 4, data: { content: `cannot find any definition for query '${query}'.`} })

    return json(createHoogleSearchResultMessage(query, searchResult))
  } catch (e) {
    console.error(outdent`
      an error has occurred while handling '/hoogle' command.
      
      error message:
      ${e.message}
      
      request's body:
      ${JSON.stringify(jsonBody)}
    `)

    return new Response('internal error', { status: 500 })
  }
}

//@TODO filter invalid action
async function hoogleCommandActionHandler(jsonBody: any): Promise<Response> {
  const { data: { custom_id: action } } = jsonBody

  try {
    const { type, index, query } = JSON.parse(action)
    const nextIndex = type === 'prev' ? index - 1 : index + 1
    const searchResult = await search(query, { start: nextIndex })

    console.info(outdent`
      result searching query '${query}': 
      ${JSON.stringify(searchResult)}
    `)

    if (searchResult.length === 0)
      // 4 means CHANNEL_MESSAGE_WITH_SOURCE
      return json({ type: 4, data: { content: `no more definition for query '${query}' found.`} })

    return json(updateHoogleSearchResultMessage(query, nextIndex, searchResult))
  } catch (e) {
    //@TODO: log precise action name
    console.error(outdent`
      an error has occurred while handling '/hoogle' command's action.
      
      error message:
      ${e.message}
      
      request's body:
      ${JSON.stringify(jsonBody)}
    `)

    return new Response('internal error', { status: 500 })
  }
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
  // existence of both are guaranteed by 'validateRequest' call

  const { body, isValid } = verifySignature({
    publicKey: PUB_KEY,
    signature,
    timestamp,
    body: await request.text(),
  }) // code from disordeno example. related with disord's credential requirements

  if (!isValid)
    return json({ error: 'Invalid request. could not verify the request' }, { status: 401 })

  try {
    const parsedBody = JSON.parse(body)

    console.info(outdent`
      request validation process succeed; now processing:
      
      ${body}
    `)

    //@TODO use schema to validate json
    if (parsedBody?.type === 1) return pingHandler()
    if (parsedBody?.type === 2 && parsedBody?.data?.name === 'hoogle') return hoogleCommandHandler(parsedBody)
    if (parsedBody?.type == 3) return hoogleCommandActionHandler(parsedBody)
    else return new Response('could not find proper handler for request', { status: 404 })
  } catch (e) {
    console.error(`
      an error has occurred while handling request:
      ${e.message}
    `)

    return new Response('internal error', { status: 500 })
  }
}

await serve(handler, { port, onListen: () => console.info(`Dalmatian-the-bot is running on port ${port} 🐶`) })