'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── TYPES ─────────────────────────────────────────────
type Msg = {
  id: string; seq_id: number; username: string; content: string | null
  file_url: string | null; file_name: string | null
  is_sticker: boolean; is_custom_sticker?: boolean
  msg_type: string; created_at: string
  reply_to?: string | null; reply_preview?: string | null; reply_author?: string | null
}
type DM = {
  id: string; seq_id: number; from_user: string; to_user: string
  content: string | null; file_url: string | null; file_name: string | null
  is_sticker: boolean; created_at: string
  reply_to?: string | null; reply_preview?: string | null; reply_author?: string | null
}
type Profile = { username: string; avatar_color: string; avatar_emoji: string; bio: string; theme: string; status: string }
type Reaction = { id: string; message_id: string; username: string; emoji: string }
type CustomSticker = { id: string; creator: string; content: string; bg_color: string; text_color: string }
type Presence = { username: string; is_online: boolean; last_seen: string }
type PinnedConvo = { id: string; owner: string; target: string; custom_name: string | null }

// ── THEMES ────────────────────────────────────────────
const THEMES: Record<string, Record<string, string>> = {
  dark:    { '--bg':'#0d0d12', '--bg2':'#15151d', '--bg3':'#1c1c27', '--border':'rgba(255,255,255,0.07)', '--text':'#e4e2f0', '--muted':'#7a7891', '--accent':'#7c6af7', '--accent2':'#a78bfa', '--me-bubble':'linear-gradient(135deg,#6c5ce7,#a78bfa)', '--me-text':'#fff' },
  light:   { '--bg':'#f0f2f5', '--bg2':'#ffffff', '--bg3':'#e9ebee', '--border':'rgba(0,0,0,0.08)', '--text':'#1c1e21', '--muted':'#65676b', '--accent':'#1877f2', '--accent2':'#2d88ff', '--me-bubble':'linear-gradient(135deg,#1877f2,#2d88ff)', '--me-text':'#fff' },
  cod:     { '--bg':'#0a0c08', '--bg2':'#111410', '--bg3':'#1a1d16', '--border':'rgba(180,140,0,0.2)', '--text':'#e8ddb5', '--muted':'#8a7a50', '--accent':'#c8a200', '--accent2':'#f0c400', '--me-bubble':'linear-gradient(135deg,#5a4500,#c8a200)', '--me-text':'#fff' },
  neon:    { '--bg':'#050510', '--bg2':'#0a0a1a', '--bg3':'#0f0f25', '--border':'rgba(0,255,200,0.15)', '--text':'#e0fff8', '--muted':'#4a8a7a', '--accent':'#00ffc8', '--accent2':'#00e5b4', '--me-bubble':'linear-gradient(135deg,#004d3d,#00ffc8)', '--me-text':'#000' },
  purple:  { '--bg':'#0e0816', '--bg2':'#160e22', '--bg3':'#1e1430', '--border':'rgba(180,0,255,0.15)', '--text':'#f0e6ff', '--muted':'#8060aa', '--accent':'#b400ff', '--accent2':'#d060ff', '--me-bubble':'linear-gradient(135deg,#6600aa,#b400ff)', '--me-text':'#fff' },
  sunset:  { '--bg':'#120808', '--bg2':'#1e0e0e', '--bg3':'#2a1414', '--border':'rgba(255,80,0,0.15)', '--text':'#ffe8d6', '--muted':'#9a5a40', '--accent':'#ff5500', '--accent2':'#ff7733', '--me-bubble':'linear-gradient(135deg,#8a2200,#ff5500)', '--me-text':'#fff' },
}

const THEME_LABELS: Record<string, string> = {
  dark:'🌙 Sombre', light:'☀️ Clair', cod:'🎮 Call of Duty', neon:'⚡ Neon', purple:'💜 Violet', sunset:'🌅 Sunset'
}

// ── DATA ──────────────────────────────────────────────
const AVATAR_COLORS = ['#7c6af7','#f97316','#06b6d4','#10b981','#ec4899','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#84cc16']
const AVATAR_EMOJIS_NORMAL = ['😊','😎','🤩','🥳','😏','🤓','😈','👻','🦁','🐯','🦊','🐺','🦋','🎭','🎪','🎨','🚀','⚡','🌟','💎']
const AVATAR_EMOJIS_COD = ['🪖','💀','🔫','🎯','💣','🧨','🛡️','⚔️','🪃','🔪','🎖️','🏴','💥','🚁','🪖','🎮','👊','🦅','🌑','☠️']
const QUICK_REACTIONS = ['❤️','😂','😮','😢','😡','👍','🔥','💯']
const FILE_ICONS: Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📋',rar:'🗜️',pptx:'📊'}

const EMOJIS = ['😀','😂','🥹','😊','😍','🥰','😎','🤩','😏','😢','😭','🥺','😡','🤬','😱','🤯','🥳','😴','🤗','🫡','😌','😋','🤓','😈','👻','💀','🤡','🫠','🙄','😤','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','💯','✅','❌','⚡','🌈','🎯','💎','🎉','🎊','🥳','🎈','🎁','🏆','🥇','🎂','🍕','🍔','🎮','⚽','🏀','🎸','🎤','🎬','🍾','🥂','🍻','👍','👎','👏','🙌','🤝','🫶','🤙','👋','✋','💪','🦾','🙏','🫂','💁','🤷','🤦','🧑‍💻','👀','❤️‍🔥']
const STICKERS = ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊','😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀','❤️🥰','💕💖','😍✨','🫶💗','💌💝','🌹❤️','😘💋','🥺👉👈','💞🌸','💑🌺','📚💡','☕📖','🧑‍💻💻','✏️📝','🎓🏆','⏰📅','🧠💭','😤📚','🔬🧪','💾🖥️']
const COD_STICKERS = ['🪖💀','🔫💥','🎯✅','💣🔥','⚔️🛡️','🎖️🏆','☠️👊','🚁💣','🌑🔪','🎮💀','🦅🪖','💥🔥','🧨💥','👊☠️','🏴🔫','🎯🔥','💀🎖️','⚔️💥','🪃🎯','🛡️💪']

function colorForName(n: string) { let h=0; for(const c of n) h=c.charCodeAt(0)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length] }

// ══════════════════════════════════════════════════════
export default function ChatApp() {
  const [step, setStep] = useState<'login'|'setup'|'app'>('login')
  const [user, setUser] = useState('')
  const [profile, setProfile] = useState<Profile|null>(null)
  const [pseudo, setPseudo] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])
  const [avatarEmoji, setAvatarEmoji] = useState('😊')
  const [bio, setBio] = useState('')
  const [theme, setTheme] = useState('dark')
  const [userStatus, setUserStatus] = useState('online')
  const [codMode, setCodMode] = useState(false)

  const [view, setView] = useState<'chat'|'dm'>('chat')
  const [dmTarget, setDmTarget] = useState<string|null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [dms, setDms] = useState<DM[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([])
  const [profiles, setProfiles] = useState<Record<string,Profile>>({})
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([])
  const [pinnedConvos, setPinnedConvos] = useState<PinnedConvo[]>([])
  const [dmConvos, setDmConvos] = useState<string[]>([])

  const [text, setText] = useState('')
  const [status, setStatus] = useState('Connexion...')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'emoji'|'sticker'|'cod'|'custom'|'create'>('emoji')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [toastMsg, setToastMsg] = useState(''); const [toastOn, setToastOn] = useState(false)
  const [sending, setSending] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<string|null>(null)
  const [viewProfile, setViewProfile] = useState<Profile|null>(null)
  const [replyTo, setReplyTo] = useState<{id:string;content:string|null;author:string}|null>(null)
  const [showThemes, setShowThemes] = useState(false)
  const [pinModal, setPinModal] = useState<string|null>(null)
  const [pinName, setPinName] = useState('')
  const [csText, setCsText] = useState(''); const [csBg, setCsBg] = useState('#7c6af7'); const [csColor, setCsColor] = useState('#ffffff')
  const [swipeStart, setSwipeStart] = useState<{x:number;id:string}|null>(null)
  const [swipingId, setSwipingId] = useState<string|null>(null)

  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<NodeJS.Timeout>()
  const presTimer = useRef<NodeJS.Timeout>()

  // ── THEME APPLICATION ────────────────────────────────
  useEffect(() => {
    const vars = THEMES[theme] || THEMES.dark
    const root = document.documentElement
    Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k, v))
    if (theme === 'cod') setCodMode(true)
    else setCodMode(false)
  }, [theme])

  const toast$ = useCallback((msg: string) => {
    setToastMsg(msg); setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastOn(false), 3000)
  }, [])

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, 80)
  }, [])

  const getProfile = useCallback((username: string): Profile => {
    return profiles[username] || { username, avatar_color: colorForName(username), avatar_emoji: '😊', bio: '', theme: 'dark', status: 'online' }
  }, [profiles])

  const loadOnline = useCallback(async () => {
    const since = new Date(Date.now() - 30000).toISOString()
    const { data } = await supabase.from('presence').select('*').eq('is_online', true).gte('last_seen', since)
    setOnlineUsers(data || [])
  }, [])

  const ping = useCallback(async (username: string) => {
    await supabase.from('presence').upsert({ username, last_seen: new Date().toISOString(), is_online: true }, { onConflict: 'username' })
  }, [])

  const loadAllProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*')
    if (data) { const m: Record<string,Profile>={};data.forEach((p:Profile)=>{m[p.username]=p});setProfiles(m) }
  }, [])

  const loadPinned = useCallback(async (u: string) => {
    const { data } = await supabase.from('pinned_convos').select('*').eq('owner', u)
    setPinnedConvos(data || [])
  }, [])

  // ── AUTO LOGIN ────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('chat_user')
    const savedTheme = localStorage.getItem('chat_theme')
    if (savedTheme) setTheme(savedTheme)
    if (saved) setPseudo(saved)
  }, [])

  // ── LOGIN / SETUP ─────────────────────────────────────
  const handleLogin = async () => {
    const name = pseudo.trim(); if (!name) return
    const saved = localStorage.getItem('chat_user')
    const target = saved || name
    const { data: p } = await supabase.from('profiles').select('*').eq('username', target).single()
    if (p) {
      setUser(target); setProfile(p); setAvatarColor(p.avatar_color); setAvatarEmoji(p.avatar_emoji)
      setBio(p.bio); setTheme(p.theme||'dark'); setUserStatus(p.status||'online')
      localStorage.setItem('chat_user', target); setStep('app')
    } else {
      setUser(name); setStep('setup')
    }
  }

  const handleSetup = async () => {
    const p: Profile = { username: user, avatar_color: avatarColor, avatar_emoji: avatarEmoji, bio, theme, status: userStatus }
    await supabase.from('profiles').upsert(p, { onConflict: 'username' })
    setProfile(p); localStorage.setItem('chat_user', user); localStorage.setItem('chat_theme', theme); setStep('app')
  }

  const saveTheme = async (t: string) => {
    setTheme(t); localStorage.setItem('chat_theme', t)
    if (user) await supabase.from('profiles').upsert({ username: user, avatar_color: avatarColor, avatar_emoji: avatarEmoji, bio, theme: t, status: userStatus }, { onConflict: 'username' })
  }

  // ── INIT ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'app') return
    const init = async () => {
      setStatus('Chargement...')
      await ping(user); await loadOnline(); await loadAllProfiles(); await loadPinned(user)
      const { data: msgs } = await supabase.from('messages').select('*').order('seq_id',{ascending:true}).limit(200)
      setMessages(msgs||[])
      const { data: rxns } = await supabase.from('reactions').select('*')
      setReactions(rxns||[])
      const { data: cs } = await supabase.from('custom_stickers').select('*').order('created_at',{ascending:false})
      setCustomStickers(cs||[])
      // Charger liste des convos DM
      const { data: dmsData } = await supabase.from('dms').select('from_user,to_user').or(`from_user.eq.${user},to_user.eq.${user}`)
      if (dmsData) {
        const convos = new Set<string>()
        dmsData.forEach((d:any) => { convos.add(d.from_user===user?d.to_user:d.from_user) })
        setDmConvos(Array.from(convos))
      }
      await supabase.from('messages').insert({ username:user, content:`${user} a rejoint le chat 👋`, file_url:null, file_name:null, is_sticker:false, msg_type:'join' })
      setStatus('🟢 Connecté'); scrollBottom()
      if (Notification.permission==='default') Notification.requestPermission()
    }
    init()
    presTimer.current = setInterval(()=>{ping(user);loadOnline()},15000)

    const msgCh = supabase.channel('msgs-v3').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{
      setMessages(prev=>[...prev,p.new as Msg]); scrollBottom()
      if(document.hidden&&p.new.msg_type==='message'&&Notification.permission==='granted')
        new Notification(`💬 ${p.new.username}`,{body:p.new.content||'📎 Fichier'})
    }).subscribe(st=>{if(st==='SUBSCRIBED')setStatus('🟢 Connecté')})

    const dmCh = supabase.channel('dms-v3').on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},p=>{
      const dm=p.new as DM
      if(dm.from_user===user||dm.to_user===user){
        setDms(prev=>[...prev,dm]); scrollBottom()
        const other = dm.from_user===user?dm.to_user:dm.from_user
        setDmConvos(prev=>prev.includes(other)?prev:[...prev,other])
        if(document.hidden&&dm.from_user!==user&&Notification.permission==='granted')
          new Notification(`🔒 DM de ${dm.from_user}`,{body:dm.content||'📎 Fichier'})
      }
    }).subscribe()

    const rxCh = supabase.channel('rx-v3').on('postgres_changes',{event:'*',schema:'public',table:'reactions'},()=>{
      supabase.from('reactions').select('*').then(({data})=>{if(data)setReactions(data)})
    }).subscribe()

    const csCh = supabase.channel('cs-v3').on('postgres_changes',{event:'INSERT',schema:'public',table:'custom_stickers'},p=>{
      setCustomStickers(prev=>[p.new as CustomSticker,...prev])
    }).subscribe()

    const presCh = supabase.channel('pres-v3').on('postgres_changes',{event:'*',schema:'public',table:'presence'},()=>loadOnline()).subscribe()
    const profCh = supabase.channel('prof-v3').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>loadAllProfiles()).subscribe()

    const bye=()=>{
      supabase.from('presence').upsert({username:user,last_seen:new Date().toISOString(),is_online:false},{onConflict:'username'})
      supabase.from('messages').insert({username:user,content:`${user} a quitté le chat`,file_url:null,file_name:null,is_sticker:false,msg_type:'leave'})
    }
    window.addEventListener('beforeunload',bye)
    return ()=>{
      [msgCh,dmCh,rxCh,csCh,presCh,profCh].forEach(c=>supabase.removeChannel(c))
      clearInterval(presTimer.current)
      window.removeEventListener('beforeunload',bye)
    }
  },[step,user,scrollBottom,ping,loadOnline,loadAllProfiles,loadPinned])

  // ── DM LOAD ───────────────────────────────────────────
  useEffect(()=>{
    if(!dmTarget||!user)return
    supabase.from('dms').select('*').or(`and(from_user.eq.${user},to_user.eq.${dmTarget}),and(from_user.eq.${dmTarget},to_user.eq.${user})`).order('seq_id',{ascending:true}).then(({data})=>{setDms(data||[]);scrollBottom()})
  },[dmTarget,user,scrollBottom])

  // ── SEND ──────────────────────────────────────────────
  const send = async () => {
    if(!text.trim()&&!selectedFile)return
    setSending(true)
    let file_url=null,file_name=null
    if(selectedFile){const r=await upload(selectedFile);if(!r){setSending(false);return};file_url=r.url;file_name=r.name}
    const replyData = replyTo ? { reply_to:replyTo.id, reply_preview:replyTo.content?.slice(0,60)||'📎', reply_author:replyTo.author } : {}
    if(view==='dm'&&dmTarget)
      await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content:text.trim()||null,file_url,file_name,is_sticker:false,...replyData})
    else
      await supabase.from('messages').insert({username:user,content:text.trim()||null,file_url,file_name,is_sticker:false,msg_type:'message',...replyData})
    setText('');setSelectedFile(null);setPickerOpen(false);setReplyTo(null)
    if(inputRef.current)inputRef.current.style.height='40px'
    setSending(false);inputRef.current?.focus()
  }

  const sendSticker = async(content:string,isCustom=false)=>{
    setPickerOpen(false)
    const replyData = replyTo ? {reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)
      await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content,is_sticker:true,...replyData})
    else
      await supabase.from('messages').insert({username:user,content,is_sticker:true,is_custom_sticker:isCustom,msg_type:'message',...replyData})
    setReplyTo(null)
  }

  const createCustomSticker = async()=>{
    if(!csText.trim())return
    await supabase.from('custom_stickers').insert({creator:user,content:csText.trim(),bg_color:csBg,text_color:csColor})
    toast$('✅ Sticker créé !');setCsText('')
  }

  // ── REACTIONS ─────────────────────────────────────────
  const toggleReaction=async(msgId:string,emoji:string)=>{
    setReactionTarget(null)
    const existing=reactions.find(r=>r.message_id===msgId&&r.username===user&&r.emoji===emoji)
    if(existing) await supabase.from('reactions').delete().eq('id',existing.id)
    else await supabase.from('reactions').insert({message_id:msgId,username:user,emoji})
  }

  const msgReactions=(msgId:string)=>{
    const g:Record<string,string[]>={}
    reactions.filter(r=>r.message_id===msgId).forEach(r=>{if(!g[r.emoji])g[r.emoji]=[];g[r.emoji].push(r.username)})
    return g
  }

  // ── UPLOAD ────────────────────────────────────────────
  const upload=async(file:File)=>{
    toast$('⏫ Upload...')
    const path=`${Date.now()}_${file.name.replace(/[^\w._-]/g,'_')}`
    const{error}=await supabase.storage.from('chat-files').upload(path,file,{upsert:false})
    if(error){toast$('Erreur upload');return null}
    const{data}=supabase.storage.from('chat-files').getPublicUrl(path)
    toast$('✅ Envoyé !');return{url:data.publicUrl,name:file.name}
  }

  // ── PIN ───────────────────────────────────────────────
  const pinConvo=async(target:string,name:string)=>{
    await supabase.from('pinned_convos').upsert({owner:user,target,custom_name:name||null},{onConflict:'owner,target'})
    await loadPinned(user);setPinModal(null);toast$('📌 Épinglé !')
  }
  const unpinConvo=async(target:string)=>{
    await supabase.from('pinned_convos').delete().eq('owner',user).eq('target',target)
    await loadPinned(user);toast$('Désépinglé')
  }
  const isPinned=(target:string)=>pinnedConvos.some(p=>p.target===target)
  const getPinName=(target:string)=>pinnedConvos.find(p=>p.target===target)?.custom_name||null

  // ── SWIPE TO REPLY ────────────────────────────────────
  const onTouchStart=(e:React.TouchEvent,id:string)=>{
    setSwipeStart({x:e.touches[0].clientX,id})
  }
  const onTouchMove=(e:React.TouchEvent,msg:{id:string;content:string|null;username:string})=>{
    if(!swipeStart||swipeStart.id!==msg.id)return
    const dx=e.touches[0].clientX-swipeStart.x
    if(Math.abs(dx)>40){setSwipingId(msg.id)}
  }
  const onTouchEnd=(msg:{id:string;content:string|null;username:string})=>{
    if(swipingId===msg.id){
      setReplyTo({id:msg.id,content:msg.content,author:msg.username})
      inputRef.current?.focus()
    }
    setSwipeStart(null);setSwipingId(null)
  }

  const handleKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}
  }
  const autoResize=(el:HTMLTextAreaElement)=>{el.style.height='40px';el.style.height=Math.min(el.scrollHeight,110)+'px'}
  const insertEmoji=(e:string)=>{
    if(!inputRef.current)return
    const el=inputRef.current,s=el.selectionStart??el.value.length,en=el.selectionEnd??el.value.length
    setText(el.value.slice(0,s)+e+el.value.slice(en))
    setTimeout(()=>{el.selectionStart=el.selectionEnd=s+e.length;el.focus()},0)
  }
  const openDM=(username:string)=>{if(username===user)return;setDmTarget(username);setView('dm');setViewProfile(null)}

  const statusEmoji=(s:string)=>({online:'🟢',away:'🌙',busy:'🔴',gaming:'🎮'}[s]||'🟢')

  // ── AVATAR COMPONENT ──────────────────────────────────
  const Avatar=({username,size=36,onClick}:{username:string;size?:number;onClick?:()=>void})=>{
    const p=getProfile(username)
    const pres=onlineUsers.find(u=>u.username===username)
    return(
      <div onClick={onClick} style={{position:'relative',flexShrink:0,cursor:onClick?'pointer':'default'}}>
        <div style={{width:size,height:size,borderRadius:'50%',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.44,userSelect:'none',transition:'transform .2s'}}
          onMouseEnter={e=>onClick&&((e.currentTarget as HTMLElement).style.transform='scale(1.08)')}
          onMouseLeave={e=>onClick&&((e.currentTarget as HTMLElement).style.transform='scale(1)')}>
          {p.avatar_emoji}
        </div>
        {pres&&<div style={{position:'absolute',bottom:1,right:1,width:size*.28,height:size*.28,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)',boxShadow:'0 0 6px #34d39977'}}/>}
      </div>
    )
  }

  // ── RENDER MSG ────────────────────────────────────────
  let lastDate=''
  const renderMsgs=(msgs:Msg[])=>msgs.flatMap((msg,i)=>{
    const date=new Date(msg.created_at)
    const dStr=date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
    const isMe=msg.username===user
    const rxns=msgReactions(msg.id)
    const hasRxns=Object.keys(rxns).length>0
    const ext=(msg.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    const items:React.ReactNode[]=[]

    if(dStr!==lastDate){
      lastDate=dStr
      items.push(<div key={`d${i}`} style={{display:'flex',alignItems:'center',gap:10,color:'var(--muted)',fontSize:11,margin:'10px 0'}}><div style={{flex:1,height:1,background:'var(--border)'}}/>  {dStr}<div style={{flex:1,height:1,background:'var(--border)'}}/></div>)
    }

    if(msg.msg_type==='join'||msg.msg_type==='leave'){
      items.push(<div key={msg.id} style={{textAlign:'center',padding:'3px 0',animation:'fadeIn .4s ease'}}><span style={{background:msg.msg_type==='join'?'rgba(52,211,153,.1)':'rgba(248,113,113,.1)',border:`1px solid ${msg.msg_type==='join'?'rgba(52,211,153,.3)':'rgba(248,113,113,.3)'}`,borderRadius:20,padding:'3px 14px',fontSize:12,color:'var(--muted)'}}>{msg.msg_type==='join'?'🟢':'🔴'} {msg.content}</span></div>)
      return items
    }

    const p=getProfile(msg.username)
    const cs=customStickers.find(s=>s.content===msg.content)
    const isSwiping=swipingId===msg.id

    items.push(
      <div key={msg.id}
        style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isMe?'row-reverse':'row',position:'relative',animation:'slideUp .25s cubic-bezier(.34,1.56,.64,1)',transform:isSwiping?(isMe?'translateX(-40px)':'translateX(40px)'):'translateX(0)',transition:'transform .2s'}}
        onMouseLeave={()=>setReactionTarget(null)}
        onTouchStart={e=>onTouchStart(e,msg.id)}
        onTouchMove={e=>onTouchMove(e,{id:msg.id,content:msg.content,username:msg.username})}
        onTouchEnd={()=>onTouchEnd({id:msg.id,content:msg.content,username:msg.username})}
      >
        {isSwiping&&<div style={{position:'absolute',[isMe?'right':'left']:0,top:'50%',transform:'translateY(-50%)',fontSize:20,opacity:.7}}>↩️</div>}
        <Avatar username={msg.username} size={32} onClick={()=>setViewProfile(p)}/>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'65%',alignItems:isMe?'flex-end':'flex-start'}}>
          {!isMe&&<div style={{fontSize:11,color:'var(--muted)',padding:'0 4px',fontWeight:500,cursor:'pointer'}} onClick={()=>setViewProfile(p)}>{msg.username}</div>}

          {/* Reply preview */}
          {msg.reply_author&&msg.reply_preview&&(
            <div style={{background:'var(--bg3)',borderLeft:`3px solid var(--accent)`,borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2,maxWidth:'100%',overflow:'hidden'}}>
              <div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {msg.reply_author}</div>
              <div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{msg.reply_preview}</div>
            </div>
          )}

          <div style={{position:'relative'}} onMouseEnter={()=>setReactionTarget(msg.id)}>
            {msg.file_url&&(isImage
              ?<img src={msg.file_url} alt="" style={{maxWidth:260,maxHeight:200,borderRadius:14,cursor:'pointer',display:'block',boxShadow:'0 4px 20px rgba(0,0,0,.3)'}} onClick={()=>window.open(msg.file_url!,'_blank')}/>
              :<a href={msg.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'11px 15px',display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'var(--text)'}}>
                <div style={{width:34,height:34,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{FILE_ICONS[ext]||'📎'}</div>
                <div><div style={{fontSize:13,fontWeight:500}}>{msg.file_name}</div><div style={{fontSize:11,color:'var(--muted)'}}>Télécharger</div></div>
              </a>
            )}
            {msg.content&&(msg.is_sticker
              ?<div style={{fontSize:msg.is_custom_sticker?16:52,lineHeight:1,padding:msg.is_custom_sticker?'10px 16px':4,background:msg.is_custom_sticker?(cs?.bg_color||'#7c6af7'):'transparent',borderRadius:msg.is_custom_sticker?16:0,color:msg.is_custom_sticker?(cs?.text_color||'white'):undefined,fontWeight:msg.is_custom_sticker?700:undefined,boxShadow:msg.is_custom_sticker?'0 4px 16px rgba(0,0,0,.3)':undefined,transform:'scale(1)',transition:'transform .15s',cursor:'default'}}
                  onMouseEnter={e=>{if(msg.is_sticker)(e.currentTarget as HTMLElement).style.transform='scale(1.08)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)'}}>{msg.content}</div>
              :<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,lineHeight:1.6,wordBreak:'break-word',background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)',boxShadow:isMe?'0 4px 16px rgba(0,0,0,.2)':'none',transition:'box-shadow .2s'}}>{msg.content}</div>
            )}

            {/* Hover reactions */}
            {reactionTarget===msg.id&&(
              <div style={{position:'absolute',[isMe?'right':'left']:0,bottom:'100%',marginBottom:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:30,padding:'5px 8px',display:'flex',gap:2,zIndex:10,boxShadow:'0 8px 24px rgba(0,0,0,.5)',animation:'popIn .15s cubic-bezier(.34,1.56,.64,1)'}}>
                {QUICK_REACTIONS.map(e=>(
                  <button key={e} onClick={()=>toggleReaction(msg.id,e)} style={{fontSize:20,background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:8,transform:reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?'scale(1.25)':'scale(1)',transition:'transform .15s',filter:reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?'drop-shadow(0 0 4px rgba(255,200,0,.6))':'none'}}>{e}</button>
                ))}
                <button onClick={()=>setReplyTo({id:msg.id,content:msg.content,author:msg.username})} style={{fontSize:16,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:8,color:'var(--muted)',fontFamily:'inherit'}}>↩️</button>
              </div>
            )}
          </div>

          {hasRxns&&(
            <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'0 4px'}}>
              {Object.entries(rxns).map(([emoji,users])=>(
                <button key={emoji} onClick={()=>toggleReaction(msg.id,emoji)} title={users.join(', ')} style={{background:users.includes(user)?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${users.includes(user)?'rgba(124,106,247,.5)':'var(--border)'}`,borderRadius:20,padding:'2px 8px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:'all .15s',transform:users.includes(user)?'scale(1.05)':'scale(1)'}}>
                  {emoji}<span style={{fontSize:11,color:'var(--muted)'}}>{users.length}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
    return items
  })

  const renderDMs=(dms:DM[])=>dms.map(dm=>{
    const isMe=dm.from_user===user
    const ext=(dm.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    return(
      <div key={dm.id} style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isMe?'row-reverse':'row',animation:'slideUp .25s cubic-bezier(.34,1.56,.64,1)'}}>
        <Avatar username={dm.from_user} size={30}/>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'65%',alignItems:isMe?'flex-end':'flex-start'}}>
          {dm.reply_author&&dm.reply_preview&&(
            <div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2}}>
              <div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {dm.reply_author}</div>
              <div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{dm.reply_preview}</div>
            </div>
          )}
          {dm.file_url&&(isImage?<img src={dm.file_url} alt="" style={{maxWidth:240,borderRadius:14,cursor:'pointer'}} onClick={()=>window.open(dm.file_url!,'_blank')}/>:<a href={dm.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',textDecoration:'none',color:'var(--text)',fontSize:13}}>📎 {dm.file_name}</a>)}
          {dm.content&&(dm.is_sticker?<div style={{fontSize:46,lineHeight:1}}>{dm.content}</div>:<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{dm.content}</div>)}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{new Date(dm.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
  })

  // ── LOGIN ─────────────────────────────────────────────
  if(step==='login')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'44px 40px',width:380,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 30px 80px rgba(0,0,0,.6)',animation:'slideUp .4s cubic-bezier(.34,1.56,.64,1)'}}>
        <div style={{fontSize:52,textAlign:'center',animation:'bounce .6s ease'}}>💬</div>
        <div style={{fontSize:24,fontWeight:700,textAlign:'center',letterSpacing:'-0.5px'}}>Chat App</div>
        <div style={{fontSize:13,color:'var(--muted)',textAlign:'center'}}>Entre ton pseudo pour rejoindre</div>
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:15,outline:'none',transition:'border-color .2s'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
        <button onClick={handleLogin} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'transform .1s,opacity .2s',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.02)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>Rejoindre →</button>
      </div>
    </div>
  )

  // ── SETUP ─────────────────────────────────────────────
  if(step==='setup')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)',padding:20,overflowY:'auto'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'36px 32px',width:440,display:'flex',flexDirection:'column',gap:18,boxShadow:'0 30px 80px rgba(0,0,0,.6)',animation:'slideUp .4s ease'}}>
        <div style={{fontSize:22,fontWeight:700}}>Crée ton profil 🎨</div>

        {/* Preview */}
        <div style={{display:'flex',alignItems:'center',gap:14,background:'var(--bg3)',borderRadius:16,padding:'14px 16px'}}>
          <div style={{width:60,height:60,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,boxShadow:`0 4px 16px ${avatarColor}66`}}>{avatarEmoji}</div>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{user}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{bio||'Pas encore de bio'}</div>
            <div style={{fontSize:12,marginTop:4}}>{statusEmoji(userStatus)} {userStatus}</div>
          </div>
        </div>

        {/* Couleur */}
        <div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Couleur avatar</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {AVATAR_COLORS.map(c=><button key={c} onClick={()=>setAvatarColor(c)} style={{width:32,height:32,borderRadius:'50%',background:c,border:avatarColor===c?'3px solid white':'3px solid transparent',cursor:'pointer',transition:'transform .15s',transform:avatarColor===c?'scale(1.15)':'scale(1)',boxShadow:avatarColor===c?`0 0 10px ${c}99`:'none'}}/>)}
          </div>
        </div>

        {/* Emoji */}
        <div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Emoji avatar — Normal / CoD 🎮</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:6}}>
            {AVATAR_EMOJIS_NORMAL.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:20,padding:4,background:avatarEmoji===e?'rgba(124,106,247,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:8,transition:'transform .1s',transform:avatarEmoji===e?'scale(1.15)':'scale(1)'}}>{e}</button>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}}>
            {AVATAR_EMOJIS_COD.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:20,padding:4,background:avatarEmoji===e?'rgba(200,162,0,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:8,transition:'transform .1s',transform:avatarEmoji===e?'scale(1.15)':'scale(1)'}}>{e}</button>)}
          </div>
        </div>

        {/* Thème */}
        <div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Thème</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {Object.entries(THEME_LABELS).map(([k,v])=>(
              <button key={k} onClick={()=>{setTheme(k)}} style={{padding:'8px 6px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12,fontWeight:theme===k?600:400}}>{v}</button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Statut</div>
          <div style={{display:'flex',gap:6}}>
            {(['online','away','busy','gaming'] as const).map(s=>(
              <button key={s} onClick={()=>setUserStatus(s)} style={{flex:1,padding:'7px 4px',background:userStatus===s?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${userStatus===s?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12}}>
                {statusEmoji(s)} {s}
              </button>
            ))}
          </div>
        </div>

        <input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Ta bio (optionnel)..." maxLength={60} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}}/>
        <button onClick={handleSetup} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}}>Commencer 🚀</button>
      </div>
    </div>
  )

  // ── MAIN APP ──────────────────────────────────────────
  const myProfile=profile||getProfile(user)
  const allConvos=[...new Set([...pinnedConvos.map(p=>p.target),...dmConvos,...onlineUsers.filter(u=>u.username!==user).map(u=>u.username)])]

  return(
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>

      {/* SIDEBAR */}
      <div style={{width:260,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>

        {/* My profile */}
        <div style={{padding:'14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setViewProfile(myProfile)}>
          <div style={{position:'relative'}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:myProfile.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{myProfile.avatar_emoji}</div>
            <div style={{position:'absolute',bottom:1,right:1,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)',boxShadow:'0 0 6px #34d39977'}}/>
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{statusEmoji(userStatus)} {userStatus}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();setShowThemes(p=>!p)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)',padding:4,borderRadius:8}} title="Thème">🎨</button>
        </div>

        {/* Theme panel */}
        {showThemes&&(
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',animation:'slideDown .2s ease'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,fontWeight:600}}>THÈME</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4}}>
              {Object.entries(THEME_LABELS).map(([k,v])=>(
                <button key={k} onClick={()=>saveTheme(k)} style={{padding:'6px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg2)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11,fontWeight:theme===k?600:400,transition:'all .15s'}}>{v}</button>
              ))}
            </div>
          </div>
        )}

        {/* Chat général */}
        <div style={{padding:'6px 8px'}}>
          <button onClick={()=>{setView('chat');setDmTarget(null)}} style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'none',background:view==='chat'?'rgba(124,106,247,.2)':'transparent',color:view==='chat'?'var(--accent2)':'var(--muted)',cursor:'pointer',textAlign:'left',fontSize:14,fontFamily:'inherit',fontWeight:view==='chat'?600:400,display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>
            💬 Chat général
            <div style={{marginLeft:'auto',fontSize:11,background:view==='chat'?'var(--accent)':'var(--bg3)',color:view==='chat'?'white':'var(--muted)',borderRadius:10,padding:'1px 7px'}}>{onlineUsers.length}</div>
          </button>
        </div>

        {/* DMs */}
        <div style={{padding:'4px 14px 4px'}}>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>Messages privés</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 8px 8px'}}>
          {allConvos.map(username=>{
            const p=getProfile(username)
            const pres=onlineUsers.find(u=>u.username===username)
            const pinned=isPinned(username)
            const pinName=getPinName(username)
            const isActive=view==='dm'&&dmTarget===username
            return(
              <div key={username} style={{display:'flex',alignItems:'center',gap:2}}>
                <button onClick={()=>openDM(username)} style={{flex:1,padding:'8px 10px',borderRadius:10,border:'none',background:isActive?'rgba(124,106,247,.2)':'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,transition:'background .15s'}}>
                  <div style={{position:'relative'}}>
                    <div style={{width:34,height:34,borderRadius:'50%',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{p.avatar_emoji}</div>
                    {pres&&<div style={{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>}
                  </div>
                  <div style={{overflow:'hidden',flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',gap:4}}>
                      {pinned&&'📌'}{pinName||username}
                    </div>
                    <div style={{fontSize:11,color:pres?'#34d399':'var(--muted)'}}>{pres?`${statusEmoji(p.status||'online')} en ligne`:'hors ligne'}</div>
                  </div>
                </button>
                <button onClick={()=>{if(isPinned(username))unpinConvo(username);else{setPinModal(username);setPinName('')}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)',padding:4,borderRadius:6,opacity:.6}} title={isPinned(username)?'Désépingler':'Épingler'}>
                  {isPinned(username)?'📌':'📍'}
                </button>
              </div>
            )
          })}
          {allConvos.length===0&&<div style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'12px 0'}}>Aucune conversation</div>}
        </div>

        {/* Online count */}
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:12,color:'#34d399'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#34d399',display:'inline-block',boxShadow:'0 0 6px #34d39977'}}/>
            {onlineUsers.length} utilisateur{onlineUsers.length>1?'s':''} en ligne
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <header style={{padding:'12px 20px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 8px #34d39977',animation:'pulse 2s ease-in-out infinite'}}/>
            <div>
              <div style={{fontWeight:600,fontSize:15}}>{view==='dm'&&dmTarget?`${getProfile(dmTarget).avatar_emoji} ${getPinName(dmTarget)||dmTarget}`:'🌐 Chat général'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{status}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            {view==='dm'&&dmTarget&&(
              <>
                <button onClick={()=>setViewProfile(getProfile(dmTarget))} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'6px 12px',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12,display:'flex',alignItems:'center',gap:6}}>
                  <Avatar username={dmTarget} size={20}/> Profil
                </button>
                <button onClick={()=>{if(isPinned(dmTarget))unpinConvo(dmTarget);else{setPinModal(dmTarget);setPinName('')}}} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'6px 10px',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:13}}>
                  {isPinned(dmTarget)?'📌':'📍'}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={messagesRef} style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:8}}>
          {view==='chat'?renderMsgs(messages):renderDMs(dms)}
        </div>

        {/* Reply bar */}
        {replyTo&&(
          <div style={{padding:'8px 16px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,animation:'slideDown .2s ease'}}>
            <div style={{borderLeft:'3px solid var(--accent)',paddingLeft:10,flex:1}}>
              <div style={{fontSize:11,color:'var(--accent2)',fontWeight:600,marginBottom:2}}>↩️ Répondre à {replyTo.author}</div>
              <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{replyTo.content||'📎 Fichier'}</div>
            </div>
            <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:18,padding:4}}>✕</button>
          </div>
        )}

        {/* Input */}
        <div style={{padding:'12px 16px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8,flexShrink:0,position:'relative'}}>
          {selectedFile&&(
            <div style={{background:'var(--bg3)',border:'1px solid rgba(124,106,247,.4)',borderRadius:10,padding:'9px 13px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span>📎 {selectedFile.name}</span>
              <button onClick={()=>setSelectedFile(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:15}}>✕</button>
            </div>
          )}

          {/* Picker */}
          {pickerOpen&&(
            <div style={{position:'absolute',bottom:76,left:16,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:12,width:320,maxHeight:360,overflowY:'auto',boxShadow:'0 20px 50px rgba(0,0,0,.6)',zIndex:50,animation:'popIn .18s cubic-bezier(.34,1.56,.64,1)'}}>
              <div style={{display:'flex',gap:3,marginBottom:10,position:'sticky',top:0,background:'var(--bg2)',paddingBottom:6}}>
                {(['emoji','sticker',codMode&&'cod','custom','create'] as (string|false)[]).filter(Boolean).map(t=>(
                  <button key={t as string} onClick={()=>setPickerTab(t as any)} style={{flex:1,padding:'5px 2px',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:10,background:pickerTab===t?'rgba(124,106,247,.2)':'transparent',color:pickerTab===t?'var(--accent2)':'var(--muted)',fontWeight:pickerTab===t?600:400}}>
                    {t==='emoji'?'😊':t==='sticker'?'✨':t==='cod'?'🎮':t==='custom'?'⭐':'➕'}
                  </button>
                ))}
              </div>
              {pickerTab==='emoji'&&<div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:2}}>{EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{fontSize:22,padding:4,border:'none',background:'transparent',cursor:'pointer',borderRadius:8,lineHeight:1,transition:'transform .1s'}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.3)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>)}</div>}
              {pickerTab==='sticker'&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>{STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:32,padding:6,border:'none',background:'transparent',cursor:'pointer',borderRadius:10,lineHeight:1,transition:'transform .12s'}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}</div>}
              {pickerTab==='cod'&&(
                <div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,fontWeight:600}}>🎮 CALL OF DUTY PACK</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>
                    {COD_STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:28,padding:6,border:'none',background:'rgba(200,162,0,.1)',cursor:'pointer',borderRadius:10,lineHeight:1,transition:'transform .12s',border:'1px solid rgba(200,162,0,.2)'}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}
                  </div>
                  <div style={{marginTop:12,fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:6}}>AVATARS CoD</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}}>
                    {AVATAR_EMOJIS_COD.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{fontSize:20,padding:3,border:'none',background:'transparent',cursor:'pointer',borderRadius:6,lineHeight:1}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>)}
                  </div>
                </div>
              )}
              {pickerTab==='custom'&&(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {customStickers.length===0&&<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:16}}>Aucun sticker custom.<br/>Crée-en un ➕</div>}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                    {customStickers.map(s=>(
                      <button key={s.id} onClick={()=>sendSticker(s.content,true)} style={{background:s.bg_color,color:s.text_color,border:'none',borderRadius:12,padding:'10px 8px',cursor:'pointer',fontWeight:700,fontSize:13,lineHeight:1.3,wordBreak:'break-word',transition:'transform .1s',boxShadow:'0 2px 10px rgba(0,0,0,.3)'}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.04)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>
                        {s.content}<div style={{fontSize:10,opacity:.7,marginTop:3}}>par {s.creator}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pickerTab==='create'&&(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{fontSize:13,fontWeight:600}}>Crée ton sticker ✨</div>
                  <textarea value={csText} onChange={e=>setCsText(e.target.value)} placeholder="Texte..." maxLength={40} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',height:60,resize:'none'}}/>
                  <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Fond</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setCsBg(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:csBg===c?'3px solid white':'2px solid transparent',cursor:'pointer',transform:csBg===c?'scale(1.2)':'scale(1)',transition:'transform .1s'}}/>)}</div></div>
                  <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>Texte</div><div style={{display:'flex',gap:6}}>{['#ffffff','#000000','#fbbf24','#34d399','#f87171'].map(c=><button key={c} onClick={()=>setCsColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:csColor===c?'3px solid var(--accent)':'2px solid var(--border)',cursor:'pointer'}}/>)}</div></div>
                  {csText&&<div style={{background:csBg,color:csColor,borderRadius:12,padding:'10px 14px',fontWeight:700,fontSize:15,textAlign:'center'}}>{csText}</div>}
                  <button onClick={createCustomSticker} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:'10px',fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Créer ✨</button>
                </div>
              )}
            </div>
          )}

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setPickerOpen(p=>!p)} style={{width:38,height:38,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}>😊</button>
            <button onClick={()=>fileRef.current?.click()} style={{width:38,height:38,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}>📎</button>
            <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>25*1024*1024){toast$('Max 25 Mo');return}setSelectedFile(f)}}}/>
            <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder={view==='dm'&&dmTarget?`Message privé à ${getPinName(dmTarget)||dmTarget}...`:'Message... (Entrée pour envoyer)'} style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 15px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',resize:'none',height:40,maxHeight:110,lineHeight:1.4,transition:'border-color .2s'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <button onClick={send} disabled={sending} style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending?.5:1,boxShadow:'0 4px 14px rgba(124,106,247,.4)',transition:'transform .1s,opacity .2s'}} onMouseEnter={e=>{if(!sending)(e.currentTarget as HTMLElement).style.transform='scale(1.08)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* PROFILE MODAL */}
      {viewProfile&&(
        <div onClick={()=>setViewProfile(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:24,padding:28,width:320,display:'flex',flexDirection:'column',gap:16,boxShadow:'0 30px 80px rgba(0,0,0,.7)',animation:'popIn .2s cubic-bezier(.34,1.56,.64,1)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:68,height:68,borderRadius:'50%',background:viewProfile.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,boxShadow:`0 4px 20px ${viewProfile.avatar_color}66`}}>{viewProfile.avatar_emoji}</div>
              <div>
                <div style={{fontWeight:700,fontSize:18}}>{viewProfile.username}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{viewProfile.bio||'Pas de bio'}</div>
                <div style={{fontSize:12,marginTop:4}}>{statusEmoji(viewProfile.status||'online')} {viewProfile.status||'online'}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              {viewProfile.username!==user&&(
                <button onClick={()=>{openDM(viewProfile.username);setViewProfile(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>💬 DM</button>
              )}
              {viewProfile.username===user&&(
                <button onClick={()=>{setStep('setup');setViewProfile(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:12,padding:10,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✏️ Modifier</button>
              )}
              <button onClick={()=>setViewProfile(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {pinModal&&(
        <div onClick={()=>setPinModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:300,display:'flex',flexDirection:'column',gap:14,boxShadow:'0 20px 60px rgba(0,0,0,.6)',animation:'popIn .2s cubic-bezier(.34,1.56,.64,1)'}}>
            <div style={{fontWeight:700,fontSize:16}}>📌 Épingler {pinModal}</div>
            <input value={pinName} onChange={e=>setPinName(e.target.value)} placeholder="Nom personnalisé (optionnel)" maxLength={30} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>pinConvo(pinModal,pinName)} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>📌 Épingler</button>
              <button onClick={()=>setPinModal(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{position:'fixed',bottom:80,left:'50%',transform:`translateX(-50%) translateY(${toastOn?0:14}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 18px',fontSize:13,opacity:toastOn?1:0,transition:'all .25s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)'}}>{toastMsg}</div>

      {/* GLOBAL STYLES */}
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px #34d39977} 50%{box-shadow:0 0 14px #34d399bb} }
        .msg-in { animation: slideUp .25s cubic-bezier(.34,1.56,.64,1); }
        * { scrollbar-width:thin; scrollbar-color:var(--border) transparent; }
        *::-webkit-scrollbar { width:3px; }
        *::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
      `}</style>
    </div>
  )
}
