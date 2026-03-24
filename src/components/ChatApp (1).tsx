'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── TYPES ─────────────────────────────────────────────
type Msg = { id: string; seq_id: number; username: string; content: string|null; file_url: string|null; file_name: string|null; is_sticker: boolean; is_custom_sticker?: boolean; msg_type: string; created_at: string }
type DM  = { id: string; seq_id: number; from_user: string; to_user: string; content: string|null; file_url: string|null; file_name: string|null; is_sticker: boolean; created_at: string }
type Profile = { username: string; avatar_color: string; avatar_emoji: string; bio: string }
type Reaction = { id: string; message_id: string; username: string; emoji: string }
type CustomSticker = { id: string; creator: string; content: string; bg_color: string; text_color: string }
type Presence = { username: string; is_online: boolean; last_seen: string }

// ── CONSTANTS ─────────────────────────────────────────
const QUICK_REACTIONS = ['❤️','😂','😮','😢','😡','👍','🔥','💯']
const AVATAR_COLORS = ['#7c6af7','#f97316','#06b6d4','#10b981','#ec4899','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#84cc16']
const AVATAR_EMOJIS = ['😊','😎','🤩','🥳','😏','🤓','😈','👻','🦁','🐯','🦊','🐺','🦋','🎭','🎪','🎨','🚀','⚡','🌟','💎']
const EMOJIS = ['😀','😂','🥹','😊','😍','🥰','😎','🤩','😏','😢','😭','🥺','😡','🤬','😱','🤯','🥳','😴','🤗','🫡','😌','😋','🤓','😈','👻','💀','🤡','🫠','🙄','😤','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','💯','✅','❌','⚡','🌈','🎯','💎','🎉','🎊','🥳','🎈','🎁','🏆','🥇','🎂','🍕','🍔','🎮','⚽','🏀','🎸','🎤','🎬','🍾','🥂','🍻','👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🫶','🤙','👋','🖐️','✋','🫵','☝️','👆','👇','👉','👈','💪','🦾','🙏','🫂','💁','🤷','🤦','🧑‍💻','👀','❤️‍🔥']
const STICKERS = ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊','😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀','❤️🥰','💕💖','😍✨','🫶💗','💌💝','🌹❤️','😘💋','🥺👉👈','💞🌸','💑🌺','📚💡','☕📖','🧑‍💻💻','✏️📝','🎓🏆','⏰📅','🧠💭','😤📚','🔬🧪','💾🖥️']
const FILE_ICONS: Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📋',rar:'🗜️',pptx:'📊'}

function colorForName(n: string) { let h=0; for(const c of n) h=c.charCodeAt(0)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length] }

// ── STYLES ────────────────────────────────────────────
const S = {
  btn: (bg='var(--accent)', color='white') => ({ background:bg, color, border:'none', borderRadius:12, padding:'11px 20px', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' } as React.CSSProperties),
  input: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', color:'var(--text)', fontFamily:'inherit', fontSize:14, outline:'none', width:'100%' } as React.CSSProperties,
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:20, padding:24 } as React.CSSProperties,
  iconBtn: { width:36, height:36, borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--muted)', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } as React.CSSProperties,
}

// ══════════════════════════════════════════════════════
export default function ChatApp() {
  const [step, setStep] = useState<'login'|'setup'|'app'>('login')
  const [user, setUser] = useState<string>('')
  const [profile, setProfile] = useState<Profile|null>(null)
  const [pseudo, setPseudo] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJIS[0])
  const [bio, setBio] = useState('')
  const [view, setView] = useState<'chat'|'dm'>('chat')
  const [dmTarget, setDmTarget] = useState<string|null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [dms, setDms] = useState<DM[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Connexion...')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'emoji'|'sticker'|'custom'|'create'>('emoji')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [toast, setToast] = useState(''); const [toastVisible, setToastVisible] = useState(false)
  const [sending, setSending] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<string|null>(null)
  const [viewProfile, setViewProfile] = useState<Profile|null>(null)
  const [showOnline, setShowOnline] = useState(false)
  // custom sticker creator
  const [csText, setCsText] = useState('')
  const [csBg, setCsBg] = useState('#7c6af7')
  const [csColor, setCsColor] = useState('#ffffff')

  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<NodeJS.Timeout>()
  const presTimer = useRef<NodeJS.Timeout>()

  // ── TOAST ──────────────────────────────────────────
  const toast$ = useCallback((msg: string) => {
    setToast(msg); setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000)
  }, [])

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, 80)
  }, [])

  // ── LOAD PROFILE ────────────────────────────────────
  const loadProfile = useCallback(async (username: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
    return data as Profile|null
  }, [])

  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*')
    if (data) {
      const map: Record<string, Profile> = {}
      data.forEach((p: Profile) => { map[p.username] = p })
      setProfiles(map)
    }
  }, [])

  const loadOnline = useCallback(async () => {
    const since = new Date(Date.now() - 30000).toISOString()
    const { data } = await supabase.from('presence').select('*').eq('is_online', true).gte('last_seen', since)
    setOnlineUsers(data || [])
  }, [])

  const ping = useCallback(async (username: string) => {
    await supabase.from('presence').upsert({ username, last_seen: new Date().toISOString(), is_online: true }, { onConflict: 'username' })
  }, [])

  // ── LOGIN ───────────────────────────────────────────
  const handleLogin = async () => {
    const name = pseudo.trim(); if (!name) return
    const saved = localStorage.getItem('chat_user')
    if (saved) {
      const p = await loadProfile(saved)
      if (p) { setUser(saved); setProfile(p); setAvatarColor(p.avatar_color); setAvatarEmoji(p.avatar_emoji); setBio(p.bio); setStep('app'); return }
    }
    const existing = await loadProfile(name)
    if (existing) { setUser(name); setProfile(existing); setAvatarColor(existing.avatar_color); setAvatarEmoji(existing.avatar_emoji); setBio(existing.bio); localStorage.setItem('chat_user', name); setStep('app') }
    else { setUser(name); setStep('setup') }
  }

  const handleSetup = async () => {
    const p: Profile = { username: user, avatar_color: avatarColor, avatar_emoji: avatarEmoji, bio }
    await supabase.from('profiles').upsert(p, { onConflict: 'username' })
    setProfile(p); localStorage.setItem('chat_user', user); setStep('app')
  }

  // ── INIT APP ─────────────────────────────────────────
  useEffect(() => {
    if (step !== 'app') return
    const init = async () => {
      setStatus('Chargement...')
      await ping(user)
      await loadOnline()
      await loadAllProfiles()
      const { data: msgs } = await supabase.from('messages').select('*').order('seq_id', { ascending: true }).limit(150)
      setMessages(msgs || [])
      const { data: rxns } = await supabase.from('reactions').select('*')
      setReactions(rxns || [])
      const { data: cs } = await supabase.from('custom_stickers').select('*').order('created_at', { ascending: false })
      setCustomStickers(cs || [])
      await supabase.from('messages').insert({ username: user, content: `${user} a rejoint le chat 👋`, file_url: null, file_name: null, is_sticker: false, msg_type: 'join' })
      setStatus('🟢 Connecté'); scrollBottom()
      if (Notification.permission === 'default') Notification.requestPermission()
    }
    init()

    presTimer.current = setInterval(() => { ping(user); loadOnline() }, 15000)

    const msgCh = supabase.channel('msgs-v2').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
      setMessages(prev => [...prev, p.new as Msg]); scrollBottom()
      if (document.hidden && p.new.msg_type === 'message' && Notification.permission === 'granted')
        new Notification(`💬 ${p.new.username}`, { body: p.new.content || '📎 Fichier' })
    }).subscribe(st => { if (st === 'SUBSCRIBED') setStatus('🟢 Temps réel') })

    const dmCh = supabase.channel('dms-v2').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dms' }, p => {
      const dm = p.new as DM
      if (dm.from_user === user || dm.to_user === user) {
        setDms(prev => [...prev, dm]); scrollBottom()
        if (document.hidden && dm.from_user !== user && Notification.permission === 'granted')
          new Notification(`🔒 DM de ${dm.from_user}`, { body: dm.content || '📎 Fichier' })
      }
    }).subscribe()

    const rxCh = supabase.channel('reactions-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
      supabase.from('reactions').select('*').then(({ data }) => { if (data) setReactions(data) })
    }).subscribe()

    const csCh = supabase.channel('cs-v2').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'custom_stickers' }, p => {
      setCustomStickers(prev => [p.new as CustomSticker, ...prev])
    }).subscribe()

    const presCh = supabase.channel('pres-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => loadOnline()).subscribe()
    const profCh = supabase.channel('prof-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAllProfiles()).subscribe()

    const bye = () => {
      supabase.from('presence').upsert({ username: user, last_seen: new Date().toISOString(), is_online: false }, { onConflict: 'username' })
      supabase.from('messages').insert({ username: user, content: `${user} a quitté le chat`, file_url: null, file_name: null, is_sticker: false, msg_type: 'leave' })
    }
    window.addEventListener('beforeunload', bye)
    return () => {
      [msgCh, dmCh, rxCh, csCh, presCh, profCh].forEach(c => supabase.removeChannel(c))
      clearInterval(presTimer.current)
      window.removeEventListener('beforeunload', bye)
    }
  }, [step, user, scrollBottom, ping, loadOnline, loadAllProfiles])

  // ── DM LOAD ──────────────────────────────────────────
  useEffect(() => {
    if (!dmTarget || !user) return
    supabase.from('dms').select('*').or(`and(from_user.eq.${user},to_user.eq.${dmTarget}),and(from_user.eq.${dmTarget},to_user.eq.${user})`).order('seq_id', { ascending: true }).then(({ data }) => { setDms(data || []); scrollBottom() })
  }, [dmTarget, user, scrollBottom])

  // ── SEND ─────────────────────────────────────────────
  const send = async () => {
    if (!text.trim() && !selectedFile) return
    setSending(true)
    let file_url = null, file_name = null
    if (selectedFile) {
      const r = await upload(selectedFile); if (!r) { setSending(false); return }
      file_url = r.url; file_name = r.name
    }
    if (view === 'dm' && dmTarget) {
      await supabase.from('dms').insert({ from_user: user, to_user: dmTarget, content: text.trim()||null, file_url, file_name, is_sticker: false })
    } else {
      await supabase.from('messages').insert({ username: user, content: text.trim()||null, file_url, file_name, is_sticker: false, msg_type: 'message' })
    }
    setText(''); setSelectedFile(null); setPickerOpen(false)
    if (inputRef.current) inputRef.current.style.height = '40px'
    setSending(false); inputRef.current?.focus()
  }

  const sendSticker = async (content: string, isCustom = false) => {
    setPickerOpen(false)
    if (view === 'dm' && dmTarget)
      await supabase.from('dms').insert({ from_user: user, to_user: dmTarget, content, is_sticker: true })
    else
      await supabase.from('messages').insert({ username: user, content, is_sticker: true, is_custom_sticker: isCustom, msg_type: 'message' })
  }

  const createCustomSticker = async () => {
    if (!csText.trim()) return
    const { data } = await supabase.from('custom_stickers').insert({ creator: user, content: csText.trim(), bg_color: csBg, text_color: csColor }).select().single()
    if (data) { toast$('✅ Sticker créé !'); setCsText('') }
  }

  // ── REACTIONS ────────────────────────────────────────
  const toggleReaction = async (msgId: string, emoji: string) => {
    setReactionTarget(null)
    const existing = reactions.find(r => r.message_id === msgId && r.username === user && r.emoji === emoji)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ message_id: msgId, username: user, emoji })
    }
  }

  // ── UPLOAD ───────────────────────────────────────────
  const upload = async (file: File) => {
    toast$('⏫ Upload...')
    const path = `${Date.now()}_${file.name.replace(/[^\w._-]/g,'_')}`
    const { error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
    if (error) { toast$('Erreur upload'); return null }
    const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
    toast$('✅ Envoyé !'); return { url: data.publicUrl, name: file.name }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const autoResize = (el: HTMLTextAreaElement) => { el.style.height = '40px'; el.style.height = Math.min(el.scrollHeight, 110) + 'px' }
  const insertEmoji = (e: string) => {
    if (!inputRef.current) return
    const el = inputRef.current, s = el.selectionStart??el.value.length, en = el.selectionEnd??el.value.length
    setText(el.value.slice(0,s)+e+el.value.slice(en))
    setTimeout(() => { el.selectionStart = el.selectionEnd = s+e.length; el.focus() }, 0)
  }

  const getProfile = (username: string): Profile => profiles[username] || { username, avatar_color: colorForName(username), avatar_emoji: '😊', bio: '' }

  const openDM = (username: string) => { if (username === user) return; setDmTarget(username); setView('dm'); setViewProfile(null) }

  // ── AUTO LOGIN ───────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('chat_user')
    if (saved) { setPseudo(saved) }
  }, [])

  // ── RENDER HELPERS ───────────────────────────────────
  const Avatar = ({ username, size = 36, onClick }: { username: string; size?: number; onClick?: () => void }) => {
    const p = getProfile(username)
    return (
      <div onClick={onClick} style={{ width: size, height: size, borderRadius: '50%', background: p.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, flexShrink: 0, cursor: onClick ? 'pointer' : 'default', userSelect: 'none' }}>
        {p.avatar_emoji}
      </div>
    )
  }

  const msgReactions = (msgId: string) => {
    const grouped: Record<string, string[]> = {}
    reactions.filter(r => r.message_id === msgId).forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = []
      grouped[r.emoji].push(r.username)
    })
    return grouped
  }

  let lastDate = ''
  const renderMsgs = (msgs: Msg[]) => msgs.map((msg, i) => {
    const date = new Date(msg.created_at)
    const dStr = date.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
    const isMe = msg.username === user
    const rxns = msgReactions(msg.id)
    const hasReactions = Object.keys(rxns).length > 0
    const items: React.ReactNode[] = []

    if (dStr !== lastDate) {
      lastDate = dStr
      items.push(<div key={`d${i}`} style={{ display:'flex', alignItems:'center', gap:10, color:'var(--muted)', fontSize:11, margin:'8px 0' }}><div style={{ flex:1, height:1, background:'var(--border)' }}/>{dStr}<div style={{ flex:1, height:1, background:'var(--border)' }}/></div>)
    }

    if (msg.msg_type === 'join' || msg.msg_type === 'leave') {
      items.push(<div key={msg.id} style={{ textAlign:'center', padding:'3px 0' }}><span style={{ background: msg.msg_type==='join'?'rgba(52,211,153,.1)':'rgba(248,113,113,.1)', border:`1px solid ${msg.msg_type==='join'?'rgba(52,211,153,.3)':'rgba(248,113,113,.3)'}`, borderRadius:20, padding:'3px 14px', fontSize:12, color:'var(--muted)' }}>{msg.msg_type==='join'?'🟢':'🔴'} {msg.content}</span></div>)
      return items
    }

    const ext = (msg.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    const p = getProfile(msg.username)

    items.push(
      <div key={msg.id} className="msg-in" style={{ display:'flex', alignItems:'flex-end', gap:8, flexDirection:isMe?'row-reverse':'row', position:'relative' }}
        onMouseLeave={() => setReactionTarget(null)}>
        <Avatar username={msg.username} size={32} onClick={() => setViewProfile(p)} />
        <div style={{ display:'flex', flexDirection:'column', gap:2, maxWidth:'65%', alignItems:isMe?'flex-end':'flex-start' }}>
          {!isMe && <div style={{ fontSize:11, color:'var(--muted)', padding:'0 4px', fontWeight:500, cursor:'pointer' }} onClick={() => setViewProfile(p)}>{msg.username}</div>}
          <div style={{ position:'relative' }} onMouseEnter={() => setReactionTarget(msg.id)}>
            {/* Bubble */}
            {msg.file_url && (isImage
              ? <img src={msg.file_url} alt="" style={{ maxWidth:260, maxHeight:200, borderRadius:14, cursor:'pointer', display:'block' }} onClick={() => window.open(msg.file_url!,'_blank')}/>
              : <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:14, padding:'11px 15px', display:'flex', alignItems:'center', gap:11, textDecoration:'none', color:'var(--text)' }}>
                  <div style={{ width:34,height:34,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{FILE_ICONS[ext]||'📎'}</div>
                  <div><div style={{ fontSize:13,fontWeight:500 }}>{msg.file_name}</div><div style={{ fontSize:11,color:'var(--muted)' }}>Télécharger</div></div>
                </a>
            )}
            {msg.content && (
              msg.is_sticker
                ? <div style={{ fontSize: msg.is_custom_sticker ? 16 : 52, lineHeight:1, padding: msg.is_custom_sticker ? '8px 14px' : 4, background: msg.is_custom_sticker ? (customStickers.find(s=>s.content===msg.content)?.bg_color||'#7c6af7') : 'transparent', borderRadius: msg.is_custom_sticker ? 14 : 0, color: msg.is_custom_sticker ? (customStickers.find(s=>s.content===msg.content)?.text_color||'white') : undefined, fontWeight: msg.is_custom_sticker ? 700 : undefined }}>{msg.content}</div>
                : <div style={{ padding:'10px 14px', borderRadius:18, fontSize:14, lineHeight:1.55, wordBreak:'break-word', background:isMe?'linear-gradient(135deg,#6c5ce7,#a78bfa)':'var(--bg3)', border:isMe?'none':'1px solid var(--border)', borderBottomRightRadius:isMe?5:18, borderBottomLeftRadius:isMe?18:5, color:isMe?'white':'var(--text)' }}>{msg.content}</div>
            )}
            {/* Reaction picker on hover */}
            {reactionTarget === msg.id && (
              <div style={{ position:'absolute', [isMe?'right':'left']:0, bottom:'100%', marginBottom:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:30, padding:'4px 8px', display:'flex', gap:4, zIndex:10, boxShadow:'0 8px 24px rgba(0,0,0,.4)', whiteSpace:'nowrap' }}>
                {QUICK_REACTIONS.map(e => (
                  <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{ fontSize:20, background:'none', border:'none', cursor:'pointer', padding:'2px 4px', borderRadius:8, opacity: reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?1:.6, transform: reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?'scale(1.2)':'scale(1)', transition:'all .1s' }}>{e}</button>
                ))}
              </div>
            )}
          </div>
          {/* Reactions display */}
          {hasReactions && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'0 4px' }}>
              {Object.entries(rxns).map(([emoji, users]) => (
                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} title={users.join(', ')} style={{ background: users.includes(user)?'rgba(124,106,247,.2)':'var(--bg3)', border:`1px solid ${users.includes(user)?'rgba(124,106,247,.4)':'var(--border)'}`, borderRadius:20, padding:'2px 8px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  {emoji} <span style={{ fontSize:11, color:'var(--muted)' }}>{users.length}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize:10, color:'var(--muted)', padding:'0 4px' }}>{date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
    return items
  })

  const renderDMs = (dms: DM[]) => dms.map(dm => {
    const isMe = dm.from_user === user
    const ext = (dm.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    return (
      <div key={dm.id} className="msg-in" style={{ display:'flex', alignItems:'flex-end', gap:8, flexDirection:isMe?'row-reverse':'row' }}>
        <Avatar username={dm.from_user} size={30}/>
        <div style={{ display:'flex', flexDirection:'column', gap:2, maxWidth:'65%', alignItems:isMe?'flex-end':'flex-start' }}>
          {dm.file_url && (isImage ? <img src={dm.file_url} alt="" style={{ maxWidth:240,borderRadius:14,cursor:'pointer' }} onClick={()=>window.open(dm.file_url!,'_blank')}/> : <a href={dm.file_url} target="_blank" rel="noreferrer" style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',textDecoration:'none',color:'var(--text)',fontSize:13 }}>📎 {dm.file_name}</a>)}
          {dm.content && (dm.is_sticker ? <div style={{ fontSize:46, lineHeight:1 }}>{dm.content}</div> : <div style={{ padding:'10px 14px', borderRadius:18, fontSize:14, background:isMe?'linear-gradient(135deg,#6c5ce7,#a78bfa)':'var(--bg3)', border:isMe?'none':'1px solid var(--border)', borderBottomRightRadius:isMe?5:18, borderBottomLeftRadius:isMe?18:5, color:isMe?'white':'var(--text)' }}>{dm.content}</div>)}
          <div style={{ fontSize:10, color:'var(--muted)', padding:'0 4px' }}>{new Date(dm.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
  })

  // ══════════════════════════════════════════════════════
  // ── LOGIN SCREEN ─────────────────────────────────────
  if (step === 'login') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)' }}>
      <div style={{ ...S.card, width:380, display:'flex', flexDirection:'column', gap:20, boxShadow:'0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize:48, textAlign:'center' }}>💬</div>
        <div style={{ fontSize:24, fontWeight:700, textAlign:'center', letterSpacing:'-0.5px' }}>Chat App</div>
        <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center' }}>Entre ton pseudo pour rejoindre</div>
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={S.input}/>
        <button onClick={handleLogin} style={{ ...S.btn(), padding:14, fontSize:15 }}>Rejoindre →</button>
      </div>
    </div>
  )

  // ── SETUP SCREEN ─────────────────────────────────────
  if (step === 'setup') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)', padding:20 }}>
      <div style={{ ...S.card, width:420, display:'flex', flexDirection:'column', gap:20, boxShadow:'0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Crée ton profil 🎨</div>
        <div style={{ fontSize:13, color:'var(--muted)' }}>Personnalise ton avatar — tu pourras le changer plus tard</div>

        {/* Preview */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{avatarEmoji}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:16 }}>{user}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{bio||'Pas encore de bio'}</div>
          </div>
        </div>

        {/* Couleur avatar */}
        <div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Couleur</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {AVATAR_COLORS.map(c => <button key={c} onClick={()=>setAvatarColor(c)} style={{ width:32, height:32, borderRadius:'50%', background:c, border:avatarColor===c?'3px solid white':'3px solid transparent', cursor:'pointer' }}/>)}
          </div>
        </div>

        {/* Emoji avatar */}
        <div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Emoji</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:4 }}>
            {AVATAR_EMOJIS.map(e => <button key={e} onClick={()=>setAvatarEmoji(e)} style={{ fontSize:22, padding:4, background:avatarEmoji===e?'rgba(124,106,247,.3)':'transparent', border:'none', cursor:'pointer', borderRadius:8 }}>{e}</button>)}
          </div>
        </div>

        <input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Ta bio (optionnel)..." maxLength={60} style={S.input}/>
        <button onClick={handleSetup} style={{ ...S.btn(), padding:14, fontSize:15 }}>Commencer 🚀</button>
      </div>
    </div>
  )

  // ── MAIN APP ──────────────────────────────────────────
  const myProfile = profile || getProfile(user)

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)' }}>

      {/* SIDEBAR */}
      <div style={{ width:260, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        {/* My profile */}
        <div style={{ padding:'16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setViewProfile(myProfile)}>
          <div style={{ position:'relative' }}>
            <Avatar username={user} size={40}/>
            <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#34d399', border:'2px solid var(--bg2)' }}/>
          </div>
          <div style={{ flex:1, overflow:'hidden' }}>
            <div style={{ fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user}</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{status}</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding:'8px 8px 4px' }}>
          <button onClick={() => { setView('chat'); setDmTarget(null) }} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'none', background:view==='chat'?'rgba(124,106,247,.2)':'transparent', color:view==='chat'?'var(--accent2)':'var(--muted)', cursor:'pointer', textAlign:'left', fontSize:14, fontFamily:'inherit', fontWeight:view==='chat'?600:400, display:'flex', alignItems:'center', gap:8 }}>
            💬 Chat général
          </button>
        </div>

        {/* DMs */}
        <div style={{ padding:'4px 14px 6px' }}>
          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, letterSpacing:'.5px', textTransform:'uppercase' }}>Messages privés</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 8px' }}>
          {onlineUsers.filter(u => u.username !== user).map(u => (
            <button key={u.username} onClick={() => openDM(u.username)} style={{ width:'100%', padding:'8px 10px', borderRadius:10, border:'none', background:view==='dm'&&dmTarget===u.username?'rgba(124,106,247,.2)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'relative' }}>
                <Avatar username={u.username} size={32}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:'#34d399', border:'2px solid var(--bg2)' }}/>
              </div>
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.username}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>En ligne</div>
              </div>
            </button>
          ))}
          {onlineUsers.filter(u => u.username !== user).length === 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>Aucun utilisateur en ligne</div>
          )}
        </div>

        {/* Online count */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)' }}>
          <button onClick={() => setShowOnline(p=>!p)} style={{ background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.3)', borderRadius:20, padding:'5px 12px', fontSize:12, color:'#34d399', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, width:'100%', justifyContent:'center' }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:'#34d399',display:'inline-block' }}/>{onlineUsers.length} en ligne
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <header style={{ padding:'12px 20px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="pulse-dot" style={{ width:9,height:9,borderRadius:'50%',background:'#34d399' }}/>
            <div>
              <div style={{ fontWeight:600, fontSize:15 }}>
                {view === 'dm' && dmTarget ? `💬 DM avec ${dmTarget}` : '🌐 Chat général'}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{status}</div>
            </div>
          </div>
          {view === 'dm' && dmTarget && (
            <button onClick={() => setViewProfile(getProfile(dmTarget))} style={{ ...S.iconBtn, width:'auto', padding:'6px 14px', gap:8, fontSize:13, color:'var(--text)' }}>
              <Avatar username={dmTarget} size={24}/> Voir le profil
            </button>
          )}
        </header>

        {/* Online panel */}
        {showOnline && (
          <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'10px 20px', display:'flex', flexWrap:'wrap', gap:8 }}>
            {onlineUsers.map(u => (
              <div key={u.username} onClick={() => { setViewProfile(getProfile(u.username)); setShowOnline(false) }} style={{ display:'flex',alignItems:'center',gap:6,background:'var(--bg3)',borderRadius:20,padding:'4px 12px',fontSize:13,cursor:'pointer' }}>
                <Avatar username={u.username} size={22}/>
                {u.username}{u.username===user&&<span style={{ fontSize:10,color:'var(--muted)' }}> (moi)</span>}
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={messagesRef} style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
          {view === 'chat' ? renderMsgs(messages).flat() : renderDMs(dms)}
        </div>

        {/* Input */}
        <div style={{ padding:'12px 16px 16px', background:'var(--bg2)', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, position:'relative' }}>
          {selectedFile && (
            <div style={{ background:'var(--bg3)', border:'1px solid rgba(124,106,247,.4)', borderRadius:10, padding:'9px 13px', fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>📎 {selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} style={{ background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:15 }}>✕</button>
            </div>
          )}

          {/* Picker */}
          {pickerOpen && (
            <div style={{ position:'absolute', bottom:72, left:16, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:18, padding:12, width:320, maxHeight:360, overflowY:'auto', boxShadow:'0 20px 50px rgba(0,0,0,.55)', zIndex:50 }} className="pop-up">
              <div style={{ display:'flex', gap:4, marginBottom:10, position:'sticky', top:0, background:'var(--bg2)', paddingBottom:6 }}>
                {(['emoji','sticker','custom','create'] as const).map(t => (
                  <button key={t} onClick={() => setPickerTab(t)} style={{ flex:1, padding:'5px 2px', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:11, background:pickerTab===t?'rgba(124,106,247,.2)':'transparent', color:pickerTab===t?'var(--accent2)':'var(--muted)', fontWeight:pickerTab===t?600:400 }}>
                    {t==='emoji'?'😊':t==='sticker'?'✨':t==='custom'?'⭐':'➕'}
                  </button>
                ))}
              </div>

              {pickerTab === 'emoji' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:2 }}>
                  {EMOJIS.map(e => <button key={e} onClick={() => insertEmoji(e)} style={{ fontSize:22,padding:4,border:'none',background:'transparent',cursor:'pointer',borderRadius:8,lineHeight:1 }} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>)}
                </div>
              )}

              {pickerTab === 'sticker' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
                  {STICKERS.map(s => <button key={s} onClick={() => sendSticker(s)} style={{ fontSize:32,padding:6,border:'none',background:'transparent',cursor:'pointer',borderRadius:10,lineHeight:1 }} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.15)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}
                </div>
              )}

              {pickerTab === 'custom' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {customStickers.length === 0 && <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>Aucun sticker custom encore.<br/>Crée-en un ! ➕</div>}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                    {customStickers.map(s => (
                      <button key={s.id} onClick={() => sendSticker(s.content, true)} style={{ background:s.bg_color, color:s.text_color, border:'none', borderRadius:12, padding:'10px 8px', cursor:'pointer', fontWeight:700, fontSize:14, lineHeight:1.3, wordBreak:'break-word' }}>
                        {s.content}
                        <div style={{ fontSize:10, opacity:.7, marginTop:3 }}>par {s.creator}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pickerTab === 'create' && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>Crée ton sticker</div>
                  <textarea value={csText} onChange={e=>setCsText(e.target.value)} placeholder="Texte du sticker..." maxLength={40} style={{ ...S.input, height:70, resize:'none' }}/>
                  <div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>Couleur fond</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {AVATAR_COLORS.map(c => <button key={c} onClick={()=>setCsBg(c)} style={{ width:28,height:28,borderRadius:'50%',background:c,border:csBg===c?'3px solid white':'2px solid transparent',cursor:'pointer' }}/>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>Couleur texte</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {['#ffffff','#000000','#fbbf24','#34d399','#f87171'].map(c => <button key={c} onClick={()=>setCsColor(c)} style={{ width:28,height:28,borderRadius:'50%',background:c,border:csColor===c?'3px solid var(--accent)':'2px solid var(--border)',cursor:'pointer' }}/>)}
                    </div>
                  </div>
                  {csText && <div style={{ background:csBg, color:csColor, borderRadius:12, padding:'10px 14px', fontWeight:700, fontSize:15, textAlign:'center' }}>{csText}</div>}
                  <button onClick={createCustomSticker} style={{ ...S.btn(), padding:10, fontSize:13 }}>Créer le sticker ✨</button>
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => setPickerOpen(p=>!p)} style={S.iconBtn}>😊</button>
            <button onClick={() => fileRef.current?.click()} style={S.iconBtn}>📎</button>
            <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>25*1024*1024){toast$('Max 25 Mo');return}setSelectedFile(f)}}}/>
            <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder={view==='dm'&&dmTarget?`Message privé à ${dmTarget}...`:"Message... (Entrée pour envoyer)"} style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:14, padding:'10px 15px', color:'var(--text)', fontFamily:'inherit', fontSize:14, outline:'none', resize:'none', height:40, maxHeight:110, lineHeight:1.4 }} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <button onClick={send} disabled={sending} style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#7c6af7,#a78bfa)',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:sending?.5:1,flexShrink:0,boxShadow:'0 4px 14px rgba(124,106,247,.4)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE MODAL */}
      {viewProfile && (
        <div onClick={() => setViewProfile(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div onClick={e=>e.stopPropagation()} style={{ ...S.card, width:320, display:'flex', flexDirection:'column', gap:16, boxShadow:'0 30px 80px rgba(0,0,0,.6)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:64,height:64,borderRadius:'50%',background:viewProfile.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30 }}>{viewProfile.avatar_emoji}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:18 }}>{viewProfile.username}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{viewProfile.bio||'Pas de bio'}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {viewProfile.username !== user && (
                <button onClick={() => { openDM(viewProfile.username); setViewProfile(null) }} style={{ ...S.btn(), flex:1, padding:10, fontSize:13 }}>💬 Envoyer un DM</button>
              )}
              {viewProfile.username === user && (
                <button onClick={() => { setStep('setup'); setViewProfile(null) }} style={{ ...S.btn('var(--bg3)','var(--text)'), flex:1, padding:10, fontSize:13 }}>✏️ Modifier le profil</button>
              )}
              <button onClick={() => setViewProfile(null)} style={{ ...S.btn('var(--bg3)','var(--muted)'), padding:'10px 14px', fontSize:13 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{ position:'fixed',bottom:80,left:'50%',transform:`translateX(-50%) translateY(${toastVisible?0:14}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 18px',fontSize:13,opacity:toastVisible?1:0,transition:'all .25s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)' }}>{toast}</div>
    </div>
  )
}
