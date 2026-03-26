'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = { id:string; seq_id:number; username:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; is_custom_sticker?:boolean; msg_type:string; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null; deleted_at?:string|null; deleted_by?:string|null }
type DM  = { id:string; seq_id:number; from_user:string; to_user:string; content:string|null; file_url:string|null; file_name:string|null; audio_url:string|null; is_sticker:boolean; created_at:string; reply_to?:string|null; reply_preview?:string|null; reply_author?:string|null }
type Profile = { username:string; avatar_color:string; avatar_emoji:string; bio:string; theme:string; status:string; avatar_url?:string|null; location_lat?:number|null; location_lng?:number|null; location_name?:string|null; messages_count?:number }
type Reaction = { id:string; message_id:string; username:string; emoji:string }
type CustomSticker = { id:string; creator:string; content:string; bg_color:string; text_color:string }
type Presence = { username:string; is_online:boolean; last_seen:string }
type PinnedConvo = { id:string; owner:string; target:string; custom_name:string|null }
type UserPoints = { username:string; points:number; total_earned:number; last_daily_claim:string|null; streak_days:number }
type Game = { id:string; game_type:string; player1:string; player2:string|null; status:string; state:any; winner:string|null; created_at:string; bet_points:number }
type Comment = { id:string; message_id:string; username:string; content:string; created_at:string }

const THEMES:Record<string,Record<string,string>> = {
  dark:   {'--bg':'#0d0d12','--bg2':'#15151d','--bg3':'#1c1c27','--border':'rgba(255,255,255,0.07)','--text':'#e4e2f0','--muted':'#7a7891','--accent':'#7c6af7','--accent2':'#a78bfa','--me-bubble':'linear-gradient(135deg,#6c5ce7,#a78bfa)','--me-text':'#fff'},
  light:  {'--bg':'#f0f2f5','--bg2':'#ffffff','--bg3':'#e9ebee','--border':'rgba(0,0,0,0.08)','--text':'#1c1e21','--muted':'#65676b','--accent':'#1877f2','--accent2':'#2d88ff','--me-bubble':'linear-gradient(135deg,#1877f2,#2d88ff)','--me-text':'#fff'},
  cod:    {'--bg':'#0a0c08','--bg2':'#111410','--bg3':'#1a1d16','--border':'rgba(180,140,0,0.2)','--text':'#e8ddb5','--muted':'#8a7a50','--accent':'#c8a200','--accent2':'#f0c400','--me-bubble':'linear-gradient(135deg,#5a4500,#c8a200)','--me-text':'#fff'},
  neon:   {'--bg':'#050510','--bg2':'#0a0a1a','--bg3':'#0f0f25','--border':'rgba(0,255,200,0.15)','--text':'#e0fff8','--muted':'#4a8a7a','--accent':'#00ffc8','--accent2':'#00e5b4','--me-bubble':'linear-gradient(135deg,#004d3d,#00ffc8)','--me-text':'#000'},
  purple: {'--bg':'#0e0816','--bg2':'#160e22','--bg3':'#1e1430','--border':'rgba(180,0,255,0.15)','--text':'#f0e6ff','--muted':'#8060aa','--accent':'#b400ff','--accent2':'#d060ff','--me-bubble':'linear-gradient(135deg,#6600aa,#b400ff)','--me-text':'#fff'},
  sunset: {'--bg':'#120808','--bg2':'#1e0e0e','--bg3':'#2a1414','--border':'rgba(255,80,0,0.15)','--text':'#ffe8d6','--muted':'#9a5a40','--accent':'#ff5500','--accent2':'#ff7733','--me-bubble':'linear-gradient(135deg,#8a2200,#ff5500)','--me-text':'#fff'},
}
const THEME_LABELS:Record<string,string> = {dark:'🌙 Sombre',light:'☀️ Clair',cod:'🎮 CoD',neon:'⚡ Neon',purple:'💜 Violet',sunset:'🌅 Sunset'}
const AVATAR_COLORS = ['#7c6af7','#f97316','#06b6d4','#10b981','#ec4899','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#84cc16']
const EMOJIS_NORMAL = ['😊','😎','🤩','🥳','😏','🤓','😈','👻','🦁','🐯','🦊','🐺','🦋','🎭','🎪','🎨','🚀','⚡','🌟','💎']
const EMOJIS_COD    = ['🪖','💀','🔫','🎯','💣','🧨','🛡️','⚔️','🎖️','🔪','💥','🚁','🎮','👊','🦅','🌑','☠️','🔱','🏴','🧱']
const QUICK_REACTIONS = ['❤️','😂','😮','😢','😡','👍','🔥','💯']
const ALL_EMOJIS = ['😀','😂','🥹','😊','😍','🥰','😎','🤩','😏','😢','😭','🥺','😡','🤬','😱','🤯','🥳','😴','🤗','🫡','😌','😋','🤓','😈','👻','💀','🤡','🫠','🙄','😤','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','💯','✅','❌','⚡','🌈','🎯','💎','🎉','🎊','🥳','🎈','🎁','🏆','🥇','🎂','🍕','🍔','🎮','⚽','🏀','🎸','🎤','🎬','🍾','🥂','🍻','👍','👎','👏','🙌','🤝','🫶','🤙','👋','✋','💪','🦾','🙏','🫂','💁','🤷','🤦','🧑‍💻','👀','❤️‍🔥']
const STICKERS = ['🔥💯','💀👀','😭🙏','🤯🤯','🫡✅','😈🔥','🥶❄️','💪🏆','🫶❤️','🎉🎊','😂💀','🤡🎪','😏👀','🙃💅','😤✋','🤓☝️','😩😭','🤪🎉','😜💫','🫠🌀','❤️🥰','💕💖','😍✨','🫶💗','💌💝','🌹❤️','😘💋','🥺👉👈','💞🌸','💑🌺','📚💡','☕📖','🧑‍💻💻','✏️📝','🎓🏆','⏰📅','🧠💭','😤📚','🔬🧪','💾🖥️']
const COD_STICKERS  = ['🪖💀','🔫💥','🎯✅','💣🔥','⚔️🛡️','🎖️🏆','☠️👊','🚁💣','🌑🔪','🎮💀','🦅🪖','💥🔥','🧨💥','👊☠️','🏴🔫','🎯🔥','💀🎖️','⚔️💥','🪃🎯','🛡️💪']
const FILE_ICONS:Record<string,string> = {pdf:'📄',zip:'🗜️',mp3:'🎵',mp4:'🎬',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',txt:'📋',rar:'🗜️',pptx:'📊'}
const DANGER_WORDS = ['kill','mort','tuer','suicide','bombe','explosif','drogue','cocaine','heroine','attaque','violence','menace','threat','arme','gun','weapon']
const GAMES_LIST = [
  {id:'tictactoe',name:'Morpion',emoji:'⭕',desc:'Tour par tour • 2 joueurs'},
  {id:'rps',name:'Pierre Feuille Ciseaux',emoji:'✊',desc:'Premier à 3 • 2 joueurs'},
  {id:'quiz',name:'Quiz Culture G',emoji:'🧠',desc:'10 questions • 2+ joueurs'},
  {id:'hangman',name:'Pendu',emoji:'🎭',desc:'Devinez le mot • 2 joueurs'},
  {id:'truth',name:'Vérité ou Défi',emoji:'🎯',desc:'Questions fun • 2+ joueurs'},
  {id:'wordle',name:'Wordle',emoji:'📝',desc:'Mot en 6 essais • Solo/Duo'},
]

function colorForName(n:string){let h=0;for(const c of n)h=c.charCodeAt(0)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]}
function statusEmoji(s:string){return{online:'🟢',away:'🌙',busy:'🔴',gaming:'🎮'}[s]||'🟢'}
function timeAgo(d:string){const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return 'à l\'instant';if(s<3600)return `${Math.floor(s/60)}min`;if(s<86400)return `${Math.floor(s/3600)}h`;return `${Math.floor(s/86400)}j`}

