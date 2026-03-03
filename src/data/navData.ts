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
  parent: string | null
  message: string
  folders: string[]
  files: FileEntry[]
}

// ── Import all YAML files eagerly ─────────────────────────────────────────

// Instead of using import.meta.glob, we manually import each YAML file
// This ensures the custom yamlPlugin can transform them correctly
import rootYaml from './index.yaml'
import experienceYaml from './experience/index.yaml'
import experienceTechCorpYaml from './experience/TechCorp/index.yaml'
import experienceStartupXYaml from './experience/StartupX/index.yaml'
import experienceDevHouseYaml from './experience/DevHouse/index.yaml'
import projectsYaml from './projects/index.yaml'
import projectsOpenMetricsYaml from './projects/OpenMetrics/index.yaml'
import projectsFlowKitYaml from './projects/FlowKit/index.yaml'
import projectsNotiflyYaml from './projects/Notifly/index.yaml'
import stackYaml from './stack/index.yaml'
import stackLanguagesYaml from './stack/languages/index.yaml'
import stackInfrastructureYaml from './stack/infrastructure/index.yaml'
import stackFrontendYaml from './stack/frontend/index.yaml'
import extracurricularYaml from './extracurricular/index.yaml'
import extracurricularHobbiesYaml from './extracurricular/hobbies/index.yaml'

const yamlModules: Record<string, FolderYaml> = {
  '/src/data/index.yaml': rootYaml as FolderYaml,
  '/src/data/experience/index.yaml': experienceYaml as FolderYaml,
  '/src/data/experience/TechCorp/index.yaml': experienceTechCorpYaml as FolderYaml,
  '/src/data/experience/StartupX/index.yaml': experienceStartupXYaml as FolderYaml,
  '/src/data/experience/DevHouse/index.yaml': experienceDevHouseYaml as FolderYaml,
  '/src/data/projects/index.yaml': projectsYaml as FolderYaml,
  '/src/data/projects/OpenMetrics/index.yaml': projectsOpenMetricsYaml as FolderYaml,
  '/src/data/projects/FlowKit/index.yaml': projectsFlowKitYaml as FolderYaml,
  '/src/data/projects/Notifly/index.yaml': projectsNotiflyYaml as FolderYaml,
  '/src/data/stack/index.yaml': stackYaml as FolderYaml,
  '/src/data/stack/languages/index.yaml': stackLanguagesYaml as FolderYaml,
  '/src/data/stack/infrastructure/index.yaml': stackInfrastructureYaml as FolderYaml,
  '/src/data/stack/frontend/index.yaml': stackFrontendYaml as FolderYaml,
  '/src/data/extracurricular/index.yaml': extracurricularYaml as FolderYaml,
  '/src/data/extracurricular/hobbies/index.yaml': extracurricularHobbiesYaml as FolderYaml,
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

function buildNavData(): { navTree: NavTree; folderMessages: FolderMessages } {
  const navTree: NavTree = {}
  const folderMessages: FolderMessages = {}

  for (const [filePath, yaml] of Object.entries(yamlModules)) {
    if (!yaml) {
      console.warn('YAML module is null/undefined:', filePath)
      continue
    }
    const navKey = pathToNavKey(filePath)

    // Store folder message (root message is handled separately in Terminal)
    folderMessages[navKey] = yaml.message

    // Build the entries array for this folder:
    // 1. Child folders first (in declared order)
    const folderEntries: FileEntry[] = (yaml.folders ?? []).map((id) => ({
      id,
      label: `${id}/`,
      type: 'folder' as const,
    }))

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

export { NAV_TREE, FOLDER_MESSAGES }

// The root welcome message (used directly by Terminal for the boot animation)
export const WELCOME_MESSAGE: string =
  yamlModules['/src/data/index.yaml']?.message ??
  "Hello! I'm Daniel Gelencser, a software engineer. What would you like to know?"
