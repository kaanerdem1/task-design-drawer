import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Anchor,
  Box,
  CloseButton,
  Code,
  Divider,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

const DRAWER_CSS = `
.tdd-chrome .mantine-Tabs-list { border-bottom: 0; gap: 2px; }
.tdd-chrome .mantine-Tabs-tab {
  color: rgba(230, 234, 239, 0.55);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px 12px;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
}
.tdd-chrome .mantine-Tabs-tab:hover { background: transparent; color: #f4f7fb; }
.tdd-chrome .mantine-Tabs-tab[data-active] { color: #f7f8fa; border-color: #4da6ff; background: transparent; }
.tdd-stage .mantine-Tabs-list { border-bottom: 0; }
.tdd-stage .mantine-Tabs-tab {
  font-size: 13.5px;
  font-weight: 600;
  color: #6f6a62;
  padding: 10px 12px 12px;
  border-bottom: 2px solid transparent;
  background: transparent;
}
.tdd-stage .mantine-Tabs-tab:hover { background: transparent; color: #1c1b19; }
.tdd-stage .mantine-Tabs-tab[data-active] { color: #1c1b19; border-color: #0079f8; background: transparent; }
`

const SHELL = '#171b22'
const CANVAS = '#f3f1ec'
const SURFACE = '#fbfaf7'
const INK = '#1c1b19'
const MUTED = '#6f6a62'
const LINE = '#ddd7cc'
const KIND_COLOR: Record<Kind, string> = {
  group: '#e4c27a',
  jar: '#9ec0f5',
  service: '#8dceb0',
  method: '#f0b59a',
}

const WORKFLOWS = [
  {
    id: 'wf-pay',
    name: 'Ödeme onayı',
    summary: 'Yetkilendirme servisinden mutabakata giden ödeme akışı.',
    serviceId: 'svc-auth',
  },
  {
    id: 'wf-eod',
    name: 'Gün sonu mutabakat',
    summary: 'Gün sonu kayıtlarını eşleyen akış.',
    serviceId: 'svc-recon',
  },
]

type Kind = 'group' | 'jar' | 'service' | 'method'
type StageTab = 'table' | 'relations' | 'overview' | 'screens' | 'process'

type CatalogNode = {
  id: string
  name: string
  kind: Kind
  summary?: string
  packageName?: string
  team?: string
  owner?: string
  language?: string
  jar?: string
  duties?: string[]
  callers?: Array<{ name: string; id?: string; via: string }>
  callees?: Array<{ name: string; id?: string; via: string }>
  screens?: string[]
  processes?: string[]
  children?: CatalogNode[]
}

