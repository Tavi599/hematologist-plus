import {
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { routes } from '../../app/routes'
import { SignInPanel } from '../../features/auth/SignInPanel'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { ArticleSources } from '../../features/catalog/ArticleSources'
import { TreatmentTree } from '../../features/catalog/TreatmentTree'
import { lineAnchor } from '../../features/catalog/treatment-filter'
import { useDiseaseArticles } from '../../lib/articles'
import { isAuthConfigured, useSessionUser } from '../../lib/auth'
import type { CatalogIndex } from '../../lib/catalog-index'
import type { Disease } from '../../schemas/catalog'
import type { ArticleSection } from '../../schemas/common'
import { currentLanguage } from '../../lib/i18n'
import { localize, resolveLocalized } from '../../lib/localized'
import { ArticleContents } from './ArticleContents'
import { Markdown } from './Markdown'
import { SectionNav } from './SectionNav'
import navClasses from './SectionNav.module.css'
import { useClosedLines } from './use-closed-lines'

const ARTICLE_ANCHOR = 'disease-article'

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
  const disease = catalog.diseases.get(slug)

  if (!disease) {
    return <Text c="dimmed">{t('diseaseDetail.placeholder', { slug })}</Text>
  }
  return <DiseaseView key={disease.id} catalog={catalog} disease={disease} />
}

function DiseaseView({ catalog, disease }: { catalog: CatalogIndex; disease: Disease }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const lines = catalog.rootNodesByDisease.get(disease.id) ?? []
  // Trials and courses for reading only are not what a regimen is chosen from, and on myeloma they
  // run to half the page: they start folded, a click away in the bar.
  const [closed, setClosed] = useClosedLines(
    disease.id,
    lines
      .filter((node) => node.kind === 'trial' || node.kind === 'reference')
      .map((node) => node.id),
  )
  const sections = [
    ...lines.map((node) => ({ id: lineAnchor(node.id), label: localize(node.title, language) })),
    ...(isAuthConfigured ? [{ id: ARTICLE_ANCHOR, label: t('diseaseDetail.article') }] : []),
  ]
  const toggle = (nodeId: string) =>
    setClosed((current) => {
      const next = new Set(current)
      if (!next.delete(nodeId)) next.add(nodeId)
      return next
    })

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

      {sections.length > 1 && (
        <SectionNav
          sections={sections}
          // A folded line opens when the reader asks to go to it.
          onSelect={(id) => {
            const line = lines.find((node) => lineAnchor(node.id) === id)
            const key = line ? line.id : id
            if (closed.has(key)) toggle(key)
          }}
          allOpen={closed.size === 0}
          onToggleAll={() =>
            setClosed(
              closed.size === 0
                ? new Set([...lines.map((node) => node.id), ARTICLE_ANCHOR])
                : new Set(),
            )
          }
        />
      )}

      <Card withBorder component="section">
        <Stack gap="sm">
          <Title order={2} size="h4">
            {t('diseaseDetail.treatment')}
          </Title>
          <TreatmentTree
            catalog={catalog}
            diseaseId={disease.id}
            closed={closed}
            onToggle={toggle}
          />
        </Stack>
      </Card>

      <ArticleSection
        disease={disease}
        opened={!closed.has(ARTICLE_ANCHOR)}
        onToggle={() => toggle(ARTICLE_ANCHOR)}
      />
    </Stack>
  )
}

function ArticleSection({
  disease,
  opened,
  onToggle,
}: {
  disease: Disease
  opened: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { user, loading } = useSessionUser()
  const articles = useDiseaseArticles(disease.id, user !== null)
  const [section, setSection] = useState<ArticleSection>('own')

  if (!isAuthConfigured) return null

  // Which sources someone has actually written up. A source the disease names but nobody has
  // written about yet gets no button, and a source selected before the list shrank falls back to
  // the department's own article rather than leaving the reader on an empty page.
  const written = new Set((articles.data ?? []).map((row) => row.section))
  const shown = written.has(section) ? section : 'own'
  const forSection = (articles.data ?? []).filter((row) => row.section === shown)

  return (
    <Card withBorder component="section" id={ARTICLE_ANCHOR} className={navClasses.section}>
      <Stack gap="sm">
        {/* Folds like a line of treatment: the article runs to many screens below the regimens. */}
        <UnstyledButton onClick={onToggle} aria-expanded={opened}>
          <Group justify="space-between" wrap="nowrap">
            <Title order={2} size="h4">
              {t('diseaseDetail.article')}
            </Title>
            <Text size="xs" c="dimmed" aria-hidden>
              {opened ? '▲' : '▼'}
            </Text>
          </Group>
        </UnstyledButton>
        <div hidden={!opened}>
          <Stack gap="sm">
            <ArticleSources
              disease={disease}
              written={written}
              value={shown}
              onChange={setSection}
            />
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
        </div>
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
      <ArticleContents markdown={resolved.text} />
      <Markdown>{resolved.text}</Markdown>
    </>
  )
}