export default function ChatApp() {
  const [step,setStep]=useState<'login'|'setup'|'app'>('login')
  const [user,setUser]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [pseudo,setPseudo]=useState('')
  const [avatarColor,setAvatarColor]=useState(AVATAR_COLORS[0])
  const [avatarEmoji,setAvatarEmoji]=useState('😊')
  const [bio,setBio]=useState('')
  const [theme,setTheme]=useState('dark')
  const [userStatus,setUserStatus]=useState('online')
  const [view,setView]=useState<'chat'|'dm'|'members'|'map'>('chat')
  const [dmTarget,setDmTarget]=useState<string|null>(null)
  const [messages,setMessages]=useState<Msg[]>([])
  const [dms,setDms]=useState<DM[]>([])
  const [reactions,setReactions]=useState<Reaction[]>([])
  const [onlineUsers,setOnlineUsers]=useState<Presence[]>([])
  const [allProfiles,setAllProfiles]=useState<Profile[]>([])
  const [profiles,setProfiles]=useState<Record<string,Profile>>({})
  const [customStickers,setCustomStickers]=useState<CustomSticker[]>([])
  const [pinnedConvos,setPinnedConvos]=useState<PinnedConvo[]>([])
  const [dmConvos,setDmConvos]=useState<string[]>([])
  const [userPoints,setUserPoints]=useState<UserPoints|null>(null)
  const [activeGame,setActiveGame]=useState<Game|null>(null)
  const [gameInvite,setGameInvite]=useState<Game|null>(null)
  const [showGames,setShowGames]=useState(false)
  const [showPoints,setShowPoints]=useState(false)
  const [showWithdraw,setShowWithdraw]=useState(false)
  const [withdrawPhone,setWithdrawPhone]=useState('')
  const [withdrawCountry,setWithdrawCountry]=useState('Bénin')
  const [withdrawNetwork,setWithdrawNetwork]=useState('MTN')
  const [gameBet,setGameBet]=useState(0)
  const [text,setText]=useState('')
  const [status,setStatus]=useState('Connexion...')
  const [pickerOpen,setPickerOpen]=useState(false)
  const [pickerTab,setPickerTab]=useState<'emoji'|'sticker'|'cod'|'custom'|'create'>('emoji')
  const [selectedFile,setSelectedFile]=useState<File|null>(null)
  const [toast,setToast]=useState('');const [toastOn,setToastOn]=useState(false)
  const [sending,setSending]=useState(false)
  const [reactionTarget,setReactionTarget]=useState<string|null>(null)
  const [viewProfile,setViewProfile]=useState<Profile|null>(null)
  const [replyTo,setReplyTo]=useState<{id:string;content:string|null;author:string}|null>(null)
  const [showThemes,setShowThemes]=useState(false)
  const [pinModal,setPinModal]=useState<string|null>(null)
  const [pinName,setPinName]=useState('')
  const [csText,setCsText]=useState('');const [csBg,setCsBg]=useState('#7c6af7');const [csColor,setCsColor]=useState('#ffffff')
  const [isRecording,setIsRecording]=useState(false)
  const [recordingTime,setRecordingTime]=useState(0)
  const [commentTarget,setCommentTarget]=useState<string|null>(null)
  const [comments,setComments]=useState<Record<string,Comment[]>>({})
  const [commentText,setCommentText]=useState('')
  const [avatarFile,setAvatarFile]=useState<File|null>(null)
  const [quizQuestion,setQuizQuestion]=useState<any>(null)
  const [wordleWord,setWordleWord]=useState('')
  const [wordleGuess,setWordleGuess]=useState('')
  const [wordleGuesses,setWordleGuesses]=useState<string[]>([])
  const [hangmanWord,setHangmanWord]=useState('')
  const [hangmanGuesses,setHangmanGuesses]=useState<string[]>([])

  const messagesRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLTextAreaElement>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const avatarRef=useRef<HTMLInputElement>(null)
  const toastTimer=useRef<NodeJS.Timeout>()
  const presTimer=useRef<NodeJS.Timeout>()
  const mediaRecorderRef=useRef<MediaRecorder|null>(null)
  const audioChunksRef=useRef<Blob[]>([])
  const recordingTimerRef=useRef<NodeJS.Timeout>()

  useEffect(()=>{
    const vars=THEMES[theme]||THEMES.dark
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v))
  },[theme])

  const toast$=useCallback((msg:string,type:'info'|'warn'|'error'='info')=>{
    setToast(msg);setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current=setTimeout(()=>setToastOn(false),4000)
  },[])

  const scrollBottom=useCallback(()=>{
    setTimeout(()=>{if(messagesRef.current)messagesRef.current.scrollTop=messagesRef.current.scrollHeight},100)
  },[])

  const getProfile=useCallback((username:string):Profile=>{
    return profiles[username]||{username,avatar_color:colorForName(username),avatar_emoji:'😊',bio:'',theme:'dark',status:'online'}
  },[profiles])

  const loadOnline=useCallback(async()=>{
    const since=new Date(Date.now()-30000).toISOString()
    const{data}=await supabase.from('presence').select('*').eq('is_online',true).gte('last_seen',since)
    setOnlineUsers(data||[])
  },[])

  const ping=useCallback(async(username:string)=>{
    await supabase.from('presence').upsert({username,last_seen:new Date().toISOString(),is_online:true},{onConflict:'username'})
  },[])

  const loadAllProfiles=useCallback(async()=>{
    const{data}=await supabase.from('profiles').select('*')
    if(data){
      const m:Record<string,Profile>={}
      data.forEach((p:Profile)=>{m[p.username]=p})
      setProfiles(m)
      setAllProfiles(data)
    }
  },[])

  const loadPoints=useCallback(async(username:string)=>{
    const{data}=await supabase.from('user_points').select('*').eq('username',username).single()
    if(data)setUserPoints(data)
    else{
      await supabase.from('user_points').insert({username,points:0,total_earned:0,streak_days:0})
      setUserPoints({username,points:0,total_earned:0,last_daily_claim:null,streak_days:0})
    }
  },[])

  const claimDailyPoints=useCallback(async(username:string)=>{
    const today=new Date().toISOString().split('T')[0]
    const{data}=await supabase.from('user_points').select('*').eq('username',username).single()
    if(!data||data.last_daily_claim===today)return
    const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0]
    const newStreak=data.last_daily_claim===yesterday?(data.streak_days||0)+1:1
    const bonus=newStreak>=7?20:newStreak>=3?15:10
    const newPoints=(data.points||0)+bonus
    await supabase.from('user_points').update({points:newPoints,total_earned:(data.total_earned||0)+bonus,last_daily_claim:today,streak_days:newStreak}).eq('username',username)
    setUserPoints(p=>p?{...p,points:newPoints,last_daily_claim:today,streak_days:newStreak}:p)
    toast$(`🎉 +${bonus} pts ! Série ${newStreak} jour${newStreak>1?'s':''}`)
  },[toast$])

  const updatePoints=useCallback(async(username:string,delta:number,reason:string)=>{
    const{data}=await supabase.from('user_points').select('points,total_earned').eq('username',username).single()
    if(!data)return
    const newPts=Math.max(0,(data.points||0)+delta)
    await supabase.from('user_points').update({points:newPts,total_earned:delta>0?(data.total_earned||0)+delta:data.total_earned}).eq('username',username)
    await supabase.from('points_history').insert({username,amount:delta,reason})
    setUserPoints(p=>p?{...p,points:newPts}:p)
  },[])

  // Check dangerous words
  const checkDangerWords=useCallback(async(content:string,username:string,msgId:string)=>{
    const lower=content.toLowerCase()
    const found=DANGER_WORDS.find(w=>lower.includes(w))
    if(found){
      await supabase.from('warnings').insert({username,message_id:msgId,reason:`Mot dangereux détecté: "${found}"`})
      toast$(`⚠️ Message signalé pour contenu inapproprié`,'warn')
    }
  },[toast$])

  useEffect(()=>{
    const saved=localStorage.getItem('chat_user')
    const savedTheme=localStorage.getItem('chat_theme')
    if(savedTheme)setTheme(savedTheme)
    if(saved)setPseudo(saved)
  },[])

  const handleLogin=async()=>{
    const name=pseudo.trim();if(!name)return
    const saved=localStorage.getItem('chat_user')
    const target=saved||name
    const{data:p}=await supabase.from('profiles').select('*').eq('username',target).single()
    if(p){setUser(target);setProfile(p);setAvatarColor(p.avatar_color);setAvatarEmoji(p.avatar_emoji);setBio(p.bio);setTheme(p.theme||'dark');setUserStatus(p.status||'online');localStorage.setItem('chat_user',target);localStorage.setItem('chat_theme',p.theme||'dark');setStep('app')}
    else{setUser(name);setStep('setup')}
  }

  const handleSetup=async()=>{
    let avatar_url=null
    if(avatarFile){
      const path=`avatars/${user}_${Date.now()}.${avatarFile.name.split('.').pop()}`
      const{error}=await supabase.storage.from('chat-files').upload(path,avatarFile,{upsert:true})
      if(!error){const{data}=supabase.storage.from('chat-files').getPublicUrl(path);avatar_url=data.publicUrl}
    }
    // Get location
    let location_lat=null,location_lng=null,location_name=null
    if(navigator.geolocation){
      await new Promise<void>(res=>{
        navigator.geolocation.getCurrentPosition(pos=>{
          location_lat=pos.coords.latitude;location_lng=pos.coords.longitude
          location_name=`${location_lat?.toFixed(2)}, ${location_lng?.toFixed(2)}`
          res()
        },()=>res(),{timeout:3000})
      })
    }
    const p:Profile={username:user,avatar_color:avatarColor,avatar_emoji:avatarEmoji,bio,theme,status:userStatus,avatar_url,location_lat,location_lng,location_name}
    await supabase.from('profiles').upsert(p,{onConflict:'username'})
    setProfile(p);localStorage.setItem('chat_user',user);localStorage.setItem('chat_theme',theme);setStep('app')
  }

  useEffect(()=>{
    if(step!=='app')return
    const init=async()=>{
      setStatus('Chargement...')
      await ping(user);await loadOnline();await loadAllProfiles()
      const{data:msgs}=await supabase.from('messages').select('*').order('seq_id',{ascending:true}).limit(200)
      const filtered=(msgs||[]).filter((m:Msg)=>m.msg_type==='message')
      setMessages(filtered)
      scrollBottom()
      const{data:rxns}=await supabase.from('reactions').select('*')
      setReactions(rxns||[])
      const{data:cs}=await supabase.from('custom_stickers').select('*').order('created_at',{ascending:false})
      setCustomStickers(cs||[])
      const{data:pins}=await supabase.from('pinned_convos').select('*').eq('owner',user)
      setPinnedConvos(pins||[])
      const{data:dmsData}=await supabase.from('dms').select('from_user,to_user').or(`from_user.eq.${user},to_user.eq.${user}`)
      if(dmsData){const s=new Set<string>();dmsData.forEach((d:any)=>{s.add(d.from_user===user?d.to_user:d.from_user)});setDmConvos(Array.from(s))}
      await loadPoints(user);await claimDailyPoints(user)
      setStatus('🟢 Connecté')
      if(Notification.permission==='default')Notification.requestPermission()
    }
    init()
    presTimer.current=setInterval(()=>{ping(user);loadOnline()},15000)

    const msgCh=supabase.channel('msgs-v5').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{
      const msg=p.new as Msg
      if(msg.msg_type!=='message')return
      setMessages(prev=>[...prev,msg]);scrollBottom()
      if(document.hidden&&msg.username!==user&&Notification.permission==='granted')
        new Notification(`💬 ${msg.username}`,{body:msg.content||'📎 Media'})
      if(msg.content&&msg.id)checkDangerWords(msg.content,msg.username,msg.id)
      if(msg.username===user)updatePoints(user,1,'Message envoyé')
    }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},p=>{
      setMessages(prev=>prev.map(m=>m.id===p.new.id?{...m,...p.new}:m))
    }).subscribe(st=>{if(st==='SUBSCRIBED')setStatus('🟢 Connecté')})

    const dmCh=supabase.channel('dms-v5').on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},p=>{
      const dm=p.new as DM
      if(dm.from_user===user||dm.to_user===user){
        const other=dm.from_user===user?dm.to_user:dm.from_user
        setDmConvos(prev=>prev.includes(other)?prev:[...prev,other])
        setDms(prev=>[...prev,dm]);scrollBottom()
        if(document.hidden&&dm.from_user!==user&&Notification.permission==='granted')
          new Notification(`🔒 DM de ${dm.from_user}`,{body:dm.content||'📎 Media'})
      }
    }).subscribe()

    const rxCh=supabase.channel('rx-v5').on('postgres_changes',{event:'*',schema:'public',table:'reactions'},()=>{
      supabase.from('reactions').select('*').then(({data})=>{if(data)setReactions(data)})
    }).subscribe()

    const csCh=supabase.channel('cs-v5').on('postgres_changes',{event:'INSERT',schema:'public',table:'custom_stickers'},p=>{
      setCustomStickers(prev=>[p.new as CustomSticker,...prev])
    }).subscribe()

    const ptsCh=supabase.channel('pts-v5').on('postgres_changes',{event:'*',schema:'public',table:'user_points'},p=>{
      if((p.new as UserPoints).username===user)setUserPoints(p.new as UserPoints)
    }).subscribe()

    const gameCh=supabase.channel('game-v5').on('postgres_changes',{event:'*',schema:'public',table:'games'},p=>{
      const g=p.new as Game
      if(g.player2===user&&g.status==='waiting')setGameInvite(g)
      if((g.player1===user||g.player2===user))setActiveGame(g)
    }).subscribe()

    const cmtCh=supabase.channel('cmt-v5').on('postgres_changes',{event:'INSERT',schema:'public',table:'message_comments'},p=>{
      const c=p.new as Comment
      setComments(prev=>({...prev,[c.message_id]:[...(prev[c.message_id]||[]),c]}))
    }).subscribe()

    const presCh=supabase.channel('pres-v5').on('postgres_changes',{event:'*',schema:'public',table:'presence'},()=>loadOnline()).subscribe()
    const profCh=supabase.channel('prof-v5').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>loadAllProfiles()).subscribe()

    const bye=()=>{supabase.from('presence').upsert({username:user,last_seen:new Date().toISOString(),is_online:false},{onConflict:'username'})}
    window.addEventListener('beforeunload',bye)
    return()=>{
      [msgCh,dmCh,rxCh,csCh,ptsCh,gameCh,cmtCh,presCh,profCh].forEach(c=>supabase.removeChannel(c))
      clearInterval(presTimer.current)
      window.removeEventListener('beforeunload',bye)
    }
  },[step,user,scrollBottom,ping,loadOnline,loadAllProfiles,loadPoints,claimDailyPoints,updatePoints,checkDangerWords])

  useEffect(()=>{
    if(!dmTarget||!user)return
    supabase.from('dms').select('*').or(`and(from_user.eq.${user},to_user.eq.${dmTarget}),and(from_user.eq.${dmTarget},to_user.eq.${user})`).order('seq_id',{ascending:true}).then(({data})=>{setDms(data||[]);scrollBottom()})
  },[dmTarget,user,scrollBottom])

  const deleteMessage=async(msgId:string)=>{
    await supabase.from('messages').update({deleted_at:new Date().toISOString(),deleted_by:user,content:'Ce message a été supprimé.'}).eq('id',msgId)
    toast$('Message supprimé')
  }

  const loadComments=async(msgId:string)=>{
    const{data}=await supabase.from('message_comments').select('*').eq('message_id',msgId).order('created_at',{ascending:true})
    setComments(prev=>({...prev,[msgId]:data||[]}))
    setCommentTarget(msgId)
  }

  const sendComment=async()=>{
    if(!commentText.trim()||!commentTarget)return
    await supabase.from('message_comments').insert({message_id:commentTarget,username:user,content:commentText.trim()})
    setCommentText('')
  }

  const startRecording=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const mr=new MediaRecorder(stream)
      mediaRecorderRef.current=mr;audioChunksRef.current=[]
      mr.ondataavailable=e=>{if(e.data.size>0)audioChunksRef.current.push(e.data)}
      mr.onstop=async()=>{
        const blob=new Blob(audioChunksRef.current,{type:'audio/webm'})
        stream.getTracks().forEach(t=>t.stop())
        await sendAudio(blob)
      }
      mr.start();setIsRecording(true);setRecordingTime(0)
      recordingTimerRef.current=setInterval(()=>setRecordingTime(t=>t+1),1000)
    }catch{toast$('Microphone non disponible')}
  }

  const stopRecording=()=>{
    if(mediaRecorderRef.current&&isRecording){mediaRecorderRef.current.stop();setIsRecording(false);clearInterval(recordingTimerRef.current)}
  }

  const sendAudio=async(blob:Blob)=>{
    toast$('⏫ Envoi vocal...')
    const path=`audio_${Date.now()}.webm`
    const{error}=await supabase.storage.from('chat-files').upload(path,blob,{contentType:'audio/webm',upsert:false})
    if(error){toast$('Erreur: '+error.message);return}
    const{data}=supabase.storage.from('chat-files').getPublicUrl(path)
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:'🎤 Audio',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,audio_url:data.publicUrl,is_sticker:false,...rd})
    else await supabase.from('messages').insert({username:user,audio_url:data.publicUrl,is_sticker:false,msg_type:'message',...rd})
    setReplyTo(null);toast$('✅ Vocal envoyé !')
  }

  const upload=async(file:File)=>{
    toast$('⏫ Upload...')
    const path=`${Date.now()}_${file.name.replace(/[^\w._-]/g,'_')}`
    const{error}=await supabase.storage.from('chat-files').upload(path,file,{upsert:false})
    if(error){toast$('Erreur: '+error.message);return null}
    const{data}=supabase.storage.from('chat-files').getPublicUrl(path)
    toast$('✅ Envoyé !');return{url:data.publicUrl,name:file.name}
  }

  const send=async()=>{
    if(!text.trim()&&!selectedFile)return
    setSending(true)
    let file_url=null,file_name=null
    if(selectedFile){const r=await upload(selectedFile);if(!r){setSending(false);return};file_url=r.url;file_name=r.name}
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content:text.trim()||null,file_url,file_name,is_sticker:false,...rd})
    else await supabase.from('messages').insert({username:user,content:text.trim()||null,file_url,file_name,is_sticker:false,msg_type:'message',...rd})
    setText('');setSelectedFile(null);setPickerOpen(false);setReplyTo(null)
    if(inputRef.current)inputRef.current.style.height='40px'
    setSending(false);inputRef.current?.focus()
  }

  const sendSticker=async(content:string,isCustom=false)=>{
    setPickerOpen(false)
    const rd=replyTo?{reply_to:replyTo.id,reply_preview:replyTo.content?.slice(0,60)||'📎',reply_author:replyTo.author}:{}
    if(view==='dm'&&dmTarget)await supabase.from('dms').insert({from_user:user,to_user:dmTarget,content,is_sticker:true,...rd})
    else await supabase.from('messages').insert({username:user,content,is_sticker:true,is_custom_sticker:isCustom,msg_type:'message',...rd})
    setReplyTo(null);updatePoints(user,2,'Sticker envoyé')
  }

  const createCustomSticker=async()=>{
    if(!csText.trim())return
    await supabase.from('custom_stickers').insert({creator:user,content:csText.trim(),bg_color:csBg,text_color:csColor})
    toast$('✅ Sticker créé !');setCsText('');updatePoints(user,5,'Sticker créé')
  }

  const toggleReaction=async(msgId:string,emoji:string)=>{
    setReactionTarget(null)
    const existing=reactions.find(r=>r.message_id===msgId&&r.username===user&&r.emoji===emoji)
    if(existing)await supabase.from('reactions').delete().eq('id',existing.id)
    else{await supabase.from('reactions').insert({message_id:msgId,username:user,emoji});updatePoints(user,1,'Réaction')}
  }

  // ── GAMES ─────────────────────────────────────────────
  const QUIZ_QUESTIONS = [
    {q:'Capitale du Bénin ?',a:'Porto-Novo',opts:['Cotonou','Porto-Novo','Abomey','Parakou']},
    {q:'Monnaie de la zone UEMOA ?',a:'FCFA',opts:['FCFA','Cedi','Naira','Shilling']},
    {q:'Combien de pays en Afrique ?',a:'54',opts:['48','54','57','60']},
    {q:'Quelle est la plus haute montagne ?',a:'Everest',opts:['Kilimandjaro','Mont Blanc','Everest','Aconcagua']},
    {q:'Qui a inventé le téléphone ?',a:'Bell',opts:['Edison','Bell','Tesla','Marconi']},
  ]
  const HANGMAN_WORDS = ['JAVASCRIPT','SUPABASE','VERCEL','NEXTJS','REACTION','DISCORD','WHATSAPP','BENIN','AFRIQUE']

  const inviteToGame=async(gameType:string,opponent:string,bet:number)=>{
    if(bet>0&&(userPoints?.points||0)<bet){toast$('Pas assez de points pour miser !');return}
    const initState=gameType==='tictactoe'?{board:Array(9).fill(null),currentTurn:'X',moves:0}
      :gameType==='rps'?{player1Choice:null,player2Choice:null,round:1,scores:{p1:0,p2:0}}
      :gameType==='quiz'?{currentQ:0,p1Score:0,p2Score:0,answered:false,question:QUIZ_QUESTIONS[0]}
      :gameType==='hangman'?{word:HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)],guesses:[],wrong:0}
      :gameType==='wordle'?{word:HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)].slice(0,5),guesses:[],currentGuess:''}
      :{choices:['Vérité','Vérité','Défi','Défi','Vérité'],current:0}
    const{data}=await supabase.from('games').insert({game_type:gameType,player1:user,player2:opponent,status:'waiting',state:initState,bet_points:bet}).select().single()
    if(data){setActiveGame(data);setShowGames(false);toast$(`🎮 Invitation envoyée à ${opponent} ! Mise: ${bet} pts`)}
  }

  const acceptGame=async()=>{
    if(!gameInvite)return
    if(gameInvite.bet_points>0&&(userPoints?.points||0)<gameInvite.bet_points){toast$('Pas assez de points pour accepter !');setGameInvite(null);return}
    await supabase.from('games').update({status:'active'}).eq('id',gameInvite.id)
    setActiveGame({...gameInvite,status:'active'});setGameInvite(null)
  }

  const makeGameMove=async(move:any)=>{
    if(!activeGame||activeGame.status!=='active')return
    const s={...activeGame.state}
    let newStatus='active',winner=null as string|null
    const isP1=activeGame.player1===user

    if(activeGame.game_type==='tictactoe'){
      const sym=isP1?'X':'O'
      s.board=s.board.map((v:any,i:number)=>i===move.index?sym:v)
      s.currentTurn=s.currentTurn==='X'?'O':'X';s.moves=(s.moves||0)+1
      const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
      for(const[a,b,c]of lines)if(s.board[a]&&s.board[a]===s.board[b]&&s.board[a]===s.board[c]){winner=s.board[a]==='X'?activeGame.player1:activeGame.player2!;newStatus='finished';break}
      if(!winner&&s.moves===9)newStatus='draw'
    }else if(activeGame.game_type==='rps'){
      if(isP1)s.player1Choice=move.choice;else s.player2Choice=move.choice
      if(s.player1Choice&&s.player2Choice){
        const w=([['rock','scissors'],['scissors','paper'],['paper','rock']].some(([a,b])=>s.player1Choice===a&&s.player2Choice===b))?'p1':s.player1Choice===s.player2Choice?'draw':'p2'
        if(w==='p1')s.scores.p1++;else if(w==='p2')s.scores.p2++
        if(s.scores.p1>=3){winner=activeGame.player1;newStatus='finished'}
        else if(s.scores.p2>=3){winner=activeGame.player2!;newStatus='finished'}
        else{s.round++;s.player1Choice=null;s.player2Choice=null}
      }
    }else if(activeGame.game_type==='quiz'){
      if(isP1)s.p1Answer=move.answer;else s.p2Answer=move.answer
      if(s.p1Answer&&s.p2Answer){
        if(s.p1Answer===s.question.a)s.p1Score++
        if(s.p2Answer===s.question.a)s.p2Score++
        s.currentQ++
        if(s.currentQ>=QUIZ_QUESTIONS.length){newStatus='finished';winner=s.p1Score>s.p2Score?activeGame.player1:s.p2Score>s.p1Score?activeGame.player2!:null}
        else{s.question=QUIZ_QUESTIONS[s.currentQ];s.p1Answer=null;s.p2Answer=null}
      }
    }else if(activeGame.game_type==='hangman'){
      if(!s.guesses.includes(move.letter)){s.guesses=[...s.guesses,move.letter]}
      const word=s.word as string
      const wrong=move.letter&&!word.includes(move.letter)?s.wrong+1:s.wrong
      s.wrong=wrong;s.guesses=[...s.guesses]
      if(word.split('').every((l:string)=>s.guesses.includes(l))){winner=user;newStatus='finished'}
      else if(wrong>=6)newStatus='finished'
    }else if(activeGame.game_type==='wordle'){
      s.guesses=[...s.guesses,move.guess.toUpperCase().slice(0,5)]
      if(move.guess.toUpperCase()===s.word){winner=user;newStatus='finished'}
      else if(s.guesses.length>=6)newStatus='finished'
    }

    await supabase.from('games').update({state:s,status:newStatus,winner,updated_at:new Date().toISOString()}).eq('id',activeGame.id)
    setActiveGame(g=>g?{...g,state:s,status:newStatus,winner}:g)

    if(newStatus==='finished'||newStatus==='draw'){
      const bet=activeGame.bet_points||0
      if(winner===user){updatePoints(user,15+bet*2,'Victoire au jeu !');toast$(`🏆 Victoire ! +${15+bet*2} pts`)}
      else if(winner&&winner!==user){updatePoints(user,Math.max(-bet,-5),'Défaite au jeu');if(bet>0)toast$(`😔 Défaite. -${bet} pts`)}
      else toast$('🤝 Égalité !')
    }
  }

  const requestWithdraw=async()=>{
    if(!userPoints||userPoints.points<1000){toast$('❌ Il faut minimum 1000 points (= 500 FCFA)');return}
    if(!withdrawPhone.trim()){toast$('Entre ton numéro de téléphone');return}
    const ptsTouse=Math.floor(userPoints.points/10)*10
    const fcfa=Math.floor(ptsTouse/10)*5
    await supabase.from('withdrawal_requests').insert({username:user,points:ptsTouse,amount_fcfa:fcfa,phone:withdrawPhone,country:withdrawCountry,network:withdrawNetwork,status:'pending'})
    await supabase.from('user_points').update({points:userPoints.points%10}).eq('username',user)
    setUserPoints(p=>p?{...p,points:p.points%10}:p)
    toast$(`✅ Demande de ${fcfa} FCFA envoyée !`);setShowWithdraw(false)
  }

  const handleKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
  const autoResize=(el:HTMLTextAreaElement)=>{el.style.height='40px';el.style.height=Math.min(el.scrollHeight,110)+'px'}
  const insertEmoji=(e:string)=>{if(!inputRef.current)return;const el=inputRef.current,s=el.selectionStart??el.value.length,en=el.selectionEnd??el.value.length;setText(el.value.slice(0,s)+e+el.value.slice(en));setTimeout(()=>{el.selectionStart=el.selectionEnd=s+e.length;el.focus()},0)}
  const openDM=(username:string)=>{if(username===user)return;setDmTarget(username);setView('dm');setViewProfile(null)}
  const ptsFCFA=(pts:number)=>`${Math.floor(pts/10)*5} FCFA`

  // ── RENDER MESSAGES ───────────────────────────────────
  let lastDate=''
  const renderMessages=(msgs:Msg[])=>msgs.map((msg,i)=>{
    const date=new Date(msg.created_at)
    const dStr=date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
    const isMe=msg.username===user
    const rxns:Record<string,string[]>={}
    reactions.filter(r=>r.message_id===msg.id).forEach(r=>{if(!rxns[r.emoji])rxns[r.emoji]=[];rxns[r.emoji].push(r.username)})
    const ext=(msg.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    const cs=customStickers.find(s=>s.content===msg.content)
    const msgComments=comments[msg.id]||[]
    const isDeleted=!!msg.deleted_at
    const items:React.ReactNode[]=[]

    if(dStr!==lastDate){lastDate=dStr;items.push(<div key={`d${i}`} style={{display:'flex',alignItems:'center',gap:10,color:'var(--muted)',fontSize:11,margin:'10px 0'}}><div style={{flex:1,height:1,background:'var(--border)'}}/>  {dStr}<div style={{flex:1,height:1,background:'var(--border)'}}/></div>)}

    const p=getProfile(msg.username)
    items.push(
      <div key={msg.id} style={{display:'flex',alignItems:'flex-start',gap:8,flexDirection:isMe?'row-reverse':'row',animation:'slideUp .25s ease'}}
        onMouseLeave={()=>setReactionTarget(null)}>
        {/* Avatar */}
        <div onClick={()=>setViewProfile(p)} style={{width:34,height:34,borderRadius:'50%',overflow:'hidden',flexShrink:0,cursor:'pointer',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
          {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.avatar_emoji}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'66%',alignItems:isMe?'flex-end':'flex-start'}}>
          {!isMe&&<div style={{fontSize:11,color:'var(--muted)',padding:'0 4px',fontWeight:500,cursor:'pointer'}} onClick={()=>setViewProfile(p)}>{msg.username} <span style={{fontSize:10}}>{timeAgo(msg.created_at)}</span></div>}
          {msg.reply_author&&<div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2}}><div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {msg.reply_author}</div><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{msg.reply_preview}</div></div>}
          <div style={{position:'relative'}} onMouseEnter={()=>setReactionTarget(msg.id)}>
            {isDeleted
              ?<div style={{padding:'8px 14px',borderRadius:18,fontSize:13,fontStyle:'italic',color:'var(--muted)',background:'var(--bg3)',border:'1px solid var(--border)'}}>🗑 Ce message a été supprimé.</div>
              :<>
                {msg.file_url&&(isImage?<img src={msg.file_url} alt="" style={{maxWidth:260,maxHeight:200,borderRadius:14,cursor:'pointer',display:'block'}} onClick={()=>window.open(msg.file_url!,'_blank')}/>:<a href={msg.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'11px 15px',display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'var(--text)'}}><div style={{width:34,height:34,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{FILE_ICONS[ext]||'📎'}</div><div><div style={{fontSize:13,fontWeight:500}}>{msg.file_name}</div><div style={{fontSize:11,color:'var(--muted)'}}>Télécharger</div></div></a>)}
                {msg.audio_url&&<AudioPlayer url={msg.audio_url} isMe={isMe}/>}
                {msg.content&&(msg.is_sticker?<div style={{fontSize:msg.is_custom_sticker?16:52,lineHeight:1,padding:msg.is_custom_sticker?'10px 16px':4,background:msg.is_custom_sticker?(cs?.bg_color||'#7c6af7'):'transparent',borderRadius:msg.is_custom_sticker?14:0,color:msg.is_custom_sticker?(cs?.text_color||'white'):undefined,fontWeight:msg.is_custom_sticker?700:undefined}}>{msg.content}</div>:<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,lineHeight:1.6,wordBreak:'break-word',background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{msg.content}</div>)}
                {/* Hover actions */}
                {reactionTarget===msg.id&&<div style={{position:'absolute',[isMe?'right':'left']:0,bottom:'100%',marginBottom:4,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:30,padding:'5px 8px',display:'flex',gap:2,zIndex:10,boxShadow:'0 8px 24px rgba(0,0,0,.5)',whiteSpace:'nowrap'}}>
                  {QUICK_REACTIONS.map(e=><button key={e} onClick={()=>toggleReaction(msg.id,e)} style={{fontSize:20,background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:8,transform:reactions.find(r=>r.message_id===msg.id&&r.username===user&&r.emoji===e)?'scale(1.25)':'scale(1)',transition:'transform .1s'}}>{e}</button>)}
                  <button onClick={()=>setReplyTo({id:msg.id,content:msg.content,author:msg.username})} style={{fontSize:14,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:8,color:'var(--muted)'}}>↩️</button>
                  <button onClick={()=>loadComments(msg.id)} style={{fontSize:14,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:8,color:'var(--muted)'}}>💬</button>
                  {isMe&&<button onClick={()=>deleteMessage(msg.id)} style={{fontSize:14,background:'none',border:'none',cursor:'pointer',padding:'2px 6px',borderRadius:8,color:'#f87171'}}>🗑</button>}
                </div>}
              </>
            }
          </div>
          {/* Reactions */}
          {Object.keys(rxns).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'0 4px'}}>{Object.entries(rxns).map(([e,u])=><button key={e} onClick={()=>toggleReaction(msg.id,e)} title={u.join(', ')} style={{background:u.includes(user)?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${u.includes(user)?'rgba(124,106,247,.5)':'var(--border)'}`,borderRadius:20,padding:'2px 8px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{e}<span style={{fontSize:11,color:'var(--muted)'}}>{u.length}</span></button>)}</div>}
          {/* Comments count */}
          {msgComments.length>0&&<button onClick={()=>loadComments(msg.id)} style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'0 4px'}}>💬 {msgComments.length} commentaire{msgComments.length>1?'s':''}</button>}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )

    // Comments panel
    if(commentTarget===msg.id){
      items.push(
        <div key={`cmt-${msg.id}`} style={{marginLeft:42,background:'var(--bg3)',borderRadius:14,padding:12,marginTop:4,marginBottom:4}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:'var(--muted)'}}>💬 Commentaires</div>
          {msgComments.map(c=>(
            <div key={c.id} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:getProfile(c.username).avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{getProfile(c.username).avatar_emoji}</div>
              <div style={{background:'var(--bg2)',borderRadius:10,padding:'6px 10px',flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--accent2)',marginBottom:2}}>{c.username}</div>
                <div style={{fontSize:13}}>{c.content}</div>
              </div>
            </div>
          ))}
          <div style={{display:'flex',gap:6,marginTop:8}}>
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendComment()} placeholder="Commenter..." style={{flex:1,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:'6px 12px',color:'var(--text)',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
            <button onClick={sendComment} style={{background:'var(--accent)',border:'none',borderRadius:20,padding:'6px 12px',color:'white',cursor:'pointer',fontSize:12}}>↵</button>
            <button onClick={()=>setCommentTarget(null)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:20,padding:'6px 10px',color:'var(--muted)',cursor:'pointer',fontSize:12}}>✕</button>
          </div>
        </div>
      )
    }
    return items
  })

  const renderDMs=(dms:DM[])=>dms.map(dm=>{
    const isMe=dm.from_user===user
    const ext=(dm.file_name||'').split('.').pop()?.toLowerCase()||''
    const isImage=['jpg','jpeg','png','gif','webp','svg'].includes(ext)
    return(
      <div key={dm.id} style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:isMe?'row-reverse':'row',animation:'slideUp .25s ease'}}>
        <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',background:getProfile(dm.from_user).avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
          {getProfile(dm.from_user).avatar_url?<img src={getProfile(dm.from_user).avatar_url!} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:getProfile(dm.from_user).avatar_emoji}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,maxWidth:'65%',alignItems:isMe?'flex-end':'flex-start'}}>
          {dm.reply_author&&<div style={{background:'var(--bg3)',borderLeft:'3px solid var(--accent)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--muted)',marginBottom:2}}><div style={{fontWeight:600,fontSize:11,color:'var(--accent2)',marginBottom:2}}>↩️ {dm.reply_author}</div><div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{dm.reply_preview}</div></div>}
          {dm.file_url&&(isImage?<img src={dm.file_url} alt="" style={{maxWidth:240,borderRadius:14,cursor:'pointer'}} onClick={()=>window.open(dm.file_url!,'_blank')}/>:<a href={dm.file_url} target="_blank" rel="noreferrer" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'var(--text)'}}><div style={{width:30,height:30,borderRadius:8,background:'rgba(124,106,247,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{FILE_ICONS[ext]||'📎'}</div><div><div style={{fontSize:13,fontWeight:500}}>{dm.file_name}</div></div></a>)}
          {dm.audio_url&&<AudioPlayer url={dm.audio_url} isMe={isMe}/>}
          {dm.content&&(dm.is_sticker?<div style={{fontSize:46,lineHeight:1}}>{dm.content}</div>:<div style={{padding:'10px 14px',borderRadius:18,fontSize:14,background:isMe?'var(--me-bubble)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderBottomRightRadius:isMe?5:18,borderBottomLeftRadius:isMe?18:5,color:isMe?'var(--me-text)':'var(--text)'}}>{dm.content}</div>)}
          <div style={{fontSize:10,color:'var(--muted)',padding:'0 4px'}}>{new Date(dm.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    )
  })

  // ── GAME PANEL ────────────────────────────────────────
  const GamePanel=()=>{
    if(!activeGame)return null
    const isP1=activeGame.player1===user
    const opp=isP1?activeGame.player2:activeGame.player1
    const s=activeGame.state

    return(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(8px)'}}>
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:24,padding:28,width:400,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:18}}>{GAMES_LIST.find(g=>g.id===activeGame.game_type)?.emoji} {GAMES_LIST.find(g=>g.id===activeGame.game_type)?.name}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {activeGame.bet_points>0&&<div style={{background:'rgba(251,191,36,.2)',border:'1px solid rgba(251,191,36,.4)',borderRadius:20,padding:'3px 10px',fontSize:12,color:'#fbbf24'}}>🎲 {activeGame.bet_points} pts</div>}
              <button onClick={()=>setActiveGame(null)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--muted)',fontFamily:'inherit'}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:16,textAlign:'center'}}>vs <strong style={{color:'var(--text)'}}>{opp}</strong></div>

          {(activeGame.status==='finished'||activeGame.status==='draw')&&(
            <div style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:48,marginBottom:8}}>{activeGame.winner===user?'🏆':activeGame.status==='draw'?'🤝':'😢'}</div>
              <div style={{fontSize:22,fontWeight:700,color:activeGame.winner===user?'#34d399':activeGame.status==='draw'?'var(--muted)':'#f87171'}}>{activeGame.winner===user?'Victoire !':activeGame.status==='draw'?'Égalité !':'Défaite'}</div>
              {activeGame.winner===user&&<div style={{fontSize:14,color:'var(--muted)',marginTop:4}}>+{15+(activeGame.bet_points||0)*2} points gagnés !</div>}
              <button onClick={()=>setActiveGame(null)} style={{marginTop:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:'10px 20px',cursor:'pointer',fontFamily:'inherit',fontSize:14}}>Fermer</button>
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='tictactoe'&&(
            <div>
              <div style={{textAlign:'center',marginBottom:12,fontSize:13,color:s.currentTurn===(isP1?'X':'O')?'var(--accent2)':'var(--muted)'}}>
                {s.currentTurn===(isP1?'X':'O')?'🎯 Ton tour !':'⏳ Tour de '+opp}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {s.board.map((cell:any,i:number)=>(
                  <button key={i} onClick={()=>s.currentTurn===(isP1?'X':'O')&&!cell&&makeGameMove({index:i})} style={{height:80,borderRadius:12,border:`2px solid ${cell?'rgba(124,106,247,.4)':'var(--border)'}`,background:cell?'rgba(124,106,247,.1)':'var(--bg3)',fontSize:36,cursor:s.currentTurn===(isP1?'X':'O')&&!cell?'pointer':'default',color:cell==='X'?'var(--accent2)':'#f87171',fontWeight:700}}>{cell||''}</button>
                ))}
              </div>
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='rps'&&(
            <div>
              <div style={{textAlign:'center',marginBottom:12,fontSize:13,color:'var(--muted)'}}>Manche {s.round} • Score: {isP1?s.scores.p1:s.scores.p2} - {isP1?s.scores.p2:s.scores.p1}</div>
              {!(isP1?s.player1Choice:s.player2Choice)?
                <div style={{display:'flex',gap:10}}>{[{k:'rock',e:'✊'},{k:'paper',e:'🖐️'},{k:'scissors',e:'✌️'}].map(({k,e})=><button key={k} onClick={()=>makeGameMove({choice:k})} style={{flex:1,padding:16,borderRadius:14,border:'1px solid var(--border)',background:'var(--bg3)',fontSize:32,cursor:'pointer'}}>{e}</button>)}</div>
                :<div style={{textAlign:'center',padding:20,fontSize:18}}>✅ En attente de {opp}...</div>
              }
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='quiz'&&s.question&&(
            <div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:8}}>Question {s.currentQ+1}/{QUIZ_QUESTIONS.length} • Score: {isP1?s.p1Score:s.p2Score} - {isP1?s.p2Score:s.p1Score}</div>
              <div style={{fontWeight:600,fontSize:16,marginBottom:14,padding:'12px 16px',background:'var(--bg3)',borderRadius:12}}>{s.question.q}</div>
              {!(isP1?s.p1Answer:s.p2Answer)?
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{s.question.opts.map((opt:string)=><button key={opt} onClick={()=>makeGameMove({answer:opt})} style={{padding:'10px 8px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg3)',cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:13}}>{opt}</button>)}</div>
                :<div style={{textAlign:'center',padding:16,fontSize:14,color:'var(--accent2)'}}>✅ En attente de {opp}...</div>
              }
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='hangman'&&(
            <div>
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:32,letterSpacing:8,fontFamily:'monospace',marginBottom:8}}>{(s.word as string).split('').map((l:string)=>s.guesses.includes(l)?l:'_').join(' ')}</div>
                <div style={{fontSize:13,color:'var(--muted)'}}>Erreurs: {s.wrong}/6 • {'💀'.repeat(s.wrong)}{'⬜'.repeat(6-s.wrong)}</div>
                <div style={{fontSize:13,marginTop:8}}>{s.guesses.join(' ')}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=><button key={l} onClick={()=>!s.guesses.includes(l)&&makeGameMove({letter:l})} disabled={s.guesses.includes(l)} style={{padding:'8px 4px',borderRadius:8,border:'1px solid var(--border)',background:s.guesses.includes(l)?'var(--bg3)':'var(--bg2)',cursor:s.guesses.includes(l)?'default':'pointer',color:s.guesses.includes(l)?'var(--muted)':'var(--text)',fontFamily:'inherit',fontSize:12,opacity:s.guesses.includes(l)?0.4:1}}>{l}</button>)}
              </div>
            </div>
          )}

          {activeGame.status==='active'&&activeGame.game_type==='wordle'&&(
            <div>
              <div style={{marginBottom:12}}>
                {(s.guesses as string[]).map((g:string,gi:number)=>(
                  <div key={gi} style={{display:'flex',gap:4,marginBottom:4,justifyContent:'center'}}>
                    {g.split('').map((l,li)=>{
                      const correct=s.word[li]===l
                      const present=!correct&&s.word.includes(l)
                      return<div key={li} style={{width:44,height:44,borderRadius:8,background:correct?'#34d399':present?'#f59e0b':'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18,color:correct||present?'white':'var(--text)'}}>{l}</div>
                    })}
                  </div>
                ))}
                {s.guesses.length<6&&<div style={{display:'flex',gap:4,justifyContent:'center'}}>
                  {Array(5).fill(0).map((_,i)=><div key={i} style={{width:44,height:44,borderRadius:8,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>{wordleGuess[i]||''}</div>)}
                </div>}
              </div>
              <input value={wordleGuess} onChange={e=>setWordleGuess(e.target.value.toUpperCase().slice(0,5))} onKeyDown={e=>e.key==='Enter'&&wordleGuess.length===5&&makeGameMove({guess:wordleGuess})} placeholder="Entrez un mot de 5 lettres..." maxLength={5} style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',textTransform:'uppercase'}}/>
              <button onClick={()=>wordleGuess.length===5&&makeGameMove({guess:wordleGuess})} style={{width:'100%',marginTop:8,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:10,cursor:'pointer',fontFamily:'inherit',fontSize:14}}>Valider</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if(step==='login')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'44px 40px',width:380,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 30px 80px rgba(0,0,0,.6)'}}>
        <div style={{fontSize:52,textAlign:'center'}}>💬</div>
        <div style={{fontSize:24,fontWeight:700,textAlign:'center'}}>Chat App</div>
        <div style={{fontSize:13,color:'var(--muted)',textAlign:'center'}}>Entre ton pseudo pour rejoindre</div>
        <input value={pseudo} onChange={e=>setPseudo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Ton pseudo..." maxLength={20} autoFocus style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:15,outline:'none'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
        <button onClick={handleLogin} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}}>Rejoindre →</button>
      </div>
    </div>
  )

  if(step==='setup')return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'radial-gradient(ellipse at 50% 60%, #1a1240 0%, #0d0d12 70%)',padding:20,overflowY:'auto'}}>
      <div style={{background:'var(--bg2)',border:'1px solid rgba(124,106,247,.25)',borderRadius:24,padding:'36px 32px',width:440,display:'flex',flexDirection:'column',gap:18,boxShadow:'0 30px 80px rgba(0,0,0,.6)'}}>
        <div style={{fontSize:22,fontWeight:700}}>Crée ton profil 🎨</div>
        {/* Photo de profil */}
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div onClick={()=>avatarRef.current?.click()} style={{width:72,height:72,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,cursor:'pointer',overflow:'hidden',position:'relative',border:'3px solid var(--accent)'}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:avatarEmoji}
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'.2s'}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}><span style={{color:'white',fontSize:12}}>📷</span></div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&setAvatarFile(e.target.files[0])}/>
          <div><div style={{fontWeight:700,fontSize:16}}>{user}</div><div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Clique sur la photo pour changer</div></div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Couleur</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setAvatarColor(c)} style={{width:32,height:32,borderRadius:'50%',background:c,border:avatarColor===c?'3px solid white':'3px solid transparent',cursor:'pointer',transition:'transform .1s',transform:avatarColor===c?'scale(1.15)':'scale(1)'}}/>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:6,fontWeight:500}}>Emoji</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:4}}>{EMOJIS_NORMAL.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:20,padding:4,background:avatarEmoji===e?'rgba(124,106,247,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:8}}>{e}</button>)}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}}>{EMOJIS_COD.map(e=><button key={e} onClick={()=>setAvatarEmoji(e)} style={{fontSize:20,padding:4,background:avatarEmoji===e?'rgba(200,162,0,.3)':'transparent',border:'none',cursor:'pointer',borderRadius:8}}>{e}</button>)}</div>
        </div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Thème</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>setTheme(k)} style={{padding:'8px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12,fontWeight:theme===k?600:400}}>{v}</button>)}</div></div>
        <div><div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:500}}>Statut</div><div style={{display:'flex',gap:6}}>{(['online','away','busy','gaming'] as const).map(s=><button key={s} onClick={()=>setUserStatus(s)} style={{flex:1,padding:'7px 4px',background:userStatus===s?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${userStatus===s?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12}}>{statusEmoji(s)} {s}</button>)}</div></div>
        <input value={bio} onChange={e=>setBio(e.target.value)} placeholder="Ta bio (optionnel)..." maxLength={80} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}}/>
        <button onClick={handleSetup} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,fontFamily:'inherit',cursor:'pointer',boxShadow:'0 4px 20px rgba(124,106,247,.4)'}}>Commencer 🚀</button>
      </div>
    </div>
  )

  const myProfile=profile||getProfile(user)
  const allConvosArr=Array.from(new Set([...pinnedConvos.map(p=>p.target),...dmConvos,...onlineUsers.filter(u=>u.username!==user).map(u=>u.username)]))

  return(
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>
      {/* SIDEBAR */}
      <div style={{width:260,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setViewProfile(myProfile)}>
          <div style={{position:'relative',width:40,height:40,borderRadius:'50%',overflow:'hidden',background:myProfile.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {myProfile.avatar_url?<img src={myProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:myProfile.avatar_emoji}
            <div style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{statusEmoji(userStatus)} {userStatus}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();setShowThemes(p=>!p)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)',padding:4,borderRadius:8}}>🎨</button>
        </div>

        {showThemes&&(
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg3)'}}>
            <div style={{fontSize:10,color:'var(--muted)',marginBottom:6,fontWeight:700}}>THÈME</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4}}>
              {Object.entries(THEME_LABELS).map(([k,v])=><button key={k} onClick={()=>{setTheme(k);localStorage.setItem('chat_theme',k)}} style={{padding:'6px 4px',background:theme===k?'rgba(124,106,247,.2)':'var(--bg2)',border:`1px solid ${theme===k?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:11,fontWeight:theme===k?600:400}}>{v}</button>)}
            </div>
          </div>
        )}

        <div style={{padding:'6px 8px',display:'flex',flexDirection:'column',gap:2}}>
          {[{v:'chat',l:'💬 Chat général'},{v:'members',l:'👥 Membres'},{v:'map',l:'🗺️ Carte'}].map(({v,l})=>(
            <button key={v} onClick={()=>{setView(v as any);setDmTarget(null)}} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:'none',background:view===v?'rgba(124,106,247,.2)':'transparent',color:view===v?'var(--accent2)':'var(--muted)',cursor:'pointer',textAlign:'left',fontSize:13,fontFamily:'inherit',fontWeight:view===v?600:400,display:'flex',alignItems:'center',gap:8}}>
              {l}{v==='chat'&&<span style={{marginLeft:'auto',fontSize:11,background:'var(--accent)',color:'white',borderRadius:10,padding:'1px 7px'}}>{onlineUsers.length}</span>}
            </button>
          ))}
        </div>

        <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',padding:'4px 14px'}}>Messages privés</div>
        <div style={{flex:1,overflowY:'auto',padding:'0 8px 8px'}}>
          {allConvosArr.map(username=>{
            const p=getProfile(username)
            const pres=onlineUsers.find(u=>u.username===username)
            const pin=pinnedConvos.find(x=>x.target===username)
            const isActive=view==='dm'&&dmTarget===username
            return(
              <div key={username} style={{display:'flex',alignItems:'center',gap:2}}>
                <button onClick={()=>openDM(username)} style={{flex:1,padding:'7px 10px',borderRadius:10,border:'none',background:isActive?'rgba(124,106,247,.2)':'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{position:'relative',width:32,height:32,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                    {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.avatar_emoji}
                    {pres&&<div style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>}
                  </div>
                  <div style={{overflow:'hidden',flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pin?'📌 ':''}{pin?.custom_name||username}</div>
                    <div style={{fontSize:11,color:pres?'#34d399':'var(--muted)'}}>{pres?'En ligne':'Hors ligne'}</div>
                  </div>
                </button>
                <button onClick={()=>{if(pin){supabase.from('pinned_convos').delete().eq('owner',user).eq('target',username).then(()=>setPinnedConvos(p=>p.filter(x=>x.target!==username)));toast$('Désépinglé')}else{setPinModal(username);setPinName('')}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'var(--muted)',padding:4,opacity:.6}}>{pin?'📌':'📍'}</button>
              </div>
            )
          })}
        </div>
        <div style={{padding:'8px 14px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#34d399',justifyContent:'center'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>{onlineUsers.length} en ligne
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{padding:'12px 20px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 8px #34d39977'}}/>
            <div>
              <div style={{fontWeight:600,fontSize:15}}>{view==='dm'&&dmTarget?`${getProfile(dmTarget).avatar_emoji} ${pinnedConvos.find(x=>x.target===dmTarget)?.custom_name||dmTarget}`:view==='members'?'👥 Membres':view==='map'?'🗺️ Carte':'🌐 Chat général'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{status}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setShowPoints(true)} style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:20,padding:'5px 12px',fontSize:13,color:'#fbbf24',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
              ⭐ {userPoints?.points||0} pts • {ptsFCFA(userPoints?.points||0)}
            </button>
            {view==='dm'&&dmTarget&&<button onClick={()=>setShowGames(true)} style={{background:'rgba(124,106,247,.15)',border:'1px solid rgba(124,106,247,.3)',borderRadius:20,padding:'5px 12px',fontSize:13,color:'var(--accent2)',cursor:'pointer'}}>🎮 Jouer</button>}
          </div>
        </header>

        {/* MEMBERS VIEW */}
        {view==='members'&&(
          <div style={{flex:1,overflowY:'auto',padding:20}}>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Tous les membres inscrits • {allProfiles.length} total • {onlineUsers.length} en ligne</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
              {allProfiles.map(p=>{
                const isOnline=onlineUsers.some(u=>u.username===p.username)
                return(
                  <div key={p.username} onClick={()=>setViewProfile(p)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:16,cursor:'pointer',transition:'border-color .2s'}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{position:'relative',width:44,height:44,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                        {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.avatar_emoji}
                        {isOnline&&<div style={{position:'absolute',bottom:1,right:1,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid var(--bg2)'}}/>}
                      </div>
                      <div style={{overflow:'hidden'}}>
                        <div style={{fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.username}</div>
                        <div style={{fontSize:11,color:isOnline?'#34d399':'var(--muted)'}}>{isOnline?'🟢 En ligne':'⚫ Hors ligne'}</div>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.bio||'Pas de bio'}</div>
                    {p.location_name&&<div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>📍 {p.location_name}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MAP VIEW */}
        {view==='map'&&(
          <div style={{flex:1,position:'relative',overflow:'hidden',background:'var(--bg3)'}}>
            <div style={{padding:20,fontSize:13,color:'var(--muted)',textAlign:'center'}}>
              🗺️ Carte des membres
              <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
                {allProfiles.filter(p=>p.location_lat&&p.location_lng).map(p=>{
                  const isOnline=onlineUsers.some(u=>u.username===p.username)
                  return(
                    <div key={p.username} onClick={()=>setViewProfile(p)} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',background:p.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
                        {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.avatar_emoji}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:isOnline?'var(--text)':'var(--muted)'}}>{p.username}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>📍 {p.location_name||`${p.location_lat?.toFixed(1)}, ${p.location_lng?.toFixed(1)}`}</div>
                      </div>
                    </div>
                  )
                })}
                {allProfiles.filter(p=>p.location_lat).length===0&&<div style={{color:'var(--muted)',fontSize:13}}>Aucun membre n'a partagé sa localisation</div>}
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {(view==='chat'||view==='dm')&&(
          <>
            <div ref={messagesRef} style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:8}}>
              {view==='chat'?renderMessages(messages).flat():renderDMs(dms)}
            </div>

            {replyTo&&(
              <div style={{padding:'8px 16px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <div style={{borderLeft:'3px solid var(--accent)',paddingLeft:10,flex:1}}>
                  <div style={{fontSize:11,color:'var(--accent2)',fontWeight:600,marginBottom:2}}>↩️ Répondre à {replyTo.author}</div>
                  <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{replyTo.content||'📎 Fichier'}</div>
                </div>
                <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:18}}>✕</button>
              </div>
            )}

            <div style={{padding:'12px 16px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8,flexShrink:0,position:'relative'}}>
              {selectedFile&&<div style={{background:'var(--bg3)',border:'1px solid rgba(124,106,247,.4)',borderRadius:10,padding:'9px 13px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'space-between'}}><span>📎 {selectedFile.name}</span><button onClick={()=>setSelectedFile(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:15}}>✕</button></div>}
              {isRecording&&<div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:10,padding:'9px 13px',fontSize:13,display:'flex',alignItems:'center',gap:8,color:'#f87171'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#f87171',display:'inline-block'}}/>🎤 {recordingTime}s<button onClick={stopRecording} style={{marginLeft:'auto',background:'#f87171',border:'none',borderRadius:8,padding:'4px 10px',color:'white',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Envoyer ✓</button><button onClick={()=>{if(mediaRecorderRef.current){mediaRecorderRef.current.stream?.getTracks().forEach(t=>t.stop())}setIsRecording(false);clearInterval(recordingTimerRef.current)}} style={{background:'none',border:'none',cursor:'pointer',color:'#f87171',fontSize:15}}>✕</button></div>}

              {pickerOpen&&(
                <div style={{position:'absolute',bottom:76,left:16,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:12,width:320,maxHeight:360,overflowY:'auto',boxShadow:'0 20px 50px rgba(0,0,0,.6)',zIndex:50}}>
                  <div style={{display:'flex',gap:3,marginBottom:10,position:'sticky',top:0,background:'var(--bg2)',paddingBottom:6}}>
                    {(['emoji','sticker','cod','custom','create'] as const).map(t=><button key={t} onClick={()=>setPickerTab(t)} style={{flex:1,padding:'5px 2px',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:10,background:pickerTab===t?'rgba(124,106,247,.2)':'transparent',color:pickerTab===t?'var(--accent2)':'var(--muted)',fontWeight:pickerTab===t?600:400}}>{t==='emoji'?'😊':t==='sticker'?'✨':t==='cod'?'🎮':t==='custom'?'⭐':'➕'}</button>)}
                  </div>
                  {pickerTab==='emoji'&&<div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:2}}>{ALL_EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{fontSize:22,padding:4,border:'none',background:'transparent',cursor:'pointer',borderRadius:8,lineHeight:1}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{e}</button>)}</div>}
                  {pickerTab==='sticker'&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>{STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:32,padding:6,border:'none',background:'transparent',cursor:'pointer',borderRadius:10,lineHeight:1}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.18)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}</div>}
                  {pickerTab==='cod'&&<><div style={{fontSize:11,color:'var(--muted)',marginBottom:6,fontWeight:600}}>🎮 CoD</div><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>{COD_STICKERS.map(s=><button key={s} onClick={()=>sendSticker(s)} style={{fontSize:28,padding:6,border:'1px solid rgba(200,162,0,.2)',background:'rgba(200,162,0,.1)',cursor:'pointer',borderRadius:10,lineHeight:1}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.2)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s}</button>)}</div></>}
                  {pickerTab==='custom'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>{customStickers.length===0?<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:16}}>Aucun sticker. Crée-en un ➕</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>{customStickers.map(s=><button key={s.id} onClick={()=>sendSticker(s.content,true)} style={{background:s.bg_color,color:s.text_color,border:'none',borderRadius:12,padding:'10px 8px',cursor:'pointer',fontWeight:700,fontSize:13,lineHeight:1.3,wordBreak:'break-word'}} onMouseEnter={ev=>(ev.currentTarget.style.transform='scale(1.04)')} onMouseLeave={ev=>(ev.currentTarget.style.transform='scale(1)')}>{s.content}<div style={{fontSize:10,opacity:.7,marginTop:3}}>par {s.creator}</div></button>)}</div>}</div>}
                  {pickerTab==='create'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div style={{fontSize:13,fontWeight:600}}>Crée ton sticker ✨</div>
                    <textarea value={csText} onChange={e=>setCsText(e.target.value)} placeholder="Texte..." maxLength={40} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:10,color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',height:60,resize:'none'}}/>
                    <div><div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Fond</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>setCsBg(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:csBg===c?'3px solid white':'2px solid transparent',cursor:'pointer',transform:csBg===c?'scale(1.15)':'scale(1)',transition:'transform .1s'}}/>)}</div></div>
                    <div><div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Texte</div><div style={{display:'flex',gap:6}}>{['#ffffff','#000000','#fbbf24','#34d399','#f87171'].map(c=><button key={c} onClick={()=>setCsColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:csColor===c?'3px solid var(--accent)':'2px solid var(--border)',cursor:'pointer'}}/>)}</div></div>
                    {csText&&<div style={{background:csBg,color:csColor,borderRadius:12,padding:'10px 14px',fontWeight:700,fontSize:15,textAlign:'center'}}>{csText}</div>}
                    <button onClick={createCustomSticker} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Créer (+5 pts) ✨</button>
                  </div>}
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>setPickerOpen(p=>!p)} style={{width:38,height:38,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}>😊</button>
                <button onClick={()=>fileRef.current?.click()} style={{width:38,height:38,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}>📎</button>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>25*1024*1024){toast$('Max 25 Mo');return}setSelectedFile(f)}}}/>
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} style={{width:38,height:38,borderRadius:10,background:isRecording?'rgba(248,113,113,.2)':'var(--bg3)',border:`1px solid ${isRecording?'rgba(248,113,113,.5)':'var(--border)'}`,color:isRecording?'#f87171':'var(--muted)',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🎤</button>
                <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);autoResize(e.target)}} onKeyDown={handleKey} placeholder={view==='dm'&&dmTarget?`Message à ${dmTarget}...`:'Message...'} style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,padding:'10px 15px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',resize:'none',height:40,maxHeight:110,lineHeight:1.4}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
                <button onClick={send} disabled={sending} style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',color:'white',cursor:sending?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sending?.5:1,boxShadow:'0 4px 14px rgba(124,106,247,.4)'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* GAME PANEL */}
      {activeGame&&activeGame.status!=='waiting'&&<GamePanel/>}

      {/* GAME INVITE */}
      {gameInvite&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:320,textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontSize:40,marginBottom:12}}>🎮</div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>{gameInvite.player1} t'invite à jouer !</div>
            <div style={{color:'var(--muted)',fontSize:14,marginBottom:8}}>{GAMES_LIST.find(g=>g.id===gameInvite.game_type)?.name}</div>
            {gameInvite.bet_points>0&&<div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:10,padding:'6px 12px',marginBottom:12,fontSize:13,color:'#fbbf24'}}>🎲 Mise: {gameInvite.bet_points} pts ({ptsFCFA(gameInvite.bet_points)})</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={acceptGame} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:12,fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✅ Accepter</button>
              <button onClick={()=>{supabase.from('games').update({status:'declined'}).eq('id',gameInvite.id);setGameInvite(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:12,padding:12,fontSize:14,fontFamily:'inherit',cursor:'pointer'}}>❌ Refuser</button>
            </div>
          </div>
        </div>
      )}

      {/* GAMES MODAL */}
      {showGames&&dmTarget&&(
        <div onClick={()=>setShowGames(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:360,boxShadow:'0 20px 60px rgba(0,0,0,.6)',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:6}}>🎮 Inviter {dmTarget}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Tu as {userPoints?.points||0} pts ({ptsFCFA(userPoints?.points||0)})</div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Mise (optionnel) — tu risques ces points</div>
              <div style={{display:'flex',gap:6}}>
                {[0,10,50,100].map(b=><button key={b} onClick={()=>setGameBet(b)} style={{flex:1,padding:'7px 4px',background:gameBet===b?'rgba(251,191,36,.2)':'var(--bg3)',border:`1px solid ${gameBet===b?'rgba(251,191,36,.5)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:gameBet===b?'#fbbf24':'var(--text)',fontFamily:'inherit',fontSize:12}}>{b===0?'Sans mise':`${b} pts`}</button>)}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {GAMES_LIST.map(g=>(
                <button key={g.id} onClick={()=>inviteToGame(g.id,dmTarget,gameBet)} style={{padding:'14px 16px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:14,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:12}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                  <span style={{fontSize:28}}>{g.emoji}</span>
                  <div><div style={{fontWeight:600,fontSize:14}}>{g.name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{g.desc}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POINTS MODAL */}
      {showPoints&&(
        <div onClick={()=>setShowPoints(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:24,padding:28,width:360,boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            <div style={{fontWeight:700,fontSize:20,marginBottom:4}}>⭐ Mes Points</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>10 pts = 5 FCFA • 1000 pts minimum pour retirer</div>
            <div style={{background:'linear-gradient(135deg,rgba(251,191,36,.1),rgba(251,191,36,.05))',border:'1px solid rgba(251,191,36,.3)',borderRadius:16,padding:20,textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:40,fontWeight:700,color:'#fbbf24'}}>{userPoints?.points||0}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>points disponibles</div>
              <div style={{fontSize:16,color:'#fbbf24',marginTop:6,fontWeight:600}}>{ptsFCFA(userPoints?.points||0)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16,fontSize:12}}>
              <div style={{background:'var(--bg3)',borderRadius:12,padding:12,textAlign:'center'}}><div style={{fontWeight:700,fontSize:18,color:'var(--accent2)'}}>{userPoints?.total_earned||0}</div><div style={{color:'var(--muted)'}}>Total gagné</div></div>
              <div style={{background:'var(--bg3)',borderRadius:12,padding:12,textAlign:'center'}}><div style={{fontWeight:700,fontSize:18,color:'#f97316'}}>🔥 {userPoints?.streak_days||0}</div><div style={{color:'var(--muted)'}}>Jours de suite</div></div>
            </div>
            <div style={{background:'var(--bg3)',borderRadius:12,padding:12,marginBottom:16,fontSize:12,color:'var(--muted)'}}>
              <div style={{fontWeight:600,color:'var(--text)',marginBottom:6}}>Comment gagner des points</div>
              <div>🌅 Connexion quotidienne : +10 pts</div>
              <div>🔥 Série 3+ jours : +15 pts/jour</div>
              <div>💬 Message : +1 pt • Sticker : +2 pts</div>
              <div>🎮 Victoire jeu : +15 pts + mise×2</div>
              <div>😔 Défaite : -mise pts</div>
              <div style={{marginTop:6,color:'#fbbf24',fontWeight:500}}>10 pts = 5 FCFA • Min. 1000 pts pour retrait</div>
            </div>
            <button onClick={()=>{setShowPoints(false);setShowWithdraw(true)}} style={{width:'100%',background:(userPoints?.points||0)>=1000?'linear-gradient(135deg,#f59e0b,#fbbf24)':'var(--bg3)',color:(userPoints?.points||0)>=1000?'#000':'var(--muted)',border:(userPoints?.points||0)<1000?'1px solid var(--border)':'none',borderRadius:12,padding:13,fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:(userPoints?.points||0)>=1000?'pointer':'not-allowed'}}>
              {(userPoints?.points||0)>=1000?`💰 Retirer ${ptsFCFA(userPoints?.points||0)}`:`⛔ ${1000-(userPoints?.points||0)} pts restants pour retirer`}
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdraw&&(
        <div onClick={()=>setShowWithdraw(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:160,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:28,width:340,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:16}}>💰 Retrait Mobile Money</div>
            <div style={{background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:12,padding:12,marginBottom:16,textAlign:'center'}}>
              <div style={{fontSize:24,fontWeight:700,color:'#fbbf24'}}>{ptsFCFA(userPoints?.points||0)}</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{Math.floor((userPoints?.points||0)/10)*10} points utilisés</div>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {['Bénin','Togo','Côte d\'Ivoire','Sénégal'].map(c=><button key={c} onClick={()=>setWithdrawCountry(c)} style={{flex:1,padding:'6px 4px',background:withdrawCountry===c?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawCountry===c?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:10}}>{c}</button>)}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {['MTN','Moov','Orange','Wave'].map(n=><button key={n} onClick={()=>setWithdrawNetwork(n)} style={{flex:1,padding:'6px 4px',background:withdrawNetwork===n?'rgba(124,106,247,.2)':'var(--bg3)',border:`1px solid ${withdrawNetwork===n?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:'var(--text)',fontFamily:'inherit',fontSize:12}}>{n}</button>)}
            </div>
            <input value={withdrawPhone} onChange={e=>setWithdrawPhone(e.target.value)} placeholder="Numéro Mobile Money" style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none',width:'100%',marginBottom:12}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={requestWithdraw} style={{flex:1,background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#000',border:'none',borderRadius:12,padding:12,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>Confirmer 💰</button>
              <button onClick={()=>setShowWithdraw(false)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {viewProfile&&(
        <div onClick={()=>setViewProfile(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(6px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:24,padding:0,width:340,overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
            {/* Cover */}
            <div style={{height:80,background:`linear-gradient(135deg,${viewProfile.avatar_color},${viewProfile.avatar_color}88)`,position:'relative'}}>
              <div style={{position:'absolute',bottom:-24,left:20,width:56,height:56,borderRadius:'50%',overflow:'hidden',background:viewProfile.avatar_color,border:'3px solid var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>
                {viewProfile.avatar_url?<img src={viewProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:viewProfile.avatar_emoji}
              </div>
            </div>
            <div style={{padding:'30px 20px 20px'}}>
              <div style={{fontWeight:700,fontSize:20,marginBottom:4}}>{viewProfile.username}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{statusEmoji(viewProfile.status||'online')} {viewProfile.status||'online'}</div>
              {viewProfile.bio&&<div style={{fontSize:13,color:'var(--text)',marginBottom:8}}>{viewProfile.bio}</div>}
              {viewProfile.location_name&&<div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>📍 {viewProfile.location_name}</div>}
              {onlineUsers.some(u=>u.username===viewProfile.username)&&<div style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.3)',borderRadius:20,padding:'4px 12px',fontSize:12,color:'#34d399',display:'inline-block',marginBottom:12}}>🟢 En ligne maintenant</div>}
              <div style={{display:'flex',gap:8}}>
                {viewProfile.username!==user&&<button onClick={()=>{openDM(viewProfile.username);setViewProfile(null)}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:12,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>💬 Envoyer un DM</button>}
                {viewProfile.username===user&&<button onClick={()=>{setStep('setup');setViewProfile(null)}} style={{flex:1,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:12,padding:10,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✏️ Modifier mon profil</button>}
                <button onClick={()=>setViewProfile(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {pinModal&&(
        <div onClick={()=>setPinModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,padding:24,width:300,display:'flex',flexDirection:'column',gap:14,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
            <div style={{fontWeight:700,fontSize:16}}>📌 Épingler {pinModal}</div>
            <input value={pinName} onChange={e=>setPinName(e.target.value)} placeholder="Nom personnalisé (optionnel)" maxLength={30} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 14px',color:'var(--text)',fontFamily:'inherit',fontSize:14,outline:'none'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={async()=>{const id=Math.random().toString(36).slice(2);await supabase.from('pinned_convos').upsert({id,owner:user,target:pinModal,custom_name:pinName||null},{onConflict:'owner,target'});const{data}=await supabase.from('pinned_convos').select('*').eq('owner',user);setPinnedConvos(data||[]);setPinModal(null);toast$('📌 Épinglé !')}} style={{flex:1,background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'white',border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>📌 Épingler</button>
              <button onClick={()=>setPinModal(null)} style={{background:'var(--bg3)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div style={{position:'fixed',bottom:80,left:'50%',transform:`translateX(-50%) translateY(${toastOn?0:14}px)`,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 18px',fontSize:13,opacity:toastOn?1:0,transition:'all .25s',pointerEvents:'none',zIndex:200,whiteSpace:'nowrap',color:'var(--text)'}}>{toast}</div>

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
        *{scrollbar-width:thin;scrollbar-color:var(--border) transparent}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      `}</style>
    </div>
  )
}

function AudioPlayer({url,isMe}:{url:string;isMe:boolean}){
  const [playing,setPlaying]=useState(false)
  const [progress,setProgress]=useState(0)
  const [duration,setDuration]=useState(0)
  const audioRef=useRef<HTMLAudioElement>(null)
  const toggle=()=>{if(!audioRef.current)return;if(playing){audioRef.current.pause();setPlaying(false)}else{audioRef.current.play();setPlaying(true)}}
  return(
    <div style={{display:'flex',alignItems:'center',gap:10,background:isMe?'rgba(255,255,255,.1)':'var(--bg3)',border:isMe?'none':'1px solid var(--border)',borderRadius:50,padding:'8px 14px',minWidth:180,maxWidth:240}}>
      <audio ref={audioRef} src={url} onTimeUpdate={()=>{if(audioRef.current)setProgress(audioRef.current.currentTime/audioRef.current.duration*100||0)}} onLoadedMetadata={()=>{if(audioRef.current)setDuration(audioRef.current.duration)}} onEnded={()=>setPlaying(false)}/>
      <button onClick={toggle} style={{width:32,height:32,borderRadius:'50%',background:isMe?'rgba(255,255,255,.2)':'rgba(124,106,247,.2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{playing?'⏸️':'▶️'}</button>
      <div style={{flex:1}}>
        <div style={{height:3,background:isMe?'rgba(255,255,255,.2)':'var(--border)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:isMe?'white':'var(--accent)',borderRadius:2,width:progress+'%',transition:'width .1s'}}/>
        </div>
        <div style={{fontSize:10,color:isMe?'rgba(255,255,255,.7)':'var(--muted)',marginTop:3}}>{duration?`${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`:'🎤 Audio'}</div>
      </div>
    </div>
  )
}
