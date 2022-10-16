import { serve } from 'https://deno.land/std@0.159.0/http/mod.ts'
import { useEnvVar } from './useEnvVar.ts'
import { search, SearchResult } from './hoogle.ts'
import { setDiscordFormat } from './format.ts'
import { validateRequest, json } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { verifySignature } from 'https://deno.land/x/discordeno@17.0.0/mod.ts'
import { outdent } from 'https://deno.land/x/outdent@v0.8.0/src/index.ts'

const port = parseInt(useEnvVar('PORT', 'Interaction endpoint port'))
const PUB_KEY = useEnvVar('PUB_KEY', 'Application public key')
const BOT_TOKEN = useEnvVar('BOT_TOKEN', 'Bot token')

//@TODO: use sift's high level api

async function pingHandler(): Promise<Response> {
  return json({ type: 1 }) // ping
}

// 4 means CHANNEL_MESSAGE_WITH_SOURCE, 7 means UPDATE_MESSAGE
function hoogleSearchResultMessageTemplate(type: 4 | 7, query: string, index: number, origin: string, searchResult: SearchResult) {
  return {
    type,
    data: {
      embeds: searchResult.map(
        def => ({
          title: def.item,
          description: setDiscordFormat(def.docs),
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
              custom_id: JSON.stringify({ type: 'prev', index, query, origin }),
              disabled: index === 0
            },
            {
              type: 2, // button
              label: 'next',
              style: 1, // primary button
              custom_id: JSON.stringify({ type: 'next', index, query, origin })
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              label: 'remove',
              style: 4, // danger button
              custom_id: JSON.stringify({ type: 'remove', index, query, origin }),
            }
          ]
        }
      ]
    }
  }
}

function createHoogleSearchResultMessage(query: string, origin: string, searchResult: SearchResult) {
  return hoogleSearchResultMessageTemplate(4, query, 0, origin, searchResult) // 4 means CHANNEL_MESSAGE_WITH_SOURCE
}

function updateHoogleSearchResultMessage(query: string, index: number, origin: string, searchResult: SearchResult) {
  return hoogleSearchResultMessageTemplate(7, query, index, origin, searchResult) // 7 means UPDATE_MESSAGE
}

async function hoogleCommandHandler(jsonBody: any): Promise<Response> {
  const { data: { options: [ { value: query } ] }, member: { user: { id } } } = jsonBody

  console.info(outdent`
    now processing query '${query}'
  `)

  try {
    const searchResult = await search(query)

    console.info(outdent`
      result searching query '${query}': 
      ${JSON.stringify(searchResult)}
    `)

    if (searchResult.length === 0)
      // 4 means CHANNEL_MESSAGE_WITH_SOURCE
      return json({ type: 4, data: { content: `cannot find any definition for query '${query}'.`} })

    return json(createHoogleSearchResultMessage(query, id, searchResult))
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
  const { data: { custom_id: action }, member: { user: { id } } } = jsonBody

  // if (user_id !== author_id) {
  //   return new Response('user and author is not equal', { status: 404 })
  // }

  try {
    const { type, index, query, origin } = JSON.parse(action)

    console.info(`
      received action request from '${id}' for '${origin}'
    `)

    if (origin !== id) throw new Error(`Not a owner`)

    if (type === "prev" || type === "next") {
      const nextIndex = type === 'prev' ? index - 1 : index + 1
      const searchResult = await search(query, { start: nextIndex })

      console.info(outdent`
        result searching query '${query}': 
        ${JSON.stringify(searchResult)}
      `)

      if (searchResult.length === 0)
        // 7 means UPDATE_MESSAGE
        return json({ type: 7, data: { content: `no more definition for query '${query}' found.`} })

      return json(updateHoogleSearchResultMessage(query, nextIndex, origin, searchResult))
    }
    if (type === "remove") {
      const { channel_id, message: { id } } = jsonBody

      console.info((await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bot ${BOT_TOKEN}`,
        }
      })).status)

      //dummy response, will be ignored.
      return json({ type: 6 })
    }
    return new Response('Button Interaction error', { status: 500 })
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
  }) // code from disordeno example. related to disord's credential requirements

  if (!isValid)
    return json({ error: 'Invalid request. could not verify the request' }, { status: 401 })

  try {
    const parsedBody = JSON.parse(body)

    console.info(outdent`
      request validation process succeed; now processing:
      
      ${body}
    `)

    //@TODO use schema to validate json
    if (parsedBody?.type === 1)
      return pingHandler()
    if (parsedBody?.type === 2 && parsedBody?.data?.name === 'hoogle')
      return hoogleCommandHandler(parsedBody)
    if (parsedBody?.type === 3)
      return hoogleCommandActionHandler(parsedBody)
    return new Response('could not find proper handler for request', { status: 404 })
  } catch (e) {
    console.error(`
      an error has occurred while handling request:
      ${e.message}
    `)

    return new Response('internal error', { status: 500 })
  }
}

await serve(handler, { port, onListen: () => console.info(`Dalmatian-the-bot is running on port ${port} 🐶`) })