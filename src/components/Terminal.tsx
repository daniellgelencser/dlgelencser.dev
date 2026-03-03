import { useState, useEffect, useRef, useCallback } from 'react'
import Message, { MessageData } from './Message'
import OptionButtons, { Section } from './OptionButtons'
import ExpandableBreadcrumb from './ExpandableBreadcrumb'
import FolderTree from './FolderTree'
import './Terminal.css'

// Extend window for optional third-party globals
declare global {
  interface Window {
    goatcounter?: { count: (opts: { path: string }) => void }
    formbricks?: { track: (event: string) => void }
  }
}

const WELCOME_MESSAGE =
  "Hello! I'm Daniel Gelencser, a software engineer. What would you like to know?"

const MAIN_OPTIONS = [
  { label: 'About Me', section: 'about' as Section },
  { label: 'Experience', section: 'experience' as Section },
  { label: 'Projects', section: 'projects' as Section },
  { label: 'Stack', section: 'stack' as Section },
  { label: 'Extracurricular', section: 'extracurricular' as Section },
  { label: 'Contact', section: 'contact' as Section },
]

const FOLLOW_UP_OPTIONS = MAIN_OPTIONS

function getResponse(section: Section): React.ReactNode {
  switch (section) {
    case 'about':
      return (
        <span>
          I&apos;m a software engineer passionate about building products that matter.
          I have experience across full-stack development, cloud infrastructure,
          and mobile applications.
        </span>
      )

    case 'experience':
      return (
        <span>
          <strong>Work Experience:</strong>
          {'\n\n'}
          🔹 Senior Software Engineer @ TechCorp (2022–Present){'\n'}
          &nbsp;&nbsp;Led backend services migration to microservices on AWS.
          {'\n\n'}
          🔹 Software Engineer @ StartupX (2020–2022){'\n'}
          &nbsp;&nbsp;Built cross-platform mobile app with React Native &amp; Node.js.
          {'\n\n'}
          🔹 Junior Software Engineer @ DevHouse (2018–2020){'\n'}
          &nbsp;&nbsp;Developed and maintained full-stack web applications.
        </span>
      )

    case 'projects':
      return (
        <span>
          <strong>Projects:</strong>
          {'\n\n'}
          📦 <strong>OpenMetrics</strong>{'\n'}
          &nbsp;&nbsp;A lightweight observability dashboard built with React and Go.
          Real-time metrics aggregation from multiple cloud providers.
          {'\n\n'}
          📦 <strong>FlowKit</strong>{'\n'}
          &nbsp;&nbsp;A drag-and-drop workflow automation tool. TypeScript,
          React Flow, and a serverless backend on AWS Lambda.
          {'\n\n'}
          📦 <strong>Notifly</strong>{'\n'}
          &nbsp;&nbsp;Push notification microservice supporting iOS, Android
          and Web. Handles 1M+ notifications per day.
        </span>
      )

    case 'contact':
      return (
        <span>
          I&apos;d love to hear from you! Click the button below to open the
          contact form.
        </span>
      )

    default:
      return <span>Section not found.</span>
  }
}

// Folder welcome messages
const FOLDER_MESSAGES: Record<string, string> = {
  experience: "Here's my professional work experience. Select a company to learn more.",
  'experience/TechCorp': 'TechCorp (2022–Present) — My current role as Senior Software Engineer.',
  'experience/StartupX': 'StartupX (2020–2022) — Built mobile and backend systems.',
  'experience/DevHouse': 'DevHouse (2018–2020) — Started my career building web applications.',
  projects: "Here are some key projects I've worked on. Select one to see details.",
  'projects/OpenMetrics': 'OpenMetrics — A lightweight observability dashboard.',
  'projects/FlowKit': 'FlowKit — Drag-and-drop workflow automation tool.',
  'projects/Notifly': 'Notifly — Push notification microservice handling 1M+ daily notifications.',
  stack: 'My technical stack and tools. Explore by category.',
  'stack/languages': 'Programming languages I work with.',
  'stack/infrastructure': 'Cloud and infrastructure tools.',
  'stack/frontend': 'Frontend frameworks and libraries.',
  extracurricular: 'Beyond work — my interests and philosophy.',
  'extracurricular/hobbies': 'Personal hobbies and creative pursuits.',
}

