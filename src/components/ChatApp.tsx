'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Message } from '@/lib/supabase'

// ── DATA ──────────────────────────────────────────────
const EMOJIS: Record<string, string[]> = {
  visages: ['😀','😂','🥹','😊','😍','🥰','😎','🤩','😏','😢','😭','🥺','😡','🤬','😱','🤯','🥳','😴','🤗','🫡','😌','😋','🤓','😈','👻','💀','🤡','🫠','🙄','😤'],
  coeurs:  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','💯','✅','❌','⚡','🌈','🎯','💎'],
  fete:    ['🎉','🎊','🥳','🎈','🎁','🏆','🥇','🎂','🍕','🍔','🎮','⚽','🏀','🎸','🎤','🎬','🍾','🥂','🍻','🎭','🎨','🌺','🌸','🌻','🌷','🌹','🦋','🐬','🌴','🌵'],
  gestes:  ['👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🫶','🤙','👋','🖐️','✋','🫵','☝️','👆','👇','👉','👈','💪','🦾','🙏','🫂','💁','🤷','🤦','🧑‍💻','👀','❤️‍🔥'],
}

const STICKERS: Record<string, string[]> = {
  trending: ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊'],
  funny:    ['😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀'],
  love:     ['❤️🥰','💕💖','😍✨','🫶💗','💌💝','🌹❤️','😘💋','🥺👉👈','💞🌸','💑🌺'],
  study:    ['📚💡','☕📖','🧑‍💻💻','✏️📝','🎓🏆','⏰📅','🧠💭','😤📚','🔬🧪','💾🖥️'],
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c6af7,#a78bfa)',
  'linear-gradient(135deg,#f97316,#fb923c)',
  'linear-gradient(135deg,#06b6d4,#22d3ee)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#ec4899,#f472b6)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#8b5cf6,#c084fc)',
]

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const FILE_ICONS: Record<string, string> = {
  pdf:'📄', zip:'🗜️', mp3:'🎵', mp4:'🎬', doc:'📝',
  docx:'📝', xls:'📊', xlsx:'📊', txt:'📋', rar:'🗜️', pptx:'📊',
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────
export default function ChatApp() {
  const [user, setUser] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Connexion...')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<NodeJS.Timeout>()

  // ── TOAST ───────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000)
  }, [])

  // ── SCROLL ──────────────────────────────────────────
  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesRef.current)
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }, 60)
  }, [])

  // ── LOAD MESSAGES ───────────────────────────────────
  useEffect(() => {
    if (!user) return

    const load = async () => {
      setStatus('Chargement...')
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('seq_id', { ascending: true })
        .limit(150)

      if (error) { setStatus('❌ ' + error.message); return }
      setMessages(data || [])
      setStatus('🟢 Connecté')
      scrollBottom()
    }

    load()

    // ── REALTIME ────────────────────────────────────
    const channel = supabase
      .channel('chat-room')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages'
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        scrollBottom()
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') setStatus('🟢 Temps réel actif')
        if (st === 'CLOSED') setStatus('🔴 Déconnecté')
      })

    return () => { supabase.removeChannel(channel) }
  }, [user, scrollBottom])

  // ── CLOSE PICKER ON OUTSIDE CLICK ───────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── LOGIN ────────────────────────────────────────────
  const joinChat = () => {
    const name = pseudo.trim()
    if (!name) return
    setUser(name)
  }

  // ── SEND MESSAGE ─────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() && !selectedFile) return
    setSending(true)

    let file_url = null, file_name = null

    if (selectedFile) {
      const result = await uploadFile(selectedFile)
      if (!result) { setSending(false); return }
      file_url = result.url
      file_name = result.name
    }

    const { error } = await supabase.from('messages').insert({
      username: user,
      content: text.trim() || null,
      file_url,
      file_name,
      is_sticker: false,
    })

    if (error) showToast('Erreur : ' + error.message)
    else {
      setText('')
      setSelectedFile(null)
      setPickerOpen(false)
      if (inputRef.current) inputRef.current.style.height = '40px'
    }

    setSending(false)
    inputRef.current?.focus()
  }

  // ── SEND STICKER ─────────────────────────────────────
  const sendSticker = async (s: string) => {
    setPickerOpen(false)
    await supabase.from('messages').insert({
      username: user, content: s,
      file_url: null, file_name: null, is_sticker: true,
    })
  }

  // ── INSERT EMOJI ─────────────────────────────────────
  const insertEmoji = (e: string) => {
    if (!inputRef.current) return
    const el = inputRef.current
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const newVal = el.value.slice(0, start) + e + el.value.slice(end)
    setText(newVal)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + e.length
      el.focus()
    }, 0)
  }

  // ── UPLOAD FILE ──────────────────────────────────────
  const uploadFile = async (file: File) => {
    showToast('⏫ Upload...')
    const path = `${Date.now()}_${file.name.replace(/[^\w._-]/g, '_')}`
    const { error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
    if (error) { showToast('Upload échoué : ' + error.message); return null }
    const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
    showToast('✅ Envoyé !')
    return { url: data.publicUrl, name: file.name }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 25 * 1024 * 1024) { showToast('Max 25 Mo'); return }
    setSelectedFile(f)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = '40px'
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
  }

  // ── DATE GROUPS ──────────────────────────────────────
  let lastDate = ''
  const renderMessages = () => {
    const items: React.ReactNode[] = []
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at)
      const dStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      if (dStr !== lastDate) {
        lastDate = dStr
        items.push(
          <div key={`sep-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 11, margin: '8px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            {dStr}
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )
      }
      items.push(<MessageRow key={msg.id} msg={msg} isMe={msg.username === user} />)
    })
    return items
  }

  // ── LOGIN SCREEN ─────────────────────────────────────
  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(124,106,247,.25)', borderRadius: 24, padding: '44px 40px', width: 360, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: 40, textAlign: 'center' }}>💬</div>
        <div style={{ fontSize: 22, fontWeight: 600, textAlign: 'center' }}>Chat App</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Entre ton pseudo pour rejoindre</div>
        <input
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && joinChat()}
          placeholder="Ton pseudo..."
          maxLength={20}
          autoFocus
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 16px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 15, outline: 'none' }}
        />
        <button
          onClick={joinChat}
          style={{ background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
        >
          Rejoindre →
        </button>
      </div>
    </div>
  )

  // ── CHAT UI ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pulse-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: '#34d399' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Chat 🌐</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{status}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)', borderRadius: 20, padding: '5px 13px', fontSize: 13, color: 'var(--accent2)', fontWeight: 500 }}>
          👤 {user}
        </div>
      </header>

      {/* MESSAGES */}
      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 30, color: 'var(--muted)', fontSize: 13 }}>
            <span className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block' }} />
            <span className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', animationDelay: '.2s' }} />
            <span className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', animationDelay: '.4s' }} />
          </div>
        ) : renderMessages()}
      </div>

      {/* INPUT AREA */}
      <div style={{ padding: '12px 16px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative' }}>

        {/* File preview */}
        {selectedFile && (
          <div style={{ background: 'var(--bg3)', border: '1px solid rgba(124,106,247,.4)', borderRadius: 10, padding: '9px 13px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📎 {selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
        )}

        {/* Emoji/Sticker Picker */}
        {pickerOpen && (
          <div ref={pickerRef} className="pop-up" style={{ position: 'absolute', bottom: 72, left: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 12, width: 310, maxHeight: 340, overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.55)', zIndex: 50 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, position: 'sticky', top: 0, background: 'var(--bg2)', paddingBottom: 6 }}>
              {(['emoji', 'sticker'] as const).map(tab => (
                <button key={tab} onClick={() => setPickerTab(tab)} style={{ flex: 1, padding: 6, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, background: pickerTab === tab ? 'rgba(124,106,247,.2)' : 'transparent', color: pickerTab === tab ? 'var(--accent2)' : 'var(--muted)', fontWeight: pickerTab === tab ? 500 : 400 }}>
                  {tab === 'emoji' ? '😊 Emojis' : '✨ Stickers'}
                </button>
              ))}
            </div>

            {pickerTab === 'emoji' && Object.entries(EMOJIS).map(([cat, arr]) => (
              <div key={cat}>
                <div style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 5px', fontWeight: 500, textTransform: 'capitalize' }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2 }}>
                  {arr.map(e => (
                    <button key={e} onClick={() => insertEmoji(e)} style={{ fontSize: 22, padding: 5, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, lineHeight: 1, transition: 'transform .1s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.2)')}
                      onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>{e}</button>
                  ))}
                </div>
              </div>
            ))}

            {pickerTab === 'sticker' && Object.entries(STICKERS).map(([cat, arr]) => (
              <div key={cat}>
                <div style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 5px', fontWeight: 500, textTransform: 'capitalize' }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                  {arr.map(s => (
                    <button key={s} onClick={() => sendSticker(s)} style={{ fontSize: 34, padding: 8, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 10, lineHeight: 1, transition: 'transform .12s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.15)')}
                      onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBtn onClick={() => setPickerOpen(p => !p)}>😊</IconBtn>
          <IconBtn onClick={() => fileRef.current?.click()}>📎</IconBtn>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />

          <textarea
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKey}
            placeholder="Message... (Entrée pour envoyer)"
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 15px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none', resize: 'none', height: 40, maxHeight: 110, overflowY: 'auto', lineHeight: 1.4 }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          <button
            onClick={sendMessage}
            disabled={sending}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', border: 'none', color: 'white', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: sending ? 0.5 : 1, boxShadow: '0 4px 14px rgba(124,106,247,.4)', transition: 'opacity .2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* TOAST */}
      <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? 0 : 14}px)`, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 18px', fontSize: 13, opacity: toastVisible ? 1 : 0, transition: 'all .25s', pointerEvents: 'none', zIndex: 200, whiteSpace: 'nowrap', color: 'var(--text)' }}>
        {toast}
      </div>
    </div>
  )
}

// ── ICON BUTTON ───────────────────────────────────────
function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color .2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
      {children}
    </button>
  )
}

