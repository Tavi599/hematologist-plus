import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { TreatmentNode } from '../../schemas/catalog'

/** Disease → treatment → line/stage → regimen, each regimen leading into the calculator. */
export function TreatmentTree({
  catalog,
  diseaseId,
}: {
  catalog: CatalogIndex
  diseaseId: string
}) {
  const { t } = useTranslation()
  const roots = catalog.rootNodesByDisease.get(diseaseId) ?? []
  if (roots.length === 0) return <Text c="dimmed">{t('diseaseDetail.noTreatment')}</Text>

  return (
    <Stack gap="sm">
      {roots.map((node) => (
        <TreatmentNodeView key={node.id} catalog={catalog} node={node} depth={0} />
      ))}
    </Stack>
  )
}

function TreatmentNodeView({
  catalog,
  node,
  depth,
}: {
  catalog: CatalogIndex
  node: TreatmentNode
  depth: number
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const children = catalog.childNodes.get(node.id) ?? []
  const links = catalog.regimenLinksByNode.get(node.id) ?? []

  return (
    <Stack gap={6} pl={depth === 0 ? 0 : 'md'}>
      <Group gap="xs">
        <Text fw={depth === 0 ? 600 : 500}>{localize(node.title, language)}</Text>
        <Badge size="xs" variant="light" color="gray" tt="none">
          {t(`treatmentKind.${node.kind}`)}
        </Badge>
      </Group>
      {node.description !== null && (
        <Text size="sm" c="dimmed">
          {localize(node.description, language)}
        </Text>
      )}
      {links.map((link) => {
        const regimen = catalog.regimens.get(link.regimen_id)
        if (!regimen) return null
        const availability = regimenAvailability(catalog, regimen.id)
        return (
          <Group key={link.id} gap="sm" wrap="wrap" pl="md">
            <Anchor component={Link} to={`${routes.calculator}?regimen=${regimen.id}`}>
              {regimen.short_name}
            </Anchor>
            {availability !== 'department' && (
              <Badge
                size="xs"
                variant="light"
                color={availability === 'unavailable' ? 'red' : 'yellow'}
                tt="none"
              >
                {t(`availability.${availability}`)}
              </Badge>
            )}
            <Button
              size="compact-xs"
              variant="light"
              component={Link}
              to={`${routes.calculator}?regimen=${regimen.id}`}
            >
              {t('diseaseDetail.calculate')}
            </Button>
          </Group>
        )
      })}
      {children.map((child) => (
        <TreatmentNodeView key={child.id} catalog={catalog} node={child} depth={depth + 1} />
      ))}
    </Stack>
  )
}
