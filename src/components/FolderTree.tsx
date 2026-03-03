import './FolderTree.css'

interface NAVEntry {
  id: string
  label: string
  type: 'file' | 'folder' | 'exec' | 'popup'
}

interface FolderTreeProps {
  navTree: Record<string, NAVEntry[]>
  currentPath: string[]
  expandedFolders: Set<string>
  onToggleFolder: (folderId: string) => void
  onFolderClick: (folderId: string) => void
}

// Helper to get the nav key from a path array
function getNavKey(path: string[]): string {
  if (!path || path.length <= 1) return 'root'
  return path.slice(1).join('/')
}

// Helper to get all folders at a given nav key
function getFoldersAtKey(navTree: Record<string, NAVEntry[]>, navKey: string): NAVEntry[] {
  const entries = navTree[navKey] || []
  return entries.filter((e) => e.type === 'folder')
}

// Recursive tree component for a single folder
interface TreeNodeProps {
  folderLabel: string
  navKey: string
  navTree: Record<string, NAVEntry[]>
  currentPath: string[]
  expandedFolders: Set<string>
  onToggleFolder: (folderId: string) => void
  onFolderClick: (folderId: string) => void
  depth: number
}

function TreeNode({
  folderLabel,
  navKey,
  navTree,
  currentPath,
  expandedFolders,
  onToggleFolder,
  onFolderClick,
  depth,
}: TreeNodeProps) {
  const currentNavKey = getNavKey(currentPath)
  const isCurrent = navKey === currentNavKey
  const isExpanded = expandedFolders.has(navKey)
  const childFolders = getFoldersAtKey(navTree, navKey)
  const hasChildren = childFolders.length > 0

  return (
    <div className="tree-node" style={{ marginLeft: `${depth * 20}px` }}>
      <div className="tree-node__row">
        {hasChildren ? (
          <button
            className="tree-node__toggle"
            onClick={() => onToggleFolder(navKey)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'v' : '>'}
          </button>
        ) : (
          <span className="tree-node__toggle tree-node__toggle--placeholder" />
        )}
        <button
          className={`tree-node__label ${isCurrent ? 'tree-node__label--current' : ''}`}
          onClick={() => onFolderClick(navKey)}
          title={`Navigate to ${folderLabel}`}
          aria-current={isCurrent ? 'location' : undefined}
        >
          {folderLabel.replace(/\/$/, '')}
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div className="tree-node__children">
          {childFolders.map((child) => {
            const childNavKey = navKey === 'root' ? child.id : navKey + '/' + child.id
            return (
              <TreeNode
                key={child.id}
                folderLabel={child.label}
                navKey={childNavKey}
                navTree={navTree}
                currentPath={currentPath}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onFolderClick={onFolderClick}
                depth={depth + 1}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function FolderTree({
  navTree,
  currentPath,
  expandedFolders,
  onToggleFolder,
  onFolderClick,
}: FolderTreeProps) {
  const rootFolders = getFoldersAtKey(navTree, 'root')

  return (
    <div className="folder-tree">
      {rootFolders.map((folder) => (
        <TreeNode
          key={folder.id}
          folderLabel={folder.label}
          navKey={folder.id}
          navTree={navTree}
          currentPath={currentPath}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
          onFolderClick={onFolderClick}
          depth={0}
        />
      ))}
    </div>
  )
}
