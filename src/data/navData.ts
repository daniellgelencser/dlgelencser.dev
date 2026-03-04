/**
 * navData.ts
 *
 * Eagerly imports every index.yaml under src/data/ using Vite's import.meta.glob,
 * then builds the NAV_TREE and FOLDER_MESSAGES structures consumed by Terminal.tsx.
 *
 * YAML schema (each index.yaml):
 *   name:     string        — folder display name
 *   parent:   string|null   — parent folder name ("~" for root children, null for root)
 *   message:  string        — typed welcome message shown when entering this folder
 *   folders:  string[]      — ordered list of child folder ids
 *   files:    FileEntry[]   — files/executables/popups directly in this folder
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface FileEntry {
  id: string
  label: string
  type: 'file' | 'folder' | 'exec' | 'popup'
  content?: string
  popupId?: string
}

export interface FolderYaml {
  name: string
  label?: string
  parent: string | null
  message: string
  folders: string[]
  files: FileEntry[]
  uiOptions?: UiOption[]
  uiLabels?: UiLabels
}

export interface UiOption {
  label?: string
  section: string
  target: string
  kind?: UiOptionKind
}

export type UiOptionKind = 'file' | 'folder' | 'link'

export interface UiLabels {
  back: string
  openContactForm: string
  terminalOpenLabel: string
  terminalTitle: string
  treeCollapse: string
  treeExpand: string
  navigateTo: string
  navigateToRoot: string
  restore: string
  maximize: string
  close: string
  collapse: string
  expand: string
  openedPrefix: string
  contentsPrefix: string
}

// ── Import all YAML files eagerly ─────────────────────────────────────────

import rootYaml from './index.yaml'
import uiLabelsYaml from './__ui_labels/index.yaml'

const ROOT_YAML_PATH = '/src/data/index.yaml'
const UI_LABELS_YAML_PATH = '/src/data/__ui_labels/index.yaml'

const discoveredYamlModules = (import.meta as any).glob('./**/*.yaml', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

function isFileEntry(value: unknown): value is FileEntry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    (candidate.type === 'file' ||
      candidate.type === 'folder' ||
      candidate.type === 'exec' ||
      candidate.type === 'popup')
  )
}

function isUiOption(value: unknown): value is UiOption {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    (candidate.label === undefined || typeof candidate.label === 'string') &&
    typeof candidate.section === 'string' &&
    typeof candidate.target === 'string' &&
    (candidate.kind === undefined || candidate.kind === 'file' || candidate.kind === 'folder' || candidate.kind === 'link')
  )
}

function isFolderYaml(value: unknown): value is FolderYaml {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.name !== 'string') return false
  if (!(candidate.label === undefined || typeof candidate.label === 'string')) return false
  if (!(candidate.parent === null || typeof candidate.parent === 'string')) return false
  if (typeof candidate.message !== 'string') return false
  if (!Array.isArray(candidate.folders) || !candidate.folders.every((folder) => typeof folder === 'string')) return false
  if (!Array.isArray(candidate.files) || !candidate.files.every(isFileEntry)) return false
  if (candidate.uiOptions !== undefined && (!Array.isArray(candidate.uiOptions) || !candidate.uiOptions.every(isUiOption))) return false
  return true
}

function toAbsoluteDataPath(relativePath: string): string {
  return `/src/data/${relativePath.replace(/^\.\//, '')}`
}

const yamlModules: Record<string, FolderYaml> = {}

if (isFolderYaml(rootYaml)) {
  yamlModules[ROOT_YAML_PATH] = rootYaml
}

if (isFolderYaml(uiLabelsYaml)) {
  yamlModules[UI_LABELS_YAML_PATH] = uiLabelsYaml
}

for (const [relativePath, raw] of Object.entries(discoveredYamlModules)) {
  if (relativePath === './index.yaml' || relativePath === './__ui_labels/index.yaml') {
    continue
  }

  if (!isFolderYaml(raw)) {
    continue
  }

  yamlModules[toAbsoluteDataPath(relativePath)] = raw
}



// ── Convert file path → nav key ───────────────────────────────────────────
// "/src/data/index.yaml"                      → "root"
// "/src/data/experience/index.yaml"           → "experience"
// "/src/data/experience/TechCorp/index.yaml"  → "experience/TechCorp"