const TREE: CatalogNode[] = [
  {
    id: 'ccs',
    name: 'CCS',
    kind: 'group',
    summary: 'Kart ve ödeme kanalı servisleri. Yetkilendirme, sorgu ve mutabakat jar’larını kapsar.',
    team: 'Core Payments',
    owner: 'Platform Engineering',
    children: [
      {
        id: 'jar-proposal',
        name: 'Proposal',
        kind: 'jar',
        summary: 'Başvuru ve teklif servisleri.',
        team: 'Origination',
        children: [
          {
            id: 'svc-proposal',
            name: 'ProposalService',
            kind: 'service',
            summary: 'Başvuru taslağını oluşturur ve durumunu döner.',
            packageName: 'com.bank.ccs.proposal',
            team: 'Origination',
            owner: 'Lending Platform',
            language: 'Java',
            jar: 'proposal-api.jar',
            duties: ['Başvuru kaydı açar', 'Durum sorgusu döner'],
            callers: [{ name: 'BranchChannel', via: 'create' }],
            callees: [],
            screens: ['PROPOSAL_MAIN_DETAIL_PAGE'],
            processes: ['Başvuru Onay'],
            children: [{ id: 'm-create', name: 'create', kind: 'method' }],
          },
        ],
      },
      {
        id: 'jar-payment',
        name: 'Payment',
        kind: 'jar',
        summary: 'Ödeme yetkilendirme, sorgu ve mutabakat.',
        team: 'Core Payments',
        children: [
          {
            id: 'svc-query',
            name: 'PaymentQueryService',
            kind: 'service',
            summary: 'Ödeme hareketini ve güncel durumu okur.',
            packageName: 'com.bank.payment.query',
            team: 'Core Payments',
            owner: 'Platform Engineering',
            language: 'Java',
            jar: 'payment-core.jar',
            duties: ['İşlem durumunu döner'],
            callers: [{ name: 'PaymentAuthorizationService', id: 'svc-auth', via: 'getPaymentStatus' }],
            callees: [],
            screens: ['PAYMENT_STATUS_REGION'],
            processes: [],
            children: [{ id: 'm-status', name: 'getPaymentStatus', kind: 'method' }],
          },
          {
            id: 'svc-auth',
            name: 'PaymentAuthorizationService',
            kind: 'service',
            summary: 'Kart ve hesap doğrulama adımlarını yönetir, ödeme sonucunu ilgili servislere iletir ve işlem durumunun takip edilmesini sağlar.',
            packageName: 'com.bank.payment.authorization',
            team: 'Core Payments',
            owner: 'Platform Engineering',
            language: 'Java',
            jar: 'payment-core.jar',
            duties: [
              'Ödeme talebini doğrular ve yetkilendirir',
              'İşlem durumunu ve hata bilgisini döndürür',
              'Mutabakat servisleriyle veri alışverişi yapar',
            ],
            callers: [
              { name: 'MobileGateway', via: 'authorizePayment' },
              { name: 'BranchTeller', via: 'authorizePayment' },
              { name: 'BatchCollector', via: 'cancelPayment' },
            ],
            callees: [
              { name: 'PaymentQueryService', id: 'svc-query', via: 'getPaymentStatus' },
              { name: 'PaymentReconciliationService', id: 'svc-recon', via: 'publish' },
            ],
            screens: ['CONS_APPLICATION_MAIN_REGION', 'PAYMENT_AUTH_PAGE'],
            processes: ['Fiyatlama Yetkileme Silme'],
            children: [
              { id: 'm-auth', name: 'authorizePayment', kind: 'method' },
              { id: 'm-pay-status', name: 'getPaymentStatus', kind: 'method' },
              { id: 'm-cancel', name: 'cancelPayment', kind: 'method' },
            ],
          },
          {
            id: 'svc-recon',
            name: 'PaymentReconciliationService',
            kind: 'service',
            summary: 'Gün sonu mutabakat kayıtlarını eşler.',
            packageName: 'com.bank.payment.reconciliation',
            team: 'Core Payments',
            owner: 'Platform Engineering',
            language: 'Java',
            jar: 'payment-core.jar',
            duties: ['Mutabakat farkını listeler'],
            callers: [{ name: 'PaymentAuthorizationService', id: 'svc-auth', via: 'publish' }],
            callees: [],
            screens: [],
            processes: ['Gün Sonu Mutabakat'],
            children: [{ id: 'm-publish', name: 'publish', kind: 'method' }],
          },
        ],
      },
      {
        id: 'jar-collateral',
        name: 'Collateral',
        kind: 'jar',
        summary: 'Teminat sorgulama servisleri.',
        team: 'Credit Risk',
        children: [
          {
            id: 'svc-collateral',
            name: 'CollateralService',
            kind: 'service',
            summary: 'Teminat bakiyesini ve bloke tutarını döner.',
            packageName: 'com.bank.ccs.collateral',
            team: 'Credit Risk',
            owner: 'Risk Platform',
            language: 'Java',
            jar: 'collateral-api.jar',
            duties: ['Teminat bakiyesini okur'],
            callers: [],
            callees: [],
            screens: ['COLLATERAL_SUMMARY'],
            processes: [],
            children: [{ id: 'm-balance', name: 'getBalance', kind: 'method' }],
          },
        ],
      },
    ],
  },
]

type Props = { onClose: () => void }

function walk(nodes: CatalogNode[], visit: (node: CatalogNode, parent?: CatalogNode) => void, parent?: CatalogNode) {
  for (const node of nodes) {
    visit(node, parent)
    if (node.children) walk(node.children, visit, node)
  }
}

function findNode(id: string, nodes: CatalogNode[] = TREE): CatalogNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = node.children ? findNode(id, node.children) : undefined
    if (child) return child
  }
  return undefined
}

function findParent(id: string): CatalogNode | undefined {
  let found: CatalogNode | undefined
  walk(TREE, (node, parent) => {
    if (node.id === id) found = parent
  })
  return found
}

function servicesUnder(node: CatalogNode): CatalogNode[] {
  const list: CatalogNode[] = []
  walk(node.children ?? [], (child) => {
    if (child.kind === 'service') list.push(child)
  })
  return list
}

function matches(node: CatalogNode, query: string): boolean {
  if (!query) return true
  if (node.name.toLowerCase().includes(query)) return true
  return Boolean(node.children?.some((child) => matches(child, query)))
}