// Simple in-memory navigation tree describing folders and files.
const NAV_TREE: Record<string, any> = {
  root: [
    { id: 'bio.txt', label: 'bio.txt', type: 'file', content: "Hello — I'm Daniel Gelencser. I'm a software engineer who builds web and cloud products. I enjoy systems design, developer experience, and mentoring teams." },
    { id: 'experience', label: 'experience/', type: 'folder' },
    { id: 'projects', label: 'projects/', type: 'folder' },
    { id: 'stack', label: 'stack/', type: 'folder' },
    { id: 'extracurricular', label: 'extracurricular/', type: 'folder' },
    { id: 'contact.sh', label: 'contact.sh', type: 'exec' },
  ],

  experience: [
    { id: 'TechCorp', label: 'TechCorp/', type: 'folder' },
    { id: 'StartupX', label: 'StartupX/', type: 'folder' },
    { id: 'DevHouse', label: 'DevHouse/', type: 'folder' },
  ],

  'experience/TechCorp': [
    { id: 'summary.md', label: 'summary.md', type: 'file', content: 'Senior Software Engineer @ TechCorp (2022–Present) — Led backend migration to microservices on AWS.' },
    { id: 'achievements.md', label: 'achievements.md', type: 'file', content: '- Migrated monolith to microservices\n- Reduced latency by 40%\n' },
    { id: 'migration-case-study.md', label: 'migration-case-study.md', type: 'popup', popupId: 'migration' },
  ],

  projects: [
    { id: 'OpenMetrics', label: 'OpenMetrics/', type: 'folder' },
    { id: 'FlowKit', label: 'FlowKit/', type: 'folder' },
    { id: 'Notifly', label: 'Notifly/', type: 'folder' },
  ],

  'projects/OpenMetrics': [
    { id: 'readme.md', label: 'readme.md', type: 'file', content: 'OpenMetrics — a lightweight observability dashboard built with React and Go.' },
    { id: 'architecture.png', label: 'architecture.png', type: 'popup', popupId: 'openmetrics-arch' },
    { id: 'full-breakdown.md', label: 'full-breakdown.md', type: 'popup', popupId: 'openmetrics-full' },
  ],

  stack: [
    { id: 'languages', label: 'languages/', type: 'folder' },
    { id: 'infrastructure', label: 'infrastructure/', type: 'folder' },
    { id: 'frontend', label: 'frontend/', type: 'folder' },
  ],

  extracurricular: [
    { id: 'hobbies', label: 'hobbies/', type: 'folder' },
    { id: 'philosophy.txt', label: 'philosophy.txt', type: 'file', content: 'I believe in clean code, gradual improvement, and mentoring teams.' },
  ],

  'extracurricular/hobbies': [
    { id: 'photography.jpg', label: 'photography.jpg', type: 'popup', popupId: 'photos' },
    { id: 'gaming.txt', label: 'gaming.txt', type: 'file', content: 'I enjoy indie game jams and tinkering with small game projects.' },
  ],
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

  // Map symbolic MAIN_OPTIONS sections to NAV ids (files/folders)
  const ROOT_MAP: Record<string, string> = {
    about: 'bio.txt',
    experience: 'experience',
    projects: 'projects',
    stack: 'stack',
    extracurricular: 'extracurricular',
    contact: 'contact.sh',
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
      const content = section !== null ? getResponse(section) : fullText
      const newMessage: MessageItem = { kind: 'message', key: msgId, data: { id: msgId, type: 'system', content } }
      if (section === 'contact') {
        setItems((prev) => [...prev, newMessage, { kind: 'contact-btn', key: nextId() }, { kind: 'options', options: FOLLOW_UP_OPTIONS, key: nextId() }])
      } else if (section !== null) {
        setItems((prev) => [...prev, newMessage, { kind: 'options', options: FOLLOW_UP_OPTIONS, key: nextId() }])
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
        const options = entries.map((e: any) => ({ label: e.label, section: e.id }))
        options.unshift({ label: '.. Back', section: '__back' })
        const folderMessage = FOLDER_MESSAGES[key] || `Contents of ${key}`
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

      // Resolve symbolic root mappings (About Me -> bio.txt, Contact -> contact.sh)
      let resolvedTarget = targetKey
      if (section && ROOT_MAP[section]) resolvedTarget = ROOT_MAP[section]

      // If selecting a root folder (experience, projects, stack, extracurricular)
      if (resolvedTarget && NAV_TREE[resolvedTarget]) {
        // navigate into folder
        const newKey = resolvedTarget
        setLastOpenedFileId(null)
        setNavPath((p) => [...p, newKey])
        
        // Clear messages and show folder welcome
        const entries = NAV_TREE[newKey] || []
        const options = entries.map((e: any) => ({ label: e.label, section: e.id }))
        if (newKey !== 'root') options.unshift({ label: '.. Back', section: '__back' })
        
        showContent(newKey)
        return
      }

      // If selecting an entry inside a folder
      const key = currentNavKey()
      const entries = NAV_TREE[key] || []
      const match = entries.find((e: any) => e.id === section || e.label === label)
      if (match) {
        if (match.type === 'folder') {
          const newKey = key === 'root' ? match.id : key + '/' + match.id
          setLastOpenedFileId(null)
          setNavPath((p) => [...p, match.id])
          
          // Clear messages and show folder welcome
          const entries2 = NAV_TREE[newKey] || []
          const options2 = entries2.map((e: any) => ({ label: e.label, section: e.id }))
          if (newKey !== 'root') options2.unshift({ label: '.. Back', section: '__back' })
          
          showContent(newKey)
          return
        }
        if (match.type === 'file') {
          // show file contents as a system message
          const msgId = nextId()
          // remember opened file to hide it from the options
          setLastOpenedFileId(match.id)
          const currentKey2 = key
          const entriesForOptions = NAV_TREE[currentKey2] || []
          const optionsAfterFile = entriesForOptions
            .filter((e: any) => e.id !== match.id)
            .map((e: any) => ({ label: e.label, section: e.id }))
          if (currentKey2 !== 'root') optionsAfterFile.unshift({ label: '.. Back', section: '__back' })

          setItems((prev) => [
            ...prev.filter((i) => i.kind !== 'options' && i.kind !== 'contact-btn'),
            { kind: 'message', key: msgId, data: { id: msgId, type: 'system', content: match.content } },
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
              { kind: 'message', key: mid, data: { id: mid, type: 'system', content: `(Opened ${match.label})` } },
            ])
          })
          return
        }
      }

      // Fallback to original behavior for legacy labels (about/projects/experience/contact)
      // Add user message
      const userMsgId = nextId()
      const userMsg: ConversationItem = {
        kind: 'message',
        key: userMsgId,
        data: { id: userMsgId, type: 'user', content: label },
      }

      // Remove all existing option / contact-btn rows, append user msg
      setItems((prev) => [
        ...prev.filter((i) => i.kind !== 'options' && i.kind !== 'contact-btn'),
        userMsg,
      ])

      // Determine typing text (a short preamble before showing the rich response)
      const typingTexts: Record<string, string> = {
        about: 'Sure, here\'s a bit about me...',
        experience: 'Here\'s my work experience...',
        projects: 'Here are some projects I\'ve worked on...',
        contact: 'Great, let\'s get in touch...',
      }

      setTimeout(() => {
        const text = typingTexts[section ?? label] ?? typingTexts['about']
        typeMessage(text, () => {
          finalizeTyping('', section ?? (label as any))
        })
      }, 200)
    },
    [isTyping, typeMessage, finalizeTyping, navPath, showContent],
  )

  const handleContactOpen = useCallback(() => {
    window.goatcounter?.count({ path: 'nav-contact-form' })
    window.formbricks?.track('contact_form_opened')
  }, [])

  // Handle clicking on a breadcrumb segment
  const handleBreadcrumbClick = useCallback((index: number) => {
    const newPath = navPath.slice(0, index + 1)
    const key = newPath.length <= 1 ? 'root' : newPath.slice(1).join('/')
    setNavPath(newPath)
    setLastOpenedFileId(null)
    showContent(key)
  }, [navPath, showContent])
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
    
    setNavPath(newPath)
    setLastOpenedFileId(null)
    showContent(key)
  }, [showContent])

  // Build truncated breadcrumb for mobile: show ~ then ... then last 2 segments if > 2 folders
  const getTruncatedBreadcrumbs = () => {
    if (!navPath || navPath.length <= 2) {
      return navPath.map((seg, idx) => ({ seg, fullIdx: idx }))
    }
    // If more than 2 segments, show first (root) + ellipsis + last 2
    return [
      { seg: navPath[0], fullIdx: 0 },
      { seg: '...', fullIdx: -1 }, // -1 for ellipsis
      { seg: navPath[navPath.length - 2], fullIdx: navPath.length - 2 },
      { seg: navPath[navPath.length - 1], fullIdx: navPath.length - 1 },
    ]
  }

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
            <span className="terminal-open-label">Console</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className={`terminal ${isMaximized ? 'terminal--maximized' : ''}`}>
      <div className="terminal__header">
        <span className="terminal__title">dlgelencser.dev</span>
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
                title="Restore"
                onClick={() => setIsMaximized(false)}
                aria-label="Restore"
              >
                <span className="control__icon">🗗</span>
              </button>
              <button
                className="terminal__control terminal__control--close"
                title="Close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <span className="control__icon">✕</span>
              </button>
            </>
          ) : (
            // When not maximized: show Maximize (left) and Close (right)
            <>
              <button
                className="terminal__control terminal__control--max"
                title="Maximize"
                onClick={() => setIsMaximized(true)}
                aria-label="Maximize"
              >
                <span className="control__icon">🗖</span>
              </button>
              <button
                className="terminal__control terminal__control--close"
                title="Close"
                onClick={() => { setIsOpen(false); setItems([]) }}
                aria-label="Close"
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
                    title="Collapse tree"
                    aria-expanded={isTreeExpanded}
                  >
                    v
                  </button>
                  <button
                    className={`breadcrumb__segment ${navPath.length === 1 ? 'breadcrumb__segment--current' : 'tree-node__label--ancestor'}`}
                    onClick={() => handleBreadcrumbClick(0)}
                    title="Navigate to ~"
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
                  Open Contact Form
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
 
