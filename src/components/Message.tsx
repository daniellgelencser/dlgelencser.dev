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

export default function Message({ message }: MessageProps) {
  return (
    <div className={`message message--${message.type}`}>
      <span className="message__prefix">
        {message.type === 'system' ? '> ' : '$ '}
      </span>
      <span className="message__content">{message.content}</span>
    </div>
  )
}
