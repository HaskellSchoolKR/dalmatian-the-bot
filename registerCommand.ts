import { useEnvVar } from './useEnvVar.ts'

const APP_ID = useEnvVar('APP_ID', 'Application id')
const BOT_TOKEN = useEnvVar('BOT_TOKEN', 'Bot token')

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

console.dir(await response.json())