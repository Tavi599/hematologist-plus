import { Alert, Anchor, Badge, Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { routes } from '../../app/routes'
import { SignInPanel } from '../../features/auth/SignInPanel'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { ArticleSources } from '../../features/catalog/ArticleSources'
import { TreatmentTree } from '../../features/catalog/TreatmentTree'
import { useDiseaseArticles } from '../../lib/articles'
import { isAuthConfigured, useSessionUser } from '../../lib/auth'
import type { CatalogIndex } from '../../lib/catalog-index'
import type { Disease } from '../../schemas/catalog'
import type { ArticleSection } from '../../schemas/common'
import { currentLanguage } from '../../lib/i18n'
import { localize, resolveLocalized } from '../../lib/localized'
import { Markdown } from './Markdown'

export function DiseaseDetailPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()

  return (
    <Stack>
      <Anchor component={Link} to={routes.diseases} size="sm">
        ← {t('diseaseDetail.back')}
      </Anchor>
      <CatalogGate>{(catalog) => <DiseaseDetail catalog={catalog} slug={slug} />}</CatalogGate>
    </Stack>
  )
}

function DiseaseDetail({ catalog, slug }: { catalog: CatalogIndex; slug: string }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const disease = catalog.diseases.get(slug)

  if (!disease) {
    return <Text c="dimmed">{t('diseaseDetail.placeholder', { slug })}</Text>
  }

  const codes = catalog.codesByDisease.get(disease.id) ?? []

  return (
    <Stack>
      <Title order={1}>{localize(disease.name, language)}</Title>
      {codes.length > 0 && (
        <Group gap="xs">
          {codes.map((code) => (
            <Badge key={code.id} variant="light">
              {catalog.classificationSystems.get(code.system_id)?.id === 'icd-10'
                ? code.code
                : `${code.system_id}: ${code.code}`}
            </Badge>
          ))}
        </Group>
      )}
      {disease.summary !== null && <Text>{localize(disease.summary, language)}</Text>}

      <Card withBorder component="section">
        <Stack gap="sm">
          <Title order={2} size="h4">
            {t('diseaseDetail.treatment')}
          </Title>
          <TreatmentTree catalog={catalog} diseaseId={disease.id} />
        </Stack>
      </Card>

      <ArticleSection disease={disease} />
    </Stack>
  )
}

function ArticleSection({ disease }: { disease: Disease }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { user, loading } = useSessionUser()
  const articles = useDiseaseArticles(disease.id, user !== null)
  const [section, setSection] = useState<ArticleSection>('own')

  if (!isAuthConfigured) return null

  const forSection = (articles.data ?? []).filter((row) => row.section === section)

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('diseaseDetail.article')}
        </Title>
        <ArticleSources disease={disease} value={section} onChange={setSection} />
        {loading ? (
          <Loader size="sm" />
        ) : user === null ? (
          <>
            <Text c="dimmed" size="sm">
              {t('auth.articleLocked')}
            </Text>
            <SignInPanel />
          </>
        ) : articles.isPending ? (
          <Loader size="sm" />
        ) : articles.isError ? (
          <Alert color="red">{articles.error.message}</Alert>
        ) : (
          <ArticleBody
            resolved={resolveLocalized(
              Object.fromEntries(forSection.map((row) => [row.language, row.body])),
              language,
            )}
          />
        )}
      </Stack>
    </Card>
  )
}

function ArticleBody({ resolved }: { resolved: ReturnType<typeof resolveLocalized> }) {
  const { t } = useTranslation()
  if (resolved.text === '') return <Text c="dimmed">{t('auth.articleEmpty')}</Text>
  return (
    <>
      {resolved.isFallback && (
        <Alert color="gray" variant="light">
          {t('diseaseDetail.otherLanguage')}
        </Alert>
      )}
      <Markdown>{resolved.text}</Markdown>
    </>
  )
}