function pathToNavKey(filePath: string): string {
  // Remove /src/data/ prefix
  let result = filePath.replace(/^\/src\/data\//, '')
  // Remove index.yaml suffix
  result = result.replace(/index\.yaml$/, '').replace(/\/$/, '')
  
  // If empty, it's the root
  return result === '' ? 'root' : result
}

// ── Build NAV_TREE and FOLDER_MESSAGES ────────────────────────────────────

export type NavTree = Record<string, FileEntry[]>
export type FolderMessages = Record<string, string>
export type FolderUiOptions = Record<string, Array<{ label: string; section: string }>>
export type FolderUiMap = Record<string, Record<string, string>>
export type FolderUiKindMap = Record<string, Record<string, UiOptionKind>>

function navKeyToYamlPath(navKey: string): string {
  return navKey === 'root'
    ? ROOT_YAML_PATH
    : `/src/data/${navKey}/index.yaml`
}

function folderDisplayLabel(yaml: FolderYaml | undefined, fallbackId: string): string {
  return yaml?.label ?? yaml?.name ?? fallbackId
}

const defaultUiLabels: UiLabels = {
  back: '.. Back',
  openContactForm: 'Open Contact Form',
  terminalOpenLabel: 'Console',
  terminalTitle: 'dlgelencser.dev',
  treeCollapse: 'Collapse tree',
  treeExpand: 'Expand tree',
  navigateTo: 'Navigate to',
  navigateToRoot: 'Navigate to ~',
  restore: 'Restore',
  maximize: 'Maximize',
  close: 'Close',
  collapse: 'Collapse',
  expand: 'Expand',
  openedPrefix: 'Opened',
  contentsPrefix: 'Contents of',
}

function buildNavData(): { navTree: NavTree; folderMessages: FolderMessages } {
  const navTree: NavTree = {}
  const folderMessages: FolderMessages = {}

  for (const [filePath, yaml] of Object.entries(yamlModules)) {
    if (filePath === UI_LABELS_YAML_PATH) {
      continue
    }

    if (!yaml) {
      console.warn('YAML module is null/undefined:', filePath)
      continue
    }
    const navKey = pathToNavKey(filePath)

    // Store folder message (root message is handled separately in Terminal)
    folderMessages[navKey] = yaml.message

    // Build the entries array for this folder:
    // 1. Child folders first (in declared order)
    const folderEntries: FileEntry[] = (yaml.folders ?? []).map((id) => {
      const childNavKey = navKey === 'root' ? id : `${navKey}/${id}`
      const childYaml = yamlModules[navKeyToYamlPath(childNavKey)]
      const displayLabel = folderDisplayLabel(childYaml, id)

      return {
        id,
        label: `${displayLabel}/`,
        type: 'folder' as const,
      }
    })

    // 2. Then files/exec/popup entries
    const fileEntries: FileEntry[] = (yaml.files ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      ...(f.content !== undefined ? { content: f.content } : {}),
      ...(f.popupId !== undefined ? { popupId: f.popupId } : {}),
    }))

    navTree[navKey] = [...folderEntries, ...fileEntries]
  }

  return { navTree, folderMessages }
}

const { navTree: NAV_TREE, folderMessages: FOLDER_MESSAGES } = buildNavData()

const rootConfig = yamlModules[ROOT_YAML_PATH]

function resolveTargetLabel(target: string): string {
  const folderYaml = yamlModules[navKeyToYamlPath(target)]
  if (folderYaml) {
    return folderDisplayLabel(folderYaml, target)
  }

  const rootFile = rootConfig?.files.find((file) => file.id === target)
  if (rootFile) {
    return rootFile.label
  }

  return target
}

function resolveTargetLabelInFolder(navKey: string, target: string): string {
  const localMatch = NAV_TREE[navKey]?.find((entry) => entry.id === target)
  if (localMatch) {
    return localMatch.label.replace(/\/$/, '')
  }
  return resolveTargetLabel(target)
}

function inferUiOptionKind(navKey: string, target: string): UiOptionKind {
  if (/^https?:\/\//i.test(target)) {
    return 'link'
  }

  if (NAV_TREE[target]) {
    return 'folder'
  }

  const localFolderNavKey = navKey === 'root' ? target : `${navKey}/${target}`
  if (NAV_TREE[localFolderNavKey]) {
    return 'folder'
  }

  return 'file'
}

function withKindMarker(label: string, kind: UiOptionKind): string {
  if (kind === 'folder') {
    return label.endsWith('/') ? label : `${label}/`
  }

  if (kind === 'link') {
    return label.endsWith('↗') ? label : `${label} ↗`
  }

  return label
}

function buildFolderUiConfig(): { folderUiOptions: FolderUiOptions; folderUiMap: FolderUiMap; folderUiKindMap: FolderUiKindMap } {
  const folderUiOptions: FolderUiOptions = {}
  const folderUiMap: FolderUiMap = {}
  const folderUiKindMap: FolderUiKindMap = {}

  for (const [filePath, yaml] of Object.entries(yamlModules)) {
    if (filePath === UI_LABELS_YAML_PATH) continue

    const navKey = pathToNavKey(filePath)
    const options = yaml.uiOptions ?? []
    if (options.length === 0) continue

    folderUiMap[navKey] = {}
    folderUiKindMap[navKey] = {}
    folderUiOptions[navKey] = options.map((option) => {
      const kind = option.kind ?? inferUiOptionKind(navKey, option.target)
      folderUiMap[navKey][option.section] = option.target
      folderUiKindMap[navKey][option.section] = kind

      const baseLabel = option.label ?? resolveTargetLabelInFolder(navKey, option.target)
      return {
        label: withKindMarker(baseLabel, kind),
        section: option.section,
      }
    })
  }

  return { folderUiOptions, folderUiMap, folderUiKindMap }
}

const { folderUiOptions: FOLDER_UI_OPTIONS, folderUiMap: FOLDER_UI_MAP, folderUiKindMap: FOLDER_UI_KIND_MAP } = buildFolderUiConfig()

export const MAIN_OPTIONS: Array<{ label: string; section: string }> =
  FOLDER_UI_OPTIONS.root ??
  (rootConfig?.uiOptions ?? []).map((option) => ({
    label: option.label ?? resolveTargetLabel(option.target),
    section: option.section,
  }))

export const ROOT_MAP: Record<string, string> =
  FOLDER_UI_MAP.root ??
  (rootConfig?.uiOptions ?? []).reduce<Record<string, string>>((acc, option) => {
    acc[option.section] = option.target
    return acc
  }, {})

export const UI_LABELS: UiLabels = {
  ...defaultUiLabels,
  ...(yamlModules[UI_LABELS_YAML_PATH]?.uiLabels ?? {}),
}

export { NAV_TREE, FOLDER_MESSAGES }
export { FOLDER_UI_OPTIONS, FOLDER_UI_MAP, FOLDER_UI_KIND_MAP }

// The root welcome message (used directly by Terminal for the boot animation)
export const WELCOME_MESSAGE: string =
  yamlModules[ROOT_YAML_PATH]?.message ??
  "Hello! I'm Daniel Gelencser, a software engineer. What would you like to know?"
