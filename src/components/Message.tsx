import React from 'react'
import './Message.css'

export interface MessageData {
  id: number
  type: 'system' | 'user'
  content: React.ReactNode
}

interface MessageProps {
  message: MessageData
}

// Splits a string on URLs (https?://) and mailto: addresses, returning a mix
// of plain strings and <a> elements.
const URL_RE = /(https?:\/\/[^\s]+|mailto:[^\s]+)/g

function renderContent(content: React.ReactNode): React.ReactNode {
  if (typeof content !== 'string') return content
  const parts = content.split(URL_RE)
  if (parts.length === 1) return content
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0
      const display = part.replace(/^mailto:/, '')
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="message__link">
          {display}
        </a>
      )
    }
    return part
  })
}

export default function Message({ message }: MessageProps) {
  return (
    <div className={`message message--${message.type}`}>
      <span className="message__prefix">
        {message.type === 'system' ? '>_ ' : '$'}
      </span>
      <span className="message__content">{renderContent(message.content)}</span>
    </div>
  )
}
