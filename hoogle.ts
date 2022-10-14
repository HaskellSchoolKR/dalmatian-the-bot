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

const HOOGLE = 'hoogle.haskell.org' as const

export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const completedOptions = Object.assign({ start: '1', count: '1' }, options)
  const queryParams = new URLSearchParams({
    mode: 'json',
    format: 'text',
    hoogle: query,
    ...completedOptions
  })

  return (await fetch(`https://${HOOGLE}?${queryParams}`)).json()
}