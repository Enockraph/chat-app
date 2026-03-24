'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Message } from '@/lib/supabase'

type Presence = { username: string; last_seen: string; is_online: boolean }

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

const COLORS = ['linear-gradient(135deg,#7c6af7,#a78bfa)','linear-gradient(135deg,#f97316,#fb923c)','linear-gradient(135deg,#06b6d4,#22d3ee)','linear-gradient(135deg,#10b981,#34d399)','linear-gradient(135deg,#ec4899,#f472b6)','linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#3b82f6,#60a5fa)','linear-gradient(135deg,#8b5cf6,#c084fc)']
const FILE_ICONS: Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📋',rar:'🗜️',pptx:'📊'}

function avatarColor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function ChatApp() {
  const [user, setUser] = useState<string|null>(null)
  const [pseudo, setPseudo] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([])
  const [showOnline, setShowOnline] = useState(false)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Connexion...')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'emoji'|'sticker'>('emoji')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<NodeJS.Timeout>()
  const presenceTimer = useRef<NodeJS.Timeout>()

  const showToast = useCallback((msg: string) => {
    setToast(msg); setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000)
  }, [])

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, 60)
  }, [])

  const loadOnline = useCallback(async () => {
    const since = new Date(Date.now() - 30000).toISOString()
    const { data } = await supabase.from('presence').select('*').eq('is_online', true).gte('last_seen', since)
    setOnlineUsers(data || [])
  }, [])

  const ping = useCallback(async (username: string) => {
    await supabase.from('presence').upsert({ username, last_seen: new Date().toISOString(), is_online: true }, { onConflict: 'username' })
  }, [])

  useEffect(() => {
    if (!user) return

    const init = async () => {
      setStatus('Chargement...')
      const { data, error } = await supabase.from('messages').select('*').order('seq_id', { ascending: true }).limit(150)
      if (error) { setStatus('❌ ' + error.message); return }
      setMessages(data || [])
      scrollBottom()
      await ping(user)
      await loadOnline()
      await supabase.from('messages').insert({ username: user, content: `${user} a rejoint le chat 👋`, file_url: null, file_name: null, is_sticker: false, msg_type: 'join' })
      setStatus('🟢 Connecté')
      if (Notification.permission === 'default') Notification.requestPermission()
    }
    init()

    presenceTimer.current = setInterval(() => { ping(user); loadOnline() }, 15000)

    const msgCh = supabase.channel('msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
      setMessages(prev => [...prev, p.new as Message])
      scrollBottom()
      if (document.hidden && p.new.msg_type === 'message' && Notification.permission === 'granted')
        new Notification(`💬 ${p.new.username}`, { body: p.new.content || '📎 Fichier' })
    }).subscribe(st => { if (st === 'SUBSCRIBED') setStatus('🟢 Temps réel actif') })

    const presCh = supabase.channel('pres').on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => loadOnline()).subscribe()

    const bye = () => {
      supabase.from('presence').upsert({ username: user, last_seen: new Date().toISOString(), is_online: false }, { onConflict: 'username' })
      supabase.from('messages').insert({ username: user, content: `${user} a quitté le chat 👋`, file_url: null, file_name: null, is_sticker: false, msg_type: 'leave' })
    }
    window.addEventListener('beforeunload', bye)

    return () => {
      supabase.removeChannel(msgCh); supabase.removeChannel(presCh)
      clearInterval(presenceTimer.current)
      window.removeEventListener('beforeunload', bye)
    }
  }, [user, scrollBottom, ping, loadOnline])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const joinChat = () => { const n = pseudo.trim(); if (n) setUser(n) }

  const sendMessage = async () => {
    if (!text.trim() && !selectedFile) return
    setSending(true)
    let file_url = null, file_name = null
    if (selectedFile) {
      const r = await uploadFile(selectedFile)
      if (!r) { setSending(false); return }
      file_url = r.url; file_name = r.name
    }
    const { error } = await supabase.from('messages').insert({ username: user, content: text.trim() || null, file_url, file_name, is_sticker: false, msg_type: 'message' })
    if (error) showToast('Erreur : ' + error.message)
    else { setText(''); setSelectedFile(null); setPickerOpen(false); if (inputRef.current) inputRef.current.style.height = '40px' }
    setSending(false); inputRef.current?.focus()
  }

  const sendSticker = async (s: string) => {
    setPickerOpen(false)
    await supabase.from('messages').insert({ username: user, content: s, file_url: null, file_name: null, is_sticker: true, msg_type: 'message' })
  }

  const insertEmoji = (e: string) => {
    if (!inputRef.current) return
    const el = inputRef.current, s = el.selectionStart ?? el.value.length, en = el.selectionEnd ?? el.value.length
    setText(el.value.slice(0, s) + e + el.value.slice(en))
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + e.length; el.focus() }, 0)
  }

  const uploadFile = async (file: File) => {
    showToast('⏫ Upload...')
    const path = `${Date.now()}_${file.name.replace(/[^\w._-]/g, '_')}`
    const { error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
    if (error) { showToast('Upload échoué'); return null }
    const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
    showToast('✅ Envoyé !'); return { url: data.publicUrl, name: file.name }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const autoResize = (el: HTMLTextAreaElement) => { el.style.height = '40px'; el.style.height = Math.min(el.scrollHeight, 110) + 'px' }

  let lastDate = ''
  const renderMessages = () => {
    const items: React.ReactNode[] = []
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at)
      const dStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      if (dStr !== lastDate) {
        lastDate = dStr
        items.push(<div key={`d${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 11, margin: '8px 0' }}><div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>{dStr}<div style={{ flex: 1, height: 1, background: 'var(--border)' }}/></div>)
      }
      if (msg.msg_type === 'join' || msg.msg_type === 'leave') {
        items.push(<div key={msg.id} style={{ textAlign: 'center', padding: '4px 0' }}><span style={{ background: msg.msg_type === 'join' ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.1)', border: `1px solid ${msg.msg_type === 'join' ? 'rgba(52,211,153,.3)' : 'rgba(248,113,113,.3)'}`, borderRadius: 20, padding: '3px 14px', fontSize: 12, color: 'var(--muted)' }}>{msg.msg_type === 'join' ? '🟢' : '🔴'} {msg.content}</span></div>)
      } else {
        items.push(<MessageRow key={msg.id} msg={msg} isMe={msg.username === user} />)
      }
    })
    return items
  }

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(124,106,247,.25)', borderRadius: 24, padding: '44px 40px', width: 360, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: 44, textAlign: 'center' }}>💬</div>
        <div style={{ fontSize: 22, fontWeight: 600, textAlign: 'center' }}>Chat App</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Entre ton pseudo pour rejoindre</div>
        <input value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinChat()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 16px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }}/>
        <button onClick={joinChat} style={{ background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Rejoindre →</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pulse-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: '#34d399' }}/>
          <div><div style={{ fontSize: 15, fontWeight: 600 }}>Chat 🌐</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{status}</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowOnline(p => !p)} style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 20, padding: '5px 12px', fontSize: 13, color: '#34d399', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}/>{onlineUsers.length} en ligne
          </button>
          <div style={{ background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.3)', borderRadius: 20, padding: '5px 13px', fontSize: 13, color: 'var(--accent2)', fontWeight: 500 }}>👤 {user}</div>
        </div>
      </header>

      {showOnline && (
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {onlineUsers.map(u => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(u.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'white' }}>{u.username[0].toUpperCase()}</div>
              {u.username}{u.username === user && <span style={{ fontSize: 10, color: 'var(--muted)' }}> (moi)</span>}
            </div>
          ))}
        </div>
      )}

      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 ? <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 30 }}>{[0,1,2].map(i => <span key={i} className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', animationDelay: `${i*.2}s` }}/>)}</div> : renderMessages()}
      </div>

      <div style={{ padding: '12px 16px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative' }}>
        {selectedFile && <div style={{ background: 'var(--bg3)', border: '1px solid rgba(124,106,247,.4)', borderRadius: 10, padding: '9px 13px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>📎 {selectedFile.name}</span><button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>✕</button></div>}
        {pickerOpen && (
          <div ref={pickerRef} className="pop-up" style={{ position: 'absolute', bottom: 72, left: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 12, width: 310, maxHeight: 340, overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.55)', zIndex: 50 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, position: 'sticky', top: 0, background: 'var(--bg2)', paddingBottom: 6 }}>
              {(['emoji','sticker'] as const).map(t => <button key={t} onClick={() => setPickerTab(t)} style={{ flex: 1, padding: 6, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, background: pickerTab===t?'rgba(124,106,247,.2)':'transparent', color: pickerTab===t?'var(--accent2)':'var(--muted)', fontWeight: pickerTab===t?500:400 }}>{t==='emoji'?'😊 Emojis':'✨ Stickers'}</button>)}
            </div>
            {pickerTab==='emoji' && Object.entries(EMOJIS).map(([cat,arr]) => <div key={cat}><div style={{ fontSize:11,color:'var(--muted)',margin:'8px 0 5px',fontWeight:500 }}>{cat}</div><div style={{ display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:2 }}>{arr.map(e => <button key={e} onClick={() => insertEmoji(e)} style={{ fontSize:22,padding:5,border:'none',background:'transparent',cursor:'pointer',borderRadius:8,lineHeight:1 }} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>)}</div></div>)}
            {pickerTab==='sticker' && Object.entries(STICKERS).map(([cat,arr]) => <div key={cat}><div style={{ fontSize:11,color:'var(--muted)',margin:'8px 0 5px',fontWeight:500 }}>{cat}</div><div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4 }}>{arr.map(s => <button key={s} onClick={() => sendSticker(s)} style={{ fontSize:34,padding:8,border:'none',background:'transparent',cursor:'pointer',borderRadius:10,lineHeight:1 }} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.15)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}</div></div>)}
          </div>
        )}
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <IconBtn onClick={() => setPickerOpen(p=>!p)}>😊</IconBtn>
          <IconBtn onClick={() => fileRef.current?.click()}>📎</IconBtn>
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f){ if(f.size>25*1024*1024){showToast('Max 25 Mo');return} setSelectedFile(f) }}}/>
          <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder="Message... (Entrée pour envoyer)" style={{ flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 15px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',resize:'none',height:40,maxHeight:110,overflowY:'auto',lineHeight:1.4 }} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
          <button onClick={sendMessage} disabled={sending} style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#7c6af7,#a78bfa)',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending?.5:1,boxShadow:'0 4px 14px rgba(124,106,247,.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
      <div style={{ position:'fixed',bottom:80,left:'50%',transform:`translateX(-50%) translateY(${toastVisible?0:14}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 18px',fontSize:13,opacity:toastVisible?1:0,transition:'all .25s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)' }}>{toast}</div>
    </div>
  )
}

function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ width:38,height:38,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}>{children}</button>
}

function MessageRow({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  const ext = (msg.file_name||'').split('.').pop()?.toLowerCase()||''
  const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext)
  return (
    <div className="msg-in" style={{ display:'flex',alignItems:'flex-end',gap:8,flexDirection:isMe?'row-reverse':'row' }}>
      <div style={{ width:30,height:30,borderRadius:'50%',background:avatarColor(msg.username),display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'white',flexShrink:0 }}>{msg.username[0].toUpperCase()}</div>
      <div style={{ display:'flex',flexDirection:'column',gap:3,maxWidth:'65%',alignItems:isMe?'flex-end':'flex-start' }}>
        {!isMe && <div style={{ fontSize:11,color:'var(--muted)',padding:'0 4px',fontWeight:500 }}>{msg.username}</div>}
        {msg.file_url && (isImage ? <img src={msg.file_url} alt="" style={{ maxWidth:260,maxHeight:200,borderRadius:14,cursor:'pointer' }} onClick={()=>window.open(msg.file_url!,'_blank')}/> : <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'11px 15px',display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'var(--text)' }}><div style={{ width:34,height:34,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{FILE_ICONS[ext]||'📎'}</div><div><div style={{ fontSize:13,fontWeight:500 }}>{msg.file_name}</div><div style={{ fontSize:11,color:'var(--muted)' }}>Télécharger</div></div></a>)}
        {msg.content && (msg.is_sticker ? <div style={{ fontSize:52,lineHeight:1,padding:4 }}>{msg.content}</div> : <div style={{ padding:'10px 14px',borderRadius:18,fontSize:14,lineHeight:1.55,wordBreak:'break-word',background:isMe?'linear-gradient(135deg,#6c5ce7,#a78bfa)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'white':'var(--text)' }}>{msg.content}</div>)}
        <div style={{ fontSize:10,color:'var(--muted)',padding:'0 4px' }}>{time}</div>
      </div>
    </div>
  )
}
