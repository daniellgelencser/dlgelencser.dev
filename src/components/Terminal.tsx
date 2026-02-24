import { useState, useEffect, useRef, useCallback } from 'react'
import Message, { MessageData } from './Message'
import OptionButtons, { Section } from './OptionButtons'
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

let messageCounter = 0
function nextId() {
  return ++messageCounter
}

type TypingItem    = { kind: 'typing'; key: number; text: string; displayed: string }
type MessageItem   = { kind: 'message'; key: number; data: MessageData }
type OptionsItem   = { kind: 'options'; key: number; options: typeof MAIN_OPTIONS }
type ContactBtnItem = { kind: 'contact-btn'; key: number }

type ConversationItem = TypingItem | MessageItem | OptionsItem | ContactBtnItem

// Simple serializable state for localStorage
type SessionAction = 
  | { type: 'welcome' }
  | { type: 'select'; section: Section; label: string }

function assertNever(x: never): never {
  throw new Error('Unexpected item kind: ' + (x as ConversationItem).kind)
}

const SESSION_KEY = 'terminal-session'

// Helper functions for sessionStorage (persists only while tab is open)
function saveSession(actions: SessionAction[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(actions))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

function loadSession(): SessionAction[] | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.error('Failed to load session:', e)
    return null
  }
}

// Reconstruct conversation items from session actions
function reconstructItems(actions: SessionAction[]): ConversationItem[] {
  const items: ConversationItem[] = []
  
  actions.forEach((action) => {
    if (action.type === 'welcome') {
      items.push({
        kind: 'message',
        key: nextId(),
        data: { id: nextId(), type: 'system', content: WELCOME_MESSAGE }
      })
      items.push({
        kind: 'options',
        options: MAIN_OPTIONS,
        key: nextId()
      })
    } else if (action.type === 'select') {
      // Remove existing options/contact buttons
      const filtered = items.filter(i => i.kind !== 'options' && i.kind !== 'contact-btn')
      items.length = 0
      items.push(...filtered)
      
      // Add user message
      items.push({
        kind: 'message',
        key: nextId(),
        data: { id: nextId(), type: 'user', content: action.label }
      })
      
      // Add system response
      items.push({
        kind: 'message',
        key: nextId(),
        data: { id: nextId(), type: 'system', content: getResponse(action.section) }
      })
      
      // Add contact button if needed
      if (action.section === 'contact') {
        items.push({ kind: 'contact-btn', key: nextId() })
      }
      
      // Add follow-up options
      items.push({
        kind: 'options',
        options: FOLLOW_UP_OPTIONS,
        key: nextId()
      })
    }
  })
  
  return items
}

