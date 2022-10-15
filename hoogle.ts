import { Schema, validate } from 'https://deno.land/x/jtd@v0.1.0/mod.ts'
import outdent from 'http://deno.land/x/outdent@v0.8.0/mod.ts'
import { useEnvVar } from './useEnvVar.ts'

interface SearchOptions {
  start?: string
  count?: string
}

type SearchResult = Array<{
  url: string
  module: {
    name: string
    url: string
  }
  package: {
    name: string
    url: string
  }
  item: string
  docs: string
}> // useless 'type' field is ignored.

const searchResultSchema = {
  elements: {
    properties: {
      url: { type: 'string '},
      module: {
        properties: {
          name: { type: 'string '},
          url: { type: 'string' }
        }
      },
      package: {
        properties: {
          name: { type: 'string '},
          url: { type: 'string' }
        }
      },
      item: { type: 'string' },
      docs: { type: 'string '},
      type: { type: 'string' } // I don't know why this field is present in API, but it exists.
    }
  }
} as Schema

const HOOGLE = useEnvVar('HOOGLE', 'Hoogle domain name')

export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const completedOptions = { start: '1', count: '1', ...options }
  const queryParams = new URLSearchParams({
    mode: 'json',
    format: 'text',
    hoogle: query,
    ...completedOptions
  })

  const apiResponse = await (await fetch(`https://${HOOGLE}?${queryParams}`)).text()
  const apiJSONResponse = JSON.parse(apiResponse)
  const schemaViolations = validate(searchResultSchema, apiJSONResponse)

  if (schemaViolations.length > 0) {
    const formattedViolations = schemaViolations.map(
      ({ instancePath, schemaPath }) => outdent`
         'apiJSONResponse.${instancePath.join('.')}' violates schema '${schemaPath.join('.')}'
       `
    ).join('\n')
    const errorMessage = outdent`
      Hoogle's response for query '${query}' failed to pass json validation.
      
      got:
      ${apiResponse}
              
      violations:
      ${formattedViolations}
    `

    throw new Error(errorMessage)
  }

  console.info(outdent`
    querying '${query}' succeed with response:
      
    ${apiResponse}
  `)

  return apiJSONResponse as SearchResult
}