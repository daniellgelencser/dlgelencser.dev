import { useState, useEffect, useRef, useCallback } from 'react'
import Message, { MessageData } from './Message'
import OptionButtons, { Section } from './OptionButtons'
import ExpandableBreadcrumb from './ExpandableBreadcrumb'
import FolderTree from './FolderTree'
import { NAV_TREE, FOLDER_MESSAGES, WELCOME_MESSAGE, MAIN_OPTIONS, ROOT_MAP, UI_LABELS, FOLDER_UI_OPTIONS, FOLDER_UI_MAP, FOLDER_UI_KIND_MAP } from '../data/navData'
import './Terminal.css'

// Extend window for optional third-party globals
declare global {
  interface Window {
    goatcounter?: { count: (opts: { path: string }) => void }
    formbricks?: { track: (event: string) => void }
  }
}

let messageCounter = 0
function nextId() {
  return ++messageCounter
}

type MessageItem   = { kind: 'message'; key: number; data: MessageData }
type OptionsItem   = { kind: 'options'; key: number; options: Array<{ label: string; section?: string }> }
type ContactBtnItem = { kind: 'contact-btn'; key: number }

type ConversationItem = MessageItem | OptionsItem | ContactBtnItem

const SESSION_KEY = 'terminal-session'

// Persist window state (open / maximized) separately in sessionStorage
const SESSION_WINDOW_KEY = 'terminal-window'

function saveWindowState(state: { isOpen: boolean; isMaximized: boolean }) {
  try {
    sessionStorage.setItem(SESSION_WINDOW_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save window state:', e)
  }
}

function loadWindowState(): { isOpen: boolean; isMaximized: boolean } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_WINDOW_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error('Failed to load window state:', e)
    return null
  }
}

// Helper functions for sessionStorage (persists only while tab is open)
function saveSession(navPath: string[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(navPath))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

function loadSession(): string[] | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.error('Failed to load session:', e)
    return null
  }
}

export default function Terminal() {
  const [items, setItems] = useState<ConversationItem[]>([])
  const [typingState, setTypingState] = useState<{ text: string; displayed: string } | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const savedNavPathRef = useRef<string[] | null>(null)
  const bootedRef = useRef(false)
  const [isOpen, setIsOpen] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)
  const [navPath, setNavPath] = useState<string[]>(['~'])
  const [isTreeExpanded, setIsTreeExpanded] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [, setLastOpenedFileId] = useState<string | null>(null)
  const skipTypingRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helper: build the current nav key from navPath
  const currentNavKey = () => {
    if (!navPath || navPath.length <= 1) return 'root'
    return navPath.slice(1).join('/')
  }

  // Load session from sessionStorage on mount
  useEffect(() => {
    const savedPath = loadSession()
    if (savedPath) {
      savedNavPathRef.current = savedPath
    }

    // Load saved window state (open / maximized) if present
    const win = loadWindowState()
    if (win) {
      setIsOpen(Boolean(win.isOpen))
      setIsMaximized(Boolean(win.isMaximized))
    }

    setHasLoaded(true)
  }, [])

  // Save navPath to sessionStorage whenever it changes
  useEffect(() => {
    if (hasLoaded) {
      saveSession(navPath)
    }
  }, [navPath, hasLoaded])

  // Persist window open/maximized state whenever it changes (after initial load)
  useEffect(() => {
    if (!hasLoaded) return
    saveWindowState({ isOpen, isMaximized })
  }, [isOpen, isMaximized, hasLoaded])

  // Skip typing animation on click or keypress — but only if typing was already
  // in progress before this event (not one that just started on the same click)
  useEffect(() => {
    const handleSkip = () => {
      if (isTyping) {
        skipTypingRef.current = true
      }
    }
    // Defer listener registration so a click that *starts* typing doesn't immediately skip it
    const t = setTimeout(() => {
      window.addEventListener('click', handleSkip)
      window.addEventListener('keydown', handleSkip)
    }, 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('click', handleSkip)
      window.removeEventListener('keydown', handleSkip)
    }
  }, [isTyping])

  // Scroll to bottom whenever items or typing display changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items, typingState])

  // Type out a string character by character into typingState, then call onDone.
  // clearItems=true wipes items before starting (for folder navigation).
  const typeMessage = useCallback(
    (text: string, onDone: (fullText: string) => void, clearItems = false) => {
      // Cancel any in-progress animation
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      skipTypingRef.current = false
      setIsTyping(true)
      if (clearItems) setItems([])
      setTypingState({ text, displayed: '' })

      let idx = 0
      const tick = () => {
        if (skipTypingRef.current) {
          // Skip to end instantly
          setTypingState({ text, displayed: text })
          setIsTyping(false)
          typingTimerRef.current = null
          onDone(text)
          return
        }
        idx++
        setTypingState({ text, displayed: text.slice(0, idx) })
        if (idx < text.length) {
          typingTimerRef.current = setTimeout(tick, 30)
        } else {
          setIsTyping(false)
          typingTimerRef.current = null
          onDone(text)
        }
      }
      typingTimerRef.current = setTimeout(tick, 30)
    },
    [],
  )

  // Called when typing animation finishes: clear typingState and commit result to items
  const finalizeTyping = useCallback(
    (fullText: string, section: Section | null) => {
      setTypingState(null)
      const msgId = nextId()
      const newMessage: MessageItem = { kind: 'message', key: msgId, data: { id: msgId, type: 'system', content: fullText } }
      if (section === 'contact') {
        setItems((prev) => [...prev, newMessage, { kind: 'contact-btn', key: nextId() }, { kind: 'options', options: MAIN_OPTIONS, key: nextId() }])
      } else if (section !== null) {
        setItems((prev) => [...prev, newMessage, { kind: 'options', options: MAIN_OPTIONS, key: nextId() }])
      } else {
        // Welcome message — show main menu
        setItems((prev) => [...prev, newMessage, { kind: 'options', options: MAIN_OPTIONS, key: nextId() }])
      }
    },
    [],
  )

  // Show folder or root content with typing animation
  const showContent = useCallback((key: string) => {
    // Defer past the current event so any in-progress click/keydown events
    // have fully resolved before typing starts (prevents skip-on-click-start race)
    setTimeout(() => {
      if (key === 'root') {
        typeMessage(WELCOME_MESSAGE, (full) => {
          finalizeTyping(full, null)
        }, true)
      } else {
        const entries = NAV_TREE[key] || []
        const configuredOptions = FOLDER_UI_OPTIONS[key]
        const options = configuredOptions
          ? configuredOptions.map((option) => ({ label: option.label, section: option.section }))
          : entries.map((e: any) => ({ label: e.label, section: e.id }))
        options.unshift({ label: UI_LABELS.back, section: '__back' })
        const folderMessage = FOLDER_MESSAGES[key] || `${UI_LABELS.contentsPrefix} ${key}`
        typeMessage(folderMessage, () => {
          setTypingState(null)
          const msgId = nextId()
          setItems((prev) => [
            ...prev,
            { kind: 'message', key: msgId, data: { id: msgId, type: 'system', content: folderMessage } },
            { kind: 'options', options, key: nextId() },
          ])
        }, true)
      }
    }, 0)
  }, [typeMessage, finalizeTyping])

  // Boot + reopen: populate items when terminal becomes open (once per open/close cycle)
  useEffect(() => {
    if (!hasLoaded) return
    if (!isOpen) {
      bootedRef.current = false // reset so next open re-runs
      return
    }
    if (bootedRef.current) return
    bootedRef.current = true

    // Determine which path to use — saved path on first load, current navPath after that
    const activePath = savedNavPathRef.current ?? navPath
    if (savedNavPathRef.current) {
      setNavPath(savedNavPathRef.current)
      savedNavPathRef.current = null // consume so it only applies once
    }

    const key = activePath.length <= 1 ? 'root' : activePath.slice(1).join('/')

    if (key === 'root') {
      const t = setTimeout(() => {
        typeMessage(WELCOME_MESSAGE, (full) => {
          finalizeTyping(full, null)
        })
      }, 400)
      return () => clearTimeout(t)
    } else {
      showContent(key)
    }
  // navPath intentionally excluded — activePath handles the saved vs current logic
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasLoaded, typeMessage, finalizeTyping, showContent])

  const handleSelect = useCallback(
    (section: string | undefined, label: string) => {
      if (isTyping) return

      // Collapse tree view if it's open
      if (isTreeExpanded) {
        setIsTreeExpanded(false)
      }

      // Track with GoatCounter (use label if section undefined)
      window.goatcounter?.count({ path: 'nav-' + (section ?? label) })

      // If the selected section corresponds to a folder in NAV_TREE, navigate into it
      const targetKey = section ?? label

      // If user clicked Back
      if (section === '__back') {
        const next = navPath.length <= 1 ? navPath : navPath.slice(0, navPath.length - 1)
        const key = next.length <= 1 ? 'root' : next.slice(1).join('/')
        setNavPath(next)
        setLastOpenedFileId(null)
        showContent(key)
        return
      }

      const key = currentNavKey()

      // Resolve section mapping for current folder scope
      let resolvedTarget = targetKey
      const scopedMap = key === 'root' ? ROOT_MAP : (FOLDER_UI_MAP[key] ?? {})
      const scopedKindMap = FOLDER_UI_KIND_MAP[key] ?? {}
      if (section && scopedMap[section]) resolvedTarget = scopedMap[section]
      const resolvedKind = section ? scopedKindMap[section] : undefined

      if (resolvedKind === 'link' && resolvedTarget) {
        window.open(resolvedTarget, '_blank', 'noopener,noreferrer')
        return
      }

      // If selecting a root folder (experience, projects, stack, extracurricular)
      if (resolvedTarget && NAV_TREE[resolvedTarget]) {
        // navigate into folder
        const newKey = resolvedTarget
        setLastOpenedFileId(null)
        setNavPath((p) => [...p, newKey])
        
        // Clear messages and show folder welcome
        const entries = NAV_TREE[newKey] || []
        const configuredOptions = FOLDER_UI_OPTIONS[newKey]
        const options = configuredOptions
          ? configuredOptions.map((option) => ({ label: option.label, section: option.section }))
          : entries.map((e: any) => ({ label: e.label, section: e.id }))
        if (newKey !== 'root') options.unshift({ label: UI_LABELS.back, section: '__back' })
        
        showContent(newKey)
        return
      }

      // If selecting an entry inside a folder
      const entries = NAV_TREE[key] || []
      const match = entries.find((e: any) => e.id === resolvedTarget || e.id === section || e.label === label)
      if (match) {
        if (match.type === 'folder') {
          const newKey = key === 'root' ? match.id : key + '/' + match.id
          setLastOpenedFileId(null)
          setNavPath((p) => [...p, match.id])
          
          // Clear messages and show folder welcome
          const entries2 = NAV_TREE[newKey] || []
          const configuredOptions2 = FOLDER_UI_OPTIONS[newKey]
          const options2 = configuredOptions2
            ? configuredOptions2.map((option) => ({ label: option.label, section: option.section }))
            : entries2.map((e: any) => ({ label: e.label, section: e.id }))
          if (newKey !== 'root') options2.unshift({ label: UI_LABELS.back, section: '__back' })
          
          showContent(newKey)
          return
        }
        if (match.type === 'file') {
          // show file contents as a system message
          const filenameMsgId = nextId()
          const contentMsgId = nextId()
          const rawFilename = (label || match.label)
            .replace(/\s*↗$/, '')
            .replace(/\/$/, '')
          const filenameToken = rawFilename.replace(/\s+/g, '_')
          // remember opened file to hide it from the options
          setLastOpenedFileId(match.id)
          const currentKey2 = key
          const entriesForOptions = NAV_TREE[currentKey2] || []
          const optionsAfterFile = entriesForOptions
            .filter((e: any) => e.id !== match.id)
            .map((e: any) => ({ label: e.label, section: e.id }))
          if (currentKey2 !== 'root') optionsAfterFile.unshift({ label: UI_LABELS.back, section: '__back' })

          setItems((prev) => [
            ...prev.filter((i) => i.kind !== 'options' && i.kind !== 'contact-btn'),
            { kind: 'message', key: filenameMsgId, data: { id: filenameMsgId, type: 'user', content: filenameToken } },
            { kind: 'message', key: contentMsgId, data: { id: contentMsgId, type: 'system', content: match.content } },
            { kind: 'options', key: nextId(), options: optionsAfterFile },
          ])
          return
        }
        if (match.type === 'exec') {
          // execute contact.sh -> open contact form
          handleContactOpen()
          return
        }
        if (match.type === 'popup') {
          // simulate opening a popup
          typeMessage('Opening ' + match.label + '...', () => {
            const mid = nextId()
            setItems((prev) => [
              ...prev.filter((i) => i.kind !== 'options' && i.kind !== 'contact-btn'),
              { kind: 'message', key: mid, data: { id: mid, type: 'system', content: `(${UI_LABELS.openedPrefix} ${match.label})` } },
            ])
          })
          return
        }
      }

      // If we got here, the selection didn't match anything in the tree
      // This shouldn't happen in normal usage
      console.warn('Selection not found:', { section, label, currentKey: key })
    },
    [isTyping, typeMessage, finalizeTyping, navPath, showContent],
  )

  const handleContactOpen = useCallback(() => {
    window.goatcounter?.count({ path: 'nav-contact-form' })
    window.formbricks?.track('contact_form_opened')
  }, [])

  // Handle clicking on a breadcrumb segment
  const handleBreadcrumbClick = useCallback((index: number) => {
    // Collapse tree view if it's open
    if (isTreeExpanded) {
      setIsTreeExpanded(false)
    }

    const newPath = navPath.slice(0, index + 1)
    const key = newPath.length <= 1 ? 'root' : newPath.slice(1).join('/')
    setNavPath(newPath)
    setLastOpenedFileId(null)
    showContent(key)
  }, [navPath, showContent, isTreeExpanded])
  // Compute the set of folder navKeys that are ancestors of the current path.
  // e.g. navPath=['~','experience','TechCorp'] → ['experience', 'experience/TechCorp']
  const getAncestorKeys = useCallback((path: string[]): Set<string> => {
    const keys = new Set<string>()
    if (path.length <= 1) return keys
    const segments = path.slice(1) // drop '~'
    for (let i = 1; i <= segments.length; i++) {
      keys.add(segments.slice(0, i).join('/'))
    }
    return keys
  }, [])

  // Whenever navPath changes, set expanded folders to exactly the ancestor chain —
  // this collapses any folders that are no longer in the current path
  useEffect(() => {
    setExpandedFolders(getAncestorKeys(navPath))
  }, [navPath, getAncestorKeys])

  const handleToggleTree = useCallback(() => {
    setIsTreeExpanded((prev) => !prev)
  }, [])

  // Handle toggling a folder in the tree
  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  // Handle clicking on a folder in the tree
  const handleTreeFolderClick = useCallback((folderId: string) => {
    // folderId is like "experience" or "projects/OpenMetrics"
    // Convert to navPath: ['~', 'experience'] or ['~', 'projects', 'OpenMetrics']
    const parts = folderId.split('/')
    const newPath = ['~', ...parts]
    const key = folderId
    
    // Collapse tree view
    setIsTreeExpanded(false)
    setNavPath(newPath)
    setLastOpenedFileId(null)
    showContent(key)
  }, [showContent])

  return (
    <>
      {!isOpen && (
        <div className="terminal-toggle" aria-hidden={false}>
          <button
            className="terminal-open-btn"
            aria-label="Open terminal"
            onClick={() => setIsOpen(true)}
          >
            <span className="terminal-open-inner" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                <polyline points="4,8 12,14 4,20" fill="none" stroke="#58a6ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="13" y1="20" x2="22" y2="20" stroke="#58a6ff" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="terminal-open-label">{UI_LABELS.terminalOpenLabel}</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className={`terminal ${isMaximized ? 'terminal--maximized' : ''}`}>
      <div className="terminal__header">
        <span className="terminal__title">{UI_LABELS.terminalTitle}</span>
        {/* <div className="terminal__breadcrumb">
          {getTruncatedBreadcrumbs().map((item, idx) => {
            const truncated = getTruncatedBreadcrumbs()
            return (
              <span key={idx}>
                {item.seg === '...' ? (
                  // Ellipsis is clickable to jump to root
                  <button
                    type="button"
                    className="terminal__crumb terminal__crumb-ellipsis"
                    onClick={() => handleBreadcrumbClick(0)}
                    title="Jump to root"
                  >
                    ...
                  </button>
                ) : (
                  <button
                    type="button"
                    className="terminal__crumb"
                    onClick={() => {
                      if (item.fullIdx >= 0) {
                        handleBreadcrumbClick(item.fullIdx)
                      }
                    }}
                    aria-current={idx === truncated.length - 1 ? 'true' : undefined}
                  >
                    {item.seg}
                  </button>
                )}
                {idx < truncated.length - 1 && <span className="terminal__crumb-sep"> / </span>}
              </span>
            )
          })}
        </div> */}
        <div className="terminal__controls">
          {isMaximized ? (
            // When maximized: show Restore (left) and Close (right)
            <>
              <button
                className="terminal__control terminal__control--max"
                title={UI_LABELS.restore}
                onClick={() => setIsMaximized(false)}
                aria-label={UI_LABELS.restore}
              >
                <span className="control__icon">🗗</span>
              </button>
              <button
                className="terminal__control terminal__control--close"
                title={UI_LABELS.close}
                onClick={() => setIsOpen(false)}
                aria-label={UI_LABELS.close}
              >
                <span className="control__icon">✕</span>
              </button>
            </>
          ) : (
            // When not maximized: show Maximize (left) and Close (right)
            <>
              <button
                className="terminal__control terminal__control--max"
                title={UI_LABELS.maximize}
                onClick={() => setIsMaximized(true)}
                aria-label={UI_LABELS.maximize}
              >
                <span className="control__icon">🗖</span>
              </button>
              <button
                className="terminal__control terminal__control--close"
                title={UI_LABELS.close}
                onClick={() => { setIsOpen(false); setItems([]) }}
                aria-label={UI_LABELS.close}
              >
                <span className="control__icon">✕</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="terminal__nav">
        <pre className="terminal__nav-box">
          <div className="terminal__nav-box-content">
            {!isTreeExpanded ? (
              <ExpandableBreadcrumb
                navPath={navPath}
                isTreeExpanded={isTreeExpanded}
                onToggleTree={handleToggleTree}
                onBreadcrumbClick={handleBreadcrumbClick}
              />
            ) : (
              <div className="terminal__nav-tree-view">
                <div className="terminal__nav-tree-root">
                  <button
                    className="breadcrumb__toggle"
                    onClick={handleToggleTree}
                    title={UI_LABELS.treeCollapse}
                    aria-expanded={isTreeExpanded}
                  >
                    v
                  </button>
                  <button
                    className={`breadcrumb__segment ${navPath.length === 1 ? 'breadcrumb__segment--current' : 'tree-node__label--ancestor'}`}
                    onClick={() => handleBreadcrumbClick(0)}
                    title={UI_LABELS.navigateToRoot}
                    aria-current={navPath.length === 1 ? 'location' : undefined}
                  >
                    ~
                  </button>
                </div>
                <FolderTree
                  navTree={NAV_TREE}
                  currentPath={navPath}
                  expandedFolders={expandedFolders}
                  onToggleFolder={handleToggleFolder}
                  onFolderClick={handleTreeFolderClick}
                />
              </div>
            )}
          </div>
        </pre>
      </div>

      <div className="terminal__body">
        {items.map((item) => {
          if (item.kind === 'message') {
            return <Message key={item.key} message={item.data} />
          }

          if (item.kind === 'contact-btn') {
            return (
              <div key={item.key} className="contact-btn-wrap">
                <button className="contact-open-btn" onClick={handleContactOpen}>
                  {UI_LABELS.openContactForm}
                </button>
              </div>
            )
          }

          if (item.kind === 'options') {
            return (
              <div key={item.key} className="options-wrap">
                <OptionButtons options={item.options} onSelect={handleSelect} />
              </div>
            )
          }

          return null
        })}
        {typingState && (
          <div className="message message--system">
            <span className="message__prefix">&gt;_ </span>
            <span className="message__content">
              {typingState.displayed}
              <span className="cursor">▋</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
        </div>
      )}
    </>
  )
}
 