function KindIcon({ kind }: { kind: Kind }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'group') return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
  if (kind === 'jar') {
    return (
      <svg {...common}>
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.29 7 12 12l8.71-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }
  if (kind === 'service') {
    return (
      <svg {...common}>
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 12.57-8.58 3.91a2 2 0 0 1-1.66 0L3.18 12.57" />
        <path d="m22 17.57-8.58 3.91a2 2 0 0 1-1.66 0L3.18 17.57" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
      <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        d="M12 2.5l2.55 5.17 5.7.83-4.12 4.02.97 5.67L12 15.9l-5.1 2.68.97-5.67-4.12-4.02 5.7-.83L12 2.5z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FlowIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="6" cy="6" r="2.15" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2.15" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="6" r="2.15" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8.2v7.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.2 6h5.4A4.4 4.4 0 0 1 18 10.4V18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function collect(node: CatalogNode, key: 'screens' | 'processes'): string[] {
  const out: string[] = []
  walk([node], (item) => {
    for (const value of item[key] ?? []) {
      if (!out.includes(value)) out.push(value)
    }
  })
  return out
}

export function TaskDesignDrawer({ onClose }: Props) {
  const [surface, setSurface] = useState<'services' | 'dwh'>('services')
  const [sidePanel, setSidePanel] = useState<'favorites' | 'workflows' | null>(null)
  const [favorites, setFavorites] = useState<string[]>(['svc-auth'])
  const [workflowId, setWorkflowId] = useState<string>()
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    ccs: true,
    'jar-payment': true,
    'svc-auth': true,
  })
  const [selectedId, setSelectedId] = useState('svc-auth')
  const [tab, setTab] = useState<StageTab>('overview')

  const selected = findNode(selectedId)
  const service = selected?.kind === 'service' ? selected : selected?.kind === 'method' ? findParent(selected.id) : undefined
  const activeService = service?.kind === 'service' ? service : undefined

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TREE
    return TREE.filter((node) => matches(node, q)).map(function prune(node): CatalogNode {
      return { ...node, children: node.children?.filter((child) => matches(child, q)).map(prune) }
    })
  }, [query])

  const pick = (node: CatalogNode) => {
    if (node.kind === 'method') {
      const parent = findParent(node.id)
      if (parent) {
        setWorkflowId(undefined)
        setSelectedId(parent.id)
        setTab('overview')
      }
      return
    }
    setWorkflowId(undefined)
    setSelectedId(node.id)
    setOpenIds((current) => ({ ...current, [node.id]: true }))
    if (node.kind === 'service') setTab('overview')
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const openWorkflow = (id: string) => {
    setSurface('services')
    setWorkflowId(id)
    setSidePanel('workflows')
  }

  const toggle = (id: string) => setOpenIds((current) => ({ ...current, [id]: !current[id] }))

  return (
    <Drawer
      data-testid="task-design-drawer"
      size="100%"
      radius={0}
      lockScroll
      position="right"
      opened
      overlayProps={{ backgroundOpacity: 0 }}
      onClose={onClose}
      withCloseButton={false}
      closeOnClickOutside={false}
      offset={0}
      padding={0}
      styles={{
        body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' },
        content: { overflow: 'hidden', background: SHELL },
      }}
    >
      <style>{DRAWER_CSS}</style>
      <Box
        h={52}
        px={14}
        bg={SHELL}
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center',
        }}
      >
        <Tabs
          className="tdd-chrome"
          value={surface}
          onChange={(value) => {
            if (value === 'services' || value === 'dwh') {
              setSurface(value)
              setWorkflowId(undefined)
            }
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="services">Servis</Tabs.Tab>
            <Tabs.Tab value="dwh">DWH</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Text c="#f4f7fb" fw={600} fz={14} lts="-0.015em">
          {surface === 'dwh' ? 'DWH Katalog' : 'Servis Kataloğu'}
        </Text>
        <Group justify="flex-end">
          <CloseButton aria-label="Kapat" onClick={onClose} c="#e6eaef" />
        </Group>
      </Box>

      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '300px minmax(0, 1fr)',
          overflow: 'hidden',
          background: CANVAS,
        }}
      >
        <Box component="aside" p={12} bg={SHELL} c="#e6eaef" style={{ borderRight: '1px solid #383e48', minHeight: 0 }}>
          <Stack gap={10} h="100%">
            <Group justify="space-between">
              <Text fz={11} fw={700} tt="uppercase" lts="0.08em" c="#949bab">
                Modüller
              </Text>
              <Group gap={2}>
                <Tooltip label="Favoriler">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Favoriler"
                    aria-pressed={sidePanel === 'favorites'}
                    c={sidePanel === 'favorites' ? '#4da6ff' : '#e6eaef'}
                    onClick={() => setSidePanel((current) => (current === 'favorites' ? null : 'favorites'))}
                  >
                    <StarIcon active={sidePanel === 'favorites'} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="İş akışları">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="İş akışları"
                    aria-pressed={sidePanel === 'workflows'}
                    c={sidePanel === 'workflows' ? '#4da6ff' : '#e6eaef'}
                    onClick={() => setSidePanel((current) => (current === 'workflows' ? null : 'workflows'))}
                  >
                    <FlowIcon active={sidePanel === 'workflows'} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <TextInput
              placeholder="Servis, metod…"
              size="xs"
              leftSection={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.35" />
                  <path d="M10.2 10.2 13 13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                </svg>
              }
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              styles={{
                input: {
                  background: '#1f242c',
                  borderColor: '#383e48',
                  color: '#e6eaef',
                  fontSize: 13,
                },
              }}
            />
            <ScrollArea style={{ flex: 1 }} offsetScrollbars>
              {sidePanel === 'favorites' ? (
                <SideList
                  empty="Favori servis yok. Servis başlığındaki yıldızla eklenir."
                  items={favorites.flatMap((id) => {
                    const node = findNode(id)
                    return node ? [{ id, name: node.name }] : []
                  })}
                  onOpen={(id) => {
                    const node = findNode(id)
                    if (node) pick(node)
                  }}
                />
              ) : sidePanel === 'workflows' ? (
                <SideList
                  empty="İş akışı yok."
                  activeId={workflowId}
                  items={WORKFLOWS.map((flow) => ({ id: flow.id, name: flow.name }))}
                  onOpen={openWorkflow}
                />
              ) : (
                <Stack gap={2}>
                  {visible.map((node) => (
                    <TreeBranch
                      key={node.id}
                      node={node}
                      depth={0}
                      openIds={openIds}
                      forceOpen={Boolean(query.trim())}
                      selectedId={activeService?.id ?? selectedId}
                      onToggle={toggle}
                      onPick={pick}
                    />
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Stack>
        </Box>

        <Box component="main" bg={CANVAS} style={{ minWidth: 0, minHeight: 0, overflow: 'auto' }}>
          {surface === 'dwh' ? (
            <DwhPane />
          ) : workflowId ? (
            <WorkflowPane
              flow={WORKFLOWS.find((item) => item.id === workflowId)}
              onOpenService={(id) => {
                const node = findNode(id)
                if (node) pick(node)
              }}
            />
          ) : selected?.kind === 'group' ? (
            <GroupPane node={selected} onOpen={pick} />
          ) : selected?.kind === 'jar' ? (
            <JarPane node={selected} onOpen={pick} />
          ) : activeService && (selected?.kind === 'service' || selected?.kind === 'method') ? (
            <ServicePane
              service={activeService}
              tab={tab}
              favorite={favorites.includes(activeService.id)}
              onToggleFavorite={() => toggleFavorite(activeService.id)}
              onTab={setTab}
              onOpen={pick}
            />
          ) : null}
        </Box>
      </Box>
    </Drawer>
  )
}

function TreeBranch({
  node,
  depth,
  openIds,
  forceOpen,
  selectedId,
  onToggle,
  onPick,
}: {
  node: CatalogNode
  depth: number
  openIds: Record<string, boolean>
  forceOpen: boolean
  selectedId: string
  onToggle: (id: string) => void
  onPick: (node: CatalogNode) => void
}) {
  const open = forceOpen || (openIds[node.id] ?? depth === 0)
  const hasChildren = Boolean(node.children?.length)
  const selected = node.id === selectedId
  const mark = hasChildren ? (open ? '▾' : '▸') : ''

  return (
    <Stack gap={2}>
      <UnstyledButton
        onClick={() => onPick(node)}
        px={8}
        py={6}
        ml={depth * 14}
        style={{
          width: `calc(100% - ${depth * 14}px)`,
          borderRadius: 7,
          background: selected ? 'rgba(77, 166, 255, 0.16)' : undefined,
          boxShadow: selected ? 'inset 2px 0 0 #4da6ff' : undefined,
        }}
      >
        <Group gap={8} wrap="nowrap">
          <Text
            component="span"
            fz={11}
            c="#949bab"
            w={12}
            ta="center"
            onClick={(event) => {
              event.stopPropagation()
              if (hasChildren) onToggle(node.id)
            }}
          >
            {mark}
          </Text>
          <Box component="span" c={KIND_COLOR[node.kind]} style={{ display: 'inline-flex' }}>
            <KindIcon kind={node.kind} />
          </Box>
          <Text fz={13} fw={selected ? 600 : 500} c={selected ? '#fff' : '#e6eaef'} truncate>
            {node.name}
          </Text>
        </Group>
      </UnstyledButton>
      {hasChildren && open
        ? node.children!.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              openIds={openIds}
              forceOpen={forceOpen}
              selectedId={selectedId}
              onToggle={onToggle}
              onPick={onPick}
            />
          ))
        : null}
    </Stack>
  )
}

function GroupPane({ node, onOpen }: { node: CatalogNode; onOpen: (node: CatalogNode) => void }) {
  const jars = node.children?.filter((child) => child.kind === 'jar') ?? []
  const services = servicesUnder(node)
  return (
    <Stack className="ce-page" maw={1120} mx="auto" px={36} py={28} gap={28}>
      <Box maw={720}>
        <Kicker>Proje grubu</Kicker>
        <Title order={2}>{node.name}</Title>
        <Text mt={8} fz={14.5} lh={1.55} c="#4a463f">
          {node.summary}
        </Text>
      </Box>
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="xl">
        <Field label="Sorumlu ekip" value={node.team ?? '—'} />
        <MetricStrip
          items={[
            { label: 'Servis', value: services.length },
            { label: 'Jar', value: jars.length },
            { label: 'Ekran', value: collect(node, 'screens').length },
            { label: 'Süreç', value: collect(node, 'processes').length },
          ]}
        />
      </Group>
      <Divider color={LINE} />
      <Box style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 28 }}>
        <Stack gap={2}>
          <SectionTitle count={jars.length}>Jarlar</SectionTitle>
          {jars.map((jar) => (
            <EntityRow
              key={jar.id}
              name={jar.name}
              meta={`${servicesUnder(jar).length} servis`}
              onClick={() => onOpen(jar)}
            />
          ))}
        </Stack>
        <Stack gap={18} style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 28 }}>
          <NameBlock title="Ekranlar" items={collect(node, 'screens')} />
          <NameBlock title="Süreçler" items={collect(node, 'processes')} />
        </Stack>
      </Box>
    </Stack>
  )
}

