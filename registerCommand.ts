const APP_ID = Deno.env.get('APP_ID')
const BOT_TOKEN = Deno.env.get('BOT_TOKEN')

if (!APP_ID) throw new Error(`Application id is not registered, please define environment variable 'APP_ID`)
if (!BOT_TOKEN) throw new Error(`Bot token is not registered, please define environment variable 'BOT_TOKEN'`)

const createCommandOption = {
  name: 'hoogle',
  description: 'search in hoogle',
  options: [
    {
      name: 'query',
      description: 'search for ...',
      type: 3, // string
      required: true
    }
  ]
}

const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(createCommandOption)
})

console.log(await response.json())