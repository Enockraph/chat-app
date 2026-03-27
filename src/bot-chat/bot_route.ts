import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { botPersonality, botName, message, history } = await req.json()

  const messages = [
    { role: 'user' as const, content: `${botPersonality}\n\nHistorique de la conversation:\n${(history||[]).map((h:any)=>`${h.role==='user'?'Utilisateur':botName}: ${h.content}`).join('\n')}\n\nUtilisateur: ${message}\n\nRéponds en tant que ${botName} de façon naturelle, courte (1-3 phrases max), sans te répéter. Ne dis jamais que tu es une IA.` }
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages
    })
  })

  const data = await res.json()
  const reply = data.content?.[0]?.text || 'Je suis occupée là, on se parle plus tard 😊'
  return NextResponse.json({ reply })
}
