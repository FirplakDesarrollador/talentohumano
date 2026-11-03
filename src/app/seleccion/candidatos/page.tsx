'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Search,
    Loader2,
    Users,
    Link2,
    Check,
    FileText,
    ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { CandidatoModal, type Candidato } from '@/components/Seleccion/CandidatoModal'

export default function CandidatosSeleccionPage() {
    const router = useRouter()
    const supabase = createClient()

    const [candidatos, setCandidatos] = useState<Candidato[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modalCandidato, setModalCandidato] = useState<Candidato | null>(null)
    const [linkCopiado, setLinkCopiado] = useState(false)

    const handleCopyInscripcionLink = async () => {
        const link = `${window.location.origin}/inscripcion-candidatos`
        try {
            await navigator.clipboard.writeText(link)
            setLinkCopiado(true)
            toast.success('Link copiado al portapapeles')
            setTimeout(() => setLinkCopiado(false), 2000)
        } catch {
            toast.error('No se pudo copiar el link')
        }
    }

    const fetchCandidatos = useCallback(async () => {
        setLoading(true)
        try {
            let query = (supabase.from('seleccion_candidatos' as any) as any)
                .select('*, seleccion_vacantes(cargo)')
                .order('created_at', { ascending: false })

            if (search.trim()) {
                const term = search.trim()
                query = query.or(`nombre_completo.ilike.%${term}%,email.ilike.%${term}%,cedula.ilike.%${term}%`)
            }

            const { data, error } = await query
            if (error) throw error
            const mapped = (data || []).map((c: any) => ({ ...c, vacante_cargo: c.seleccion_vacantes?.cargo || null }))
            setCandidatos(mapped)
        } catch (err) {
            console.error('Error cargando candidatos de selección:', err)
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    useEffect(() => {
        fetchCandidatos()
    }, [fetchCandidatos])

    const cartasEnviadas = (c: Candidato) => [c.carta_agradecimiento_enviada_at, c.carta_bienvenida_enviada_at, c.carta_archivos_enviada_at].filter(Boolean).length

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/seleccion')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Inscripción de Candidatos</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-[#1D3557] tracking-tight">Candidatos inscritos</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Revisa las postulaciones recibidas y envía las cartas de agradecimiento, bienvenida o confirmación de documentos.</p>
                    </div>
                    <button
                        onClick={handleCopyInscripcionLink}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all flex items-center gap-2"
                    >
                        {linkCopiado ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} />}
                        {linkCopiado ? 'Copiado' : 'Copiar link de inscripción'}
                    </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 w-fit">
                        <Users size={18} />
                        {candidatos.length} candidato{candidatos.length !== 1 ? 's' : ''}
                    </div>
                    <div className="relative flex-1 min-w-[240px] max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, cédula o email..."
                            className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 size={40} className="text-blue-600 animate-spin" />
                        </div>
                    ) : candidatos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                            <Users size={48} className="text-slate-300" />
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin candidatos inscritos</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <th className="px-5 py-3">Candidato</th>
                                        <th className="px-5 py-3">Vacante</th>
                                        <th className="px-5 py-3">Contacto</th>
                                        <th className="px-5 py-3">Hoja de vida</th>
                                        <th className="px-5 py-3">Inscripción</th>
                                        <th className="px-5 py-3 text-center">Cartas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {candidatos.map(c => (
                                        <tr
                                            key={c.id}
                                            onClick={() => setModalCandidato(c)}
                                            className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{c.nombre_completo}</span>
                                                    <span className="text-[11px] text-slate-400 font-medium">{c.cedula || 'Sin cédula'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{c.vacante_cargo || '—'}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col text-xs text-slate-500">
                                                    <span>{c.email}</span>
                                                    <span>{c.telefono}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {c.hoja_vida_url ? (
                                                    <a
                                                        href={c.hoja_vida_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                                                    >
                                                        <FileText size={13} />
                                                        Ver <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">
                                                {new Date(c.created_at).toLocaleDateString('es-CO')}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cartasEnviadas(c) > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {cartasEnviadas(c)}/3 enviadas
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {modalCandidato && (
                <CandidatoModal
                    candidato={modalCandidato}
                    onClose={() => setModalCandidato(null)}
                    onChanged={fetchCandidatos}
                />
            )}
        </div>
    )
}
