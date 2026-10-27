'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    GraduationCap,
    Calendar,
    Users,
} from 'lucide-react'
import { PracticanteModal, type Practicante } from '@/components/Seleccion/PracticanteModal'

const ESTADO_BADGE_DEFAULT = 'bg-slate-100 text-slate-500 border-slate-200'
const ESTADO_BADGE: Record<string, string> = {
    ACTIVO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ACTIVA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'RECIENTEMENTE SALIÓ': 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function PracticantesPage() {
    const router = useRouter()
    const supabase = createClient()

    const [practicantes, setPracticantes] = useState<Practicante[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modalPracticante, setModalPracticante] = useState<Practicante | null | undefined>(undefined) // undefined = cerrado

    const fetchPracticantes = useCallback(async () => {
        setLoading(true)
        try {
            let query = (supabase.from('seleccion_practicantes' as any) as any)
                .select('*')
                .order('perfil', { ascending: true })

            if (search.trim()) {
                const term = search.trim()
                query = query.or(`perfil.ilike.%${term}%,tipo.ilike.%${term}%,estado.ilike.%${term}%,status.ilike.%${term}%`)
            }

            const { data, error } = await query
            if (error) throw error
            setPracticantes(data || [])
        } catch (err) {
            console.error('Error cargando practicantes:', err)
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    useEffect(() => {
        fetchPracticantes()
    }, [fetchPracticantes])

    const handleSaved = () => {
        setModalPracticante(undefined)
        fetchPracticantes()
    }
    const handleDeleted = () => {
        setModalPracticante(undefined)
        fetchPracticantes()
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/seleccion')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Practicantes</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 w-fit">
                        <GraduationCap size={18} />
                        {practicantes.length} practicante{practicantes.length !== 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={() => setModalPracticante(null)}
                        className="h-11 px-5 rounded-xl bg-[#1D3557] hover:bg-[#15263f] text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo practicante
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por perfil, tipo o estado..."
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={40} className="text-blue-600 animate-spin" />
                    </div>
                ) : practicantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                        <GraduationCap size={48} className="text-slate-300" />
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin resultados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {practicantes.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setModalPracticante(p)}
                                className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-black text-slate-800">{p.perfil}</h3>
                                        {p.estado && (
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ESTADO_BADGE[p.estado.trim().toUpperCase()] || ESTADO_BADGE_DEFAULT}`}>
                                                {p.estado}
                                            </span>
                                        )}
                                        {p.tipo && (
                                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                                {p.tipo}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                                        {(p.fecha_ingreso || p.fecha_sale) && (
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={13} className="text-blue-400" />
                                                {p.fecha_ingreso || '—'} {p.fecha_sale ? `→ ${p.fecha_sale}` : ''}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5">
                                            <Users size={13} className="text-blue-400" />
                                            {p.cantidad} cupo{p.cantidad !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {p.status && (
                                        <p className="text-xs text-slate-400 italic">{p.status}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {modalPracticante !== undefined && (
                <PracticanteModal
                    practicante={modalPracticante}
                    onClose={() => setModalPracticante(undefined)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}
