'use client'

import { SearchResults } from '@/components/search-results'
import { Section, ToolArgsSection } from '@/components/section'
import type { SearchResults as TypeSearchResults } from '@/lib/types'
import type { ToolInvocation } from 'ai'
import dynamic from 'next/dynamic'

const SearchResultsImageSection = dynamic(
  () => import('@/components/search-results-image').then(m => m.SearchResultsImageSection),
  { ssr: false, loading: () => <div className="h-24" /> }
)

export function SearchArtifactContent({ tool }: { tool: ToolInvocation }) {
  const searchResults: TypeSearchResults =
    tool.state === 'result' ? tool.result : undefined
  const query = tool.args?.query as string | undefined

  if (!searchResults?.results) {
    return <div className="p-4">No search results</div>
  }

  return (
    <div className="space-y-2">
      <ToolArgsSection tool="search">{`${query}`}</ToolArgsSection>
      {searchResults.images && searchResults.images.length > 0 && (
        <SearchResultsImageSection
          images={searchResults.images}
          query={query}
          displayMode="full"
        />
      )}

      <Section title="Sources">
        <SearchResults results={searchResults.results} displayMode="list" />
      </Section>
    </div>
  )
}