export default function Terminal() {
  const [items, setItems] = useState<ConversationItem[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [sessionActions, setSessionActions] = useState<SessionAction[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const skipTypingRef = useRef(false)
  const currentTypingRef = useRef<{ text: string; onDone: (text: string) => void } | null>(null)

  // Load session from sessionStorage on mount
  useEffect(() => {
    const actions = loadSession()
    if (actions) {
      setSessionActions(actions)
      const reconstructed = reconstructItems(actions)
      setItems(reconstructed)
    }
    setHasLoaded(true)
  }, [])

  // Save session to sessionStorage whenever actions change
  useEffect(() => {
    if (hasLoaded && sessionActions.length > 0) {
      saveSession(sessionActions)
    }
  }, [sessionActions, hasLoaded])

  // Skip typing animation on click or keypress
  useEffect(() => {
    const handleSkip = () => {
      if (isTyping) {
        skipTypingRef.current = true
      }
    }

    window.addEventListener('click', handleSkip)
    window.addEventListener('keydown', handleSkip)

    return () => {
      window.removeEventListener('click', handleSkip)
      window.removeEventListener('keydown', handleSkip)
    }
  }, [isTyping])

  // Scroll to bottom whenever items change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  // Type out a string character by character, then call onDone
  const typeMessage = useCallback(
    (text: string, onDone: (fullText: string) => void) => {
      setIsTyping(true)
      skipTypingRef.current = false
      const typingKey = nextId()
      
      currentTypingRef.current = { text, onDone }

      setItems((prev) => [
        ...prev,
        { kind: 'typing', key: typingKey, text, displayed: '' },
      ])

      let idx = 0
      const tick = () => {
        // Check if skip was triggered
        if (skipTypingRef.current) {
          setItems((prev) =>
            prev.map((item) =>
              item.kind === 'typing' && item.key === typingKey
                ? { ...item, displayed: text }
                : item,
            ),
          )
          setIsTyping(false)
          currentTypingRef.current = null
          onDone(text)
          return
        }
        
        idx++
        setItems((prev) =>
          prev.map((item) =>
            item.kind === 'typing' && item.key === typingKey
              ? { ...item, displayed: text.slice(0, idx) }
              : item,
          ),
        )
        if (idx < text.length) {
          setTimeout(tick, 30)
        } else {
          setIsTyping(false)
          currentTypingRef.current = null
          onDone(text)
        }
      }
      setTimeout(tick, 30)
    },
    [],
  )

  // Replace the typing item with a real message, then append follow-up UI
  const finalizeTyping = useCallback(
    (fullText: string, section: Section | null) => {
      const msgId = nextId()
      setItems((prev) => {
        const withoutTyping = prev.filter((i) => i.kind !== 'typing')
        const newMessage: MessageItem = {
          kind: 'message',
          key: msgId,
          data: {
            id: msgId,
            type: 'system',
            content: section !== null ? getResponse(section) : fullText,
          },
        }
        if (section === 'contact') {
          return [
            ...withoutTyping,
            newMessage,
            { kind: 'contact-btn', key: nextId() },
            {
              kind: 'options',
              options: FOLLOW_UP_OPTIONS,
              key: nextId(),
            },
          ]
        }
        if (section !== null) {
          return [
            ...withoutTyping,
            newMessage,
            {
              kind: 'options',
              options: FOLLOW_UP_OPTIONS,
              key: nextId(),
            },
          ]
        }
        // Welcome message – show main menu
        return [
          ...withoutTyping,
          newMessage,
          { kind: 'options', options: MAIN_OPTIONS, key: nextId() },
        ]
      })
    },
    [],
  )

  // Boot: type welcome message only if no saved session
  useEffect(() => {
    if (!hasLoaded) return
    
    // If items already exist from localStorage, don't show welcome
    if (items.length > 0) return

    const t = setTimeout(() => {
      typeMessage(WELCOME_MESSAGE, (full) => {
        finalizeTyping(full, null)
        setSessionActions([{ type: 'welcome' }])
      })
    }, 400)
    return () => clearTimeout(t)
  }, [hasLoaded, items.length, typeMessage, finalizeTyping])

  const handleSelect = useCallback(
    (section: Section, label: string) => {
      if (isTyping) return

      // Track with GoatCounter
      window.goatcounter?.count({ path: 'nav-' + section })

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
      const typingTexts: Record<Section, string> = {
        about: 'Sure, here\'s a bit about me...',
        experience: 'Here\'s my work experience...',
        projects: 'Here are some projects I\'ve worked on...',
        contact: 'Great, let\'s get in touch...',
      }

      setTimeout(() => {
        typeMessage(typingTexts[section], () => {
          finalizeTyping('', section)
          setSessionActions((prev) => [...prev, { type: 'select', section, label }])
        })
      }, 200)
    },
    [isTyping, typeMessage, finalizeTyping],
  )

  const handleContactOpen = useCallback(() => {
    window.goatcounter?.count({ path: 'nav-contact-form' })
    window.formbricks?.track('contact_form_opened')
  }, [])

  return (
    <div className="terminal">
      <div className="terminal__header">
        <span className="terminal__dot terminal__dot--red" />
        <span className="terminal__dot terminal__dot--yellow" />
        <span className="terminal__dot terminal__dot--green" />
        <span className="terminal__title">dlgelencser.dev ~ </span>
      </div>

      <div className="terminal__body">
        {items.map((item) => {
          if (item.kind === 'message') {
            return <Message key={item.key} message={item.data} />
          }

          if (item.kind === 'typing') {
            return (
              <div key={item.key} className="message message--system">
                <span className="message__prefix">&gt; </span>
                <span className="message__content">
                  {item.displayed}
                  <span className="cursor">▋</span>
                </span>
              </div>
            )
          }

          if (item.kind === 'options') {
            return (
              <div key={item.key} className="section-label">
                <span className="section-label__text">What would you like to know?</span>
                <OptionButtons
                  options={item.options}
                  onSelect={handleSelect}
                />
              </div>
            )
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

          return assertNever(item)
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
