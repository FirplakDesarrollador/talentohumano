import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'

export async function POST(request: Request) {
    let comentarioOriginal = ''
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        comentarioOriginal = typeof body?.comentario === 'string' ? body.comentario : ''

        if (!comentarioOriginal.trim()) {
            return NextResponse.json({ comentario: comentarioOriginal })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY no configurada, se guarda el comentario original')
            return NextResponse.json({ comentario: comentarioOriginal })
        }

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 400,
                messages: [{
                    role: 'user',
                    content: `Eres un asistente de Talento Humano. Reescribe el siguiente comentario de un proceso disciplinario, corrigiendo ortografía, gramática, tildes y redacción, en tono formal, claro y objetivo. No agregues, quites ni inventes hechos, fechas o nombres que no estén en el texto original, y no agregues opiniones ni conclusiones nuevas. Si el comentario ya está bien escrito, devuélvelo igual. Responde ÚNICAMENTE con el texto corregido, sin comillas, sin explicaciones ni prefijos.\n\nComentario original:\n${comentarioOriginal}`,
                }],
            }),
        })

        if (!res.ok) {
            console.error('Error de Anthropic API mejorando comentario:', await res.text())
            return NextResponse.json({ comentario: comentarioOriginal })
        }

        const data = await res.json()
        const mejorado = data?.content?.[0]?.text?.trim()

        return NextResponse.json({ comentario: mejorado || comentarioOriginal })
    } catch (err: any) {
        console.error('Error mejorando comentario:', err)
        return NextResponse.json({ comentario: comentarioOriginal })
    }
}