function JarPane({ node, onOpen }: { node: CatalogNode; onOpen: (node: CatalogNode) => void }) {
  const services = node.children?.filter((child) => child.kind === 'service') ?? []
  const parent = findParent(node.id)
  return (
    <Stack className="ce-page" maw={1120} mx="auto" px={36} py={28} gap={28}>
      <Box maw={720}>
        <Text fz={13} c={MUTED} mb={10}>
          {parent?.name} / {node.name}
        </Text>
        <Kicker>Jar</Kicker>
        <Title order={2}>{node.name}</Title>
        <Text mt={8} fz={14.5} lh={1.55} c="#4a463f">
          {node.summary}
        </Text>
      </Box>
      <Group justify="flex-end">
        <MetricStrip
          items={[
            { label: 'Servis', value: services.length },
            { label: 'Ekran', value: collect(node, 'screens').length },
            { label: 'Süreç', value: collect(node, 'processes').length },
          ]}
        />
      </Group>
      <Divider color={LINE} />
      <Stack gap={2}>
        <SectionTitle count={services.length}>Servisler</SectionTitle>
        {services.map((service) => (
          <EntityRow
            key={service.id}
            name={service.name}
            meta={(service.children ?? []).map((method) => method.name).join(' · ') || 'Metod yok'}
            onClick={() => onOpen(service)}
          />
        ))}
      </Stack>
      <Divider color={LINE} />
      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <NameBlock title="Ekranlar" items={collect(node, 'screens')} />
        <NameBlock title="Süreçler" items={collect(node, 'processes')} />
      </Box>
    </Stack>
  )
}

