import { useQuery } from '@tanstack/react-query'

import { diseaseArticleRowSchema, type DiseaseArticle } from '../schemas/catalog'
import { supabase } from './supabase'

/** Never persisted: article text stays in memory for the session that is signed in. */
export const ARTICLES_QUERY_ROOT = 'articles'

/**
 * Article text of one disease, per language. Readable only with a session (RLS), so without one
 * the query simply comes back empty rather than failing.
 */
export function useDiseaseArticles(diseaseId: string, enabled: boolean) {
  return useQuery({
    queryKey: [ARTICLES_QUERY_ROOT, diseaseId],
    enabled: enabled && supabase !== null,
    gcTime: 0,
    queryFn: async (): Promise<DiseaseArticle[]> => {
      const { data, error } = await supabase!
        .from('disease_articles')
        .select('*')
        .eq('disease_id', diseaseId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return data.map((row) => diseaseArticleRowSchema.parse(row))
    },
  })
}