// ── MESSAGE ROW ───────────────────────────────────────
function MessageRow({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const date = new Date(msg.created_at)
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const ext = (msg.file_name || '').split('.').pop()?.toLowerCase() || ''
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)

  return (
    <div className="msg-in" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(msg.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0, userSelect: 'none' }}>
        {msg.username[0].toUpperCase()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '65%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px', fontWeight: 500 }}>{msg.username}</div>}

        {/* File */}
        {msg.file_url && (
          isImage
            ? <img src={msg.file_url} alt={msg.file_name || ''} style={{ maxWidth: 260, maxHeight: 200, borderRadius: 14, display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.file_url!, '_blank')} />
            : (
              <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: 'var(--text)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(124,106,247,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {FILE_ICONS[ext] || '📎'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Télécharger</div>
                </div>
              </a>
            )
        )}

        {/* Text / Sticker */}
        {msg.content && (
          msg.is_sticker
            ? <div style={{ fontSize: 52, lineHeight: 1, padding: 4 }}>{msg.content}</div>
            : <div style={{ padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', background: isMe ? 'linear-gradient(135deg,#6c5ce7,#a78bfa)' : 'var(--bg3)', border: isMe ? 'none' : '1px solid var(--border)', borderBottomRightRadius: isMe ? 5 : 18, borderBottomLeftRadius: isMe ? 18 : 5, color: isMe ? 'white' : 'var(--text)' }}>
              {msg.content}
            </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--muted)', padding: '0 4px' }}>{time}</div>
      </div>
    </div>
  )
}