function ServicePane({
  service,
  tab,
  favorite,
  onToggleFavorite,
  onTab,
  onOpen,
}: {
  service: CatalogNode
  tab: StageTab
  favorite: boolean
  onToggleFavorite: () => void
  onTab: (tab: StageTab) => void
  onOpen: (node: CatalogNode) => void
}) {
  const callers = service.callers ?? []
  const callees = service.callees ?? []
  const methods = service.children?.filter((child) => child.kind === 'method') ?? []
  const parent = findParent(service.id)
  const group = parent ? findParent(parent.id) : undefined

  return (
    <Tabs className="tdd-stage" value={tab} onChange={(value) => onTab((value as StageTab) ?? 'overview')}>
      <Box
        px={32}
        pt={18}
        bg={SURFACE}
        style={{ position: 'sticky', top: 0, zIndex: 3, borderBottom: `1px solid ${LINE}` }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box maw={760}>
            <Group gap={6} mb={8}>
              {group ? (
                <Anchor fz={13} fw={600} onClick={() => onOpen(group)}>
                  {group.name}
                </Anchor>
              ) : null}
              <Text fz={13} c="#a39e94">
                /
              </Text>
              {parent ? (
                <Anchor fz={13} fw={600} onClick={() => onOpen(parent)}>
                  {parent.name}
                </Anchor>
              ) : null}
              <Text fz={13} c="#a39e94">
                /
              </Text>
              <Text fz={13} c={MUTED}>
                {service.jar}
              </Text>
            </Group>
            <Group gap={10} align="center">
              <Box c="#1a4a36" style={{ display: 'flex' }}>
                <KindIcon kind="service" />
              </Box>
              <Title order={2}>{service.name}</Title>
            </Group>
            <Text mt={8} fz={14.5} lh={1.55} c="#4a463f" maw={680}>
              {service.summary}
            </Text>
          </Box>
          <Tooltip label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
            <ActionIcon variant="subtle" color={favorite ? 'yellow' : 'gray'} aria-label="Favori" onClick={onToggleFavorite}>
              <StarIcon active={favorite} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Tabs.List mt={16}>
          <Tabs.Tab value="table">Tablo</Tabs.Tab>
          <Tabs.Tab value="relations">
            İlişkiler
            <Text span fz={12} c={MUTED} ml={6}>
              {callers.length + callees.length}
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="overview">Servis işlevi</Tabs.Tab>
          <Tabs.Tab value="screens">
            Ekranlar
            <Text span fz={12} c={MUTED} ml={6}>
              {(service.screens ?? []).length}
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="process">
            Süreç
            <Text span fz={12} c={MUTED} ml={6}>
              {(service.processes ?? []).length}
            </Text>
          </Tabs.Tab>
        </Tabs.List>
      </Box>

      <Tabs.Panel value="overview">
        <Stack maw={1120} mx="auto" px={32} py={26} gap={22}>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="xl">
            <Group gap={36}>
              <Field label="Sorumlu ekip" value={service.team ?? '—'} />
              <Field label="Teknik sahip" value={service.owner ?? '—'} />
              <Field label="Paket" value={service.packageName ?? '—'} />
            </Group>
            <MetricStrip
              items={[
                { label: 'Çağıran', value: callers.length },
                { label: 'Çağrılan', value: callees.length },
                { label: 'Metod', value: methods.length },
                { label: 'Ekran', value: (service.screens ?? []).length },
              ]}
            />
          </Group>
          <Box style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.75fr)', gap: 16 }}>
            <Paper withBorder radius="md" p="lg" bg="#fff" style={{ borderColor: LINE }}>
              <Text fz={11} fw={600} tt="uppercase" lts="0.04em" c={MUTED}>
                Servis özeti
              </Text>
              <Text mt={8} fz={15} fw={600} c={INK}>
                {service.summary}
              </Text>
              <Stack gap={10} mt={16}>
                {(service.duties ?? []).map((item) => (
                  <Group key={item} gap={10} wrap="nowrap" align="flex-start">
                    <Box mt={7} w={6} h={6} bg="#2f5d4a" style={{ borderRadius: 6, flexShrink: 0 }} />
                    <Text fz={14} lh={1.5} c={INK}>
                      {item}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Paper withBorder radius="md" p="lg" bg="#fff" style={{ borderColor: LINE }}>
              <Text fz={11} fw={600} tt="uppercase" lts="0.04em" c={MUTED} mb="sm">
                Konum
              </Text>
              {[
                ['Proje grubu', group?.name ?? '—'],
                ['Jar', parent?.name ?? '—'],
                ['Artefakt', service.jar ?? '—'],
                ['Dil', service.language ?? 'Java'],
              ].map(([label, value]) => (
                <Box key={label} py={8} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <Text fz={11} c={MUTED}>
                    {label}
                  </Text>
                  <Text fz={14} fw={600} c={INK}>
                    {value}
                  </Text>
                </Box>
              ))}
            </Paper>
          </Box>
          <Paper withBorder radius="md" p={0} bg="#fff" style={{ borderColor: LINE, overflow: 'hidden' }}>
            <Group px="lg" py="sm" justify="space-between" style={{ borderBottom: `1px solid ${LINE}`, background: '#f7f5f0' }}>
              <Text fz={13} fw={600}>
                Metodlar
              </Text>
              <Text fz={12} c={MUTED}>
                {methods.length}
              </Text>
            </Group>
            <Table verticalSpacing="sm" horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Metod</Table.Th>
                  <Table.Th>Servis</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {methods.map((method) => (
                  <Table.Tr key={method.id}>
                    <Table.Td>
                      <Code fz={13}>{method.name}</Code>
                    </Table.Td>
                    <Table.Td>
                      <Text fz={13} c={MUTED}>
                        {service.name}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="table">
        <Box maw={1120} mx="auto" px={32} py={26}>
          <Paper withBorder radius="md" p={0} bg="#fff" style={{ borderColor: LINE, overflow: 'hidden' }}>
            <Group px="lg" py="sm" justify="space-between" style={{ borderBottom: `1px solid ${LINE}`, background: '#f7f5f0' }}>
              <Text fz={13} fw={600}>
                Etki tablosu
              </Text>
              <Text fz={12} c={MUTED}>
                {callers.length + callees.length + 1}
              </Text>
            </Group>
            <Table verticalSpacing="sm" horizontalSpacing="lg" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Katman</Table.Th>
                  <Table.Th>Yön</Table.Th>
                  <Table.Th>Servis</Table.Th>
                  <Table.Th>Metod</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {callers.map((row, index) => (
                  <ImpactRow key={`in-${row.name}`} layer={index + 1} direction="Çağıran" row={row} onOpen={onOpen} />
                ))}
                <Table.Tr bg="#e7f1eb">
                  <Table.Td>0</Table.Td>
                  <Table.Td>Odak</Table.Td>
                  <Table.Td>
                    <Text fz={14} fw={600}>
                      {service.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fz={13} c={MUTED}>
                      {methods.map((method) => method.name).join(', ') || '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {callees.map((row, index) => (
                  <ImpactRow key={`out-${row.name}`} layer={index + 1} direction="Çağrılan" row={row} onOpen={onOpen} />
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Box>
      </Tabs.Panel>

      <Tabs.Panel value="relations">
        <Stack maw={1120} mx="auto" px={32} py={26} gap={16}>
          <RelationTable title="Bu servisi çağıran" direction="gelen" rows={callers} onOpen={onOpen} />
          <RelationTable title="Bağımlı olduğu servis" direction="giden" rows={callees} onOpen={onOpen} />
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="screens">
        <AssetTable title="Ekranlar" items={service.screens ?? []} empty="Bu servise bağlı ekran yok." />
      </Tabs.Panel>
      <Tabs.Panel value="process">
        <AssetTable title="Süreçler" items={service.processes ?? []} empty="Bu servise bağlı süreç yok." />
      </Tabs.Panel>
    </Tabs>
  )
}

function Kicker({ children }: { children: string }) {
  return (
    <Text fz={11} fw={600} tt="uppercase" lts="0.06em" c="#2f5d4a" mb={8}>
      {children}
    </Text>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={4}>
      <Text fz={11} fw={600} tt="uppercase" lts="0.04em" c={MUTED}>
        {label}
      </Text>
      <Text fz={14} fw={600} c={INK}>
        {value}
      </Text>
    </Stack>
  )
}

function SectionTitle({ children, count }: { children: string; count: number }) {
  return (
    <Group gap={8} mb={6}>
      <Text fz={13} fw={600} c="#3f3c37">
        {children}
      </Text>
      <Text fz={12} fw={600} c="#8a847a">
        {count}
      </Text>
    </Group>
  )
}

function MetricStrip({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <Group gap={0} wrap="nowrap">
      {items.map((item, index) => (
        <Group key={item.label} gap={0} wrap="nowrap">
          {index > 0 ? <Divider orientation="vertical" mx={18} color={LINE} /> : null}
          <Stack gap={6}>
            <Text fz={12} fw={500} c={MUTED}>
              {item.label}
            </Text>
            <Text fz={26} fw={600} lh={1} c={INK} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
              {item.value.toLocaleString('tr-TR')}
            </Text>
          </Stack>
        </Group>
      ))}
    </Group>
  )
}

function EntityRow({ name, meta, onClick }: { name: string; meta: string; onClick: () => void }) {
  return (
    <UnstyledButton onClick={onClick} py={8} px={4} style={{ borderRadius: 8, textAlign: 'left' }}>
      <Text className="catalog-link-name" fz={14} fw={600} c={INK}>
        {name}
      </Text>
      <Text fz={12} c={MUTED} mt={2}>
        {meta}
      </Text>
    </UnstyledButton>
  )
}

function ImpactRow({
  layer,
  direction,
  row,
  onOpen,
}: {
  layer: number
  direction: string
  row: { name: string; id?: string; via: string }
  onOpen: (node: CatalogNode) => void
}) {
  return (
    <Table.Tr>
      <Table.Td>{layer}</Table.Td>
      <Table.Td>{direction}</Table.Td>
      <Table.Td>
        {row.id ? (
          <Anchor
            fz={14}
            fw={600}
            onClick={() => {
              const node = findNode(row.id!)
              if (node) onOpen(node)
            }}
          >
            {row.name}
          </Anchor>
        ) : (
          <Text fz={14} fw={600}>
            {row.name}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Code fz={12}>{row.via}</Code>
      </Table.Td>
    </Table.Tr>
  )
}

function RelationTable({
  title,
  direction,
  rows,
  onOpen,
}: {
  title: string
  direction: string
  rows: Array<{ name: string; id?: string; via: string }>
  onOpen: (node: CatalogNode) => void
}) {
  return (
    <Paper withBorder radius="md" p={0} bg="#fff" style={{ borderColor: LINE, overflow: 'hidden' }}>
      <Group px="lg" py="sm" justify="space-between" style={{ borderBottom: `1px solid ${LINE}`, background: '#f7f5f0' }}>
        <Text fz={13} fw={600}>
          {title}
        </Text>
        <Text fz={12} c={MUTED}>
          {rows.length}
        </Text>
      </Group>
      {rows.length === 0 ? (
        <Text fz={13} c="#8a847a" fs="italic" p="lg">
          Kayıt yok
        </Text>
      ) : (
        <Table verticalSpacing="sm" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Servis</Table.Th>
              <Table.Th>Metod</Table.Th>
              <Table.Th>Yön</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.name}>
                <Table.Td>
                  {row.id ? (
                    <Anchor
                      fz={14}
                      fw={600}
                      onClick={() => {
                        const node = findNode(row.id!)
                        if (node) onOpen(node)
                      }}
                    >
                      {row.name}
                    </Anchor>
                  ) : (
                    <Text fz={14} fw={600}>
                      {row.name}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Code fz={12}>{row.via}</Code>
                </Table.Td>
                <Table.Td>
                  <Text fz={13} c={MUTED}>
                    {direction}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  )
}

function AssetTable({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Paper withBorder radius="md" p={0} m={28} maw={860} bg="#fff" style={{ borderColor: LINE, overflow: 'hidden' }}>
      <Group px="lg" py="sm" justify="space-between" style={{ borderBottom: `1px solid ${LINE}`, background: '#f7f5f0' }}>
        <Text fz={13} fw={600}>
          {title}
        </Text>
        <Text fz={12} c={MUTED}>
          {items.length}
        </Text>
      </Group>
      {items.length === 0 ? (
        <Text fz={13} c="#8a847a" fs="italic" p="lg">
          {empty}
        </Text>
      ) : (
        <Stack gap={0}>
          {items.map((item) => (
            <Text key={item} fz={13} ff="monospace" px="lg" py={12} style={{ borderBottom: `1px solid ${LINE}` }}>
              {item}
            </Text>
          ))}
        </Stack>
      )}
    </Paper>
  )
}

function NameBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <Stack gap={8}>
      <SectionTitle count={items.length}>{title}</SectionTitle>
      {items.length === 0 ? (
        <Text fz={13} c="#8a847a" fs="italic">
          Kayıt yok
        </Text>
      ) : (
        items.map((item) => (
          <Text key={item} fz={13} ff="monospace" c={INK} style={{ overflowWrap: 'anywhere' }}>
            {item}
          </Text>
        ))
      )}
    </Stack>
  )
}

function SideList({
  items,
  empty,
  activeId,
  onOpen,
}: {
  items: Array<{ id: string; name: string }>
  empty: string
  activeId?: string
  onOpen: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <Text fz={13} c="#949bab" px={8}>
        {empty}
      </Text>
    )
  }
  return (
    <Stack gap={2}>
      {items.map((item) => (
        <UnstyledButton
          key={item.id}
          onClick={() => onOpen(item.id)}
          px={8}
          py={7}
          style={{
            borderRadius: 7,
            background: item.id === activeId ? 'rgba(77, 166, 255, 0.16)' : undefined,
            textAlign: 'left',
          }}
        >
          <Text fz={13} fw={600} c="#e6eaef">
            {item.name}
          </Text>
        </UnstyledButton>
      ))}
    </Stack>
  )
}

function DwhPane() {
  return (
    <Stack maw={1120} mx="auto" px={36} py={28} gap={12}>
      <Kicker>DWH</Kicker>
      <Title order={2}>DWH Katalog</Title>
      <Text fz={14.5} c="#4a463f" maw={640} lh={1.55}>
        Tablo, kolon ve rapor lineage bu sekmede açılır. Servis kataloğu soldaki Servis sekmesindedir.
      </Text>
    </Stack>
  )
}

function WorkflowPane({
  flow,
  onOpenService,
}: {
  flow?: (typeof WORKFLOWS)[number]
  onOpenService: (id: string) => void
}) {
  if (!flow) return null
  const service = findNode(flow.serviceId)
  return (
    <Stack className="ce-page" maw={1120} mx="auto" px={36} py={28} gap={20}>
      <Box>
        <Kicker>İş akışı</Kicker>
        <Title order={2}>{flow.name}</Title>
        <Text mt={8} fz={14.5} lh={1.55} c="#4a463f" maw={680}>
          {flow.summary}
        </Text>
      </Box>
      <Divider color={LINE} />
      <Stack gap={6}>
        <SectionTitle count={service ? 1 : 0}>Servisler</SectionTitle>
        {service ? <EntityRow name={service.name} meta="Servis detayı" onClick={() => onOpenService(service.id)} /> : null}
      </Stack>
    </Stack>
  )
}
