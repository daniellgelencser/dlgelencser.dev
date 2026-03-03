import './ExpandableBreadcrumb.css'

interface ExpandableBreadcrumbProps {
  navPath: string[]
  isTreeExpanded: boolean
  onToggleTree: () => void
  onBreadcrumbClick: (index: number) => void
}

export default function ExpandableBreadcrumb({
  navPath,
  isTreeExpanded,
  onToggleTree,
  onBreadcrumbClick,
}: ExpandableBreadcrumbProps) {
  return (
    <div className="expandable-breadcrumb">
      <div className="breadcrumb__header">
        <button
          className="breadcrumb__toggle"
          onClick={onToggleTree}
          title={isTreeExpanded ? 'Collapse tree' : 'Expand tree'}
          aria-expanded={isTreeExpanded}
        >
          {isTreeExpanded ? 'v' : '>'}
        </button>
        <div className="breadcrumb__path">
          {navPath.map((segment, idx) => (
            <span key={idx} className="breadcrumb__segment-wrapper">
              {idx > 0 && <span className="breadcrumb__separator">/</span>}
              <button
                className={`breadcrumb__segment ${idx === navPath.length - 1 ? 'breadcrumb__segment--current' : ''}`}
                onClick={() => onBreadcrumbClick(idx)}
                title={`Navigate to ${segment}`}
                aria-current={idx === navPath.length - 1 ? 'location' : undefined}
              >
                {segment}
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
