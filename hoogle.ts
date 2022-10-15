import { Schema, validate } from "https://deno.land/x/jtd@v0.1.0/mod.ts";
import outdent from 'http://deno.land/x/outdent@v0.8.0/mod.ts';
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
}>

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
      type: { type: 'string' }
    }
  }
} as Schema

const HOOGLE = useEnvVar('HOOGLE', 'Hoogle domain name')

export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const completedOptions = Object.assign({ start: '1', count: '1' }, options)
  const queryParams = new URLSearchParams({
    mode: 'json',
    format: 'text',
    hoogle: query,
    ...completedOptions
  })
  const apiResponse = await (await fetch(`https://${HOOGLE}?${queryParams}`)).json()
  const schemaViolations = validate(searchResultSchema, apiResponse)

  if (schemaViolations.length > 0) {
    const formattedViolations = schemaViolations.map(
      ({ instancePath, schemaPath }) => outdent`
        ${instancePath.join('.')} violates ${schemaPath.join('.')}
      `
    ).join('\n')
    const errorMessage = outdent`
      Hoogle API response failed to match json schema.
      got:
      ${JSON.stringify(apiResponse)}
      violations:
      ${formattedViolations}
    ` //@TODO: implement pretty print for api response

    throw new Error(errorMessage)
  }

  return apiResponse
}