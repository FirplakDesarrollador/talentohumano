'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    Database,
    Building2,
    Calendar,
    Users,
    UserRound,
    ChevronLeft,
    ChevronRight,
    Link2,
    Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { VacanteModal, type Vacante } from '@/components/Seleccion/VacanteModal'

const PAGE_SIZE = 20

const ESTADO_FILTROS = [
    { value: 'TODOS', label: 'Todos los estados' },
    { value: 'ACTIVA', label: 'Activa' },
    { value: 'CERRADA', label: 'Cerrada' },
    { value: 'CANCELADA', label: 'Cancelada' },
]

const ESTADO_BADGE: Record<string, string> = {
    ACTIVA: 'bg-blue-100 text-blue-700 border-blue-200',
    CERRADA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELADA: 'bg-slate-200 text-slate-600 border-slate-300',
}

function diffDias(a: string, b: string): number {
    const d1 = new Date(`${a}T00:00:00`)
    const d2 = new Date(`${b}T00:00:00`)
    return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}

function cumplimientoInfo(v: Vacante): { label: string; color: string; dias: number | null } {
    if (v.estado === 'CANCELADA') {
        return { label: 'Cancelada', color: 'bg-slate-100 text-slate-500 border-slate-200', dias: null }
    }
    if (v.estado === 'ACTIVA') {
        const hoy = new Date().toISOString().slice(0, 10)
        const dias = diffDias(v.fecha_solicitud, hoy)
        if (v.ans != null && dias > v.ans) {
            return { label: 'Retraso', color: 'bg-red-100 text-red-700 border-red-200', dias }
        }
        return { label: 'En proceso', color: 'bg-amber-100 text-amber-700 border-amber-200', dias }
    }
    // CERRADA
    if (v.fecha_real_ingreso) {
        const dias = diffDias(v.fecha_solicitud, v.fecha_real_ingreso)
        if (v.ans != null) {
            return dias <= v.ans
                ? { label: 'Cumplió ANS', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dias }
                : { label: 'No cumplió ANS', color: 'bg-amber-100 text-amber-700 border-amber-200', dias }
        }
        return { label: 'Cerrada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dias }
    }
    return { label: 'Cerrada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dias: null }
}

export default function BaseDatosGeneralPage() {
    const router = useRouter()
    const supabase = createClient()

    const [vacantes, setVacantes] = useState<Vacante[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [search, setSearch] = useState('')
    const [estadoFiltro, setEstadoFiltro] = useState('TODOS')
    const [modalVacante, setModalVacante] = useState<Vacante | null | undefined>(undefined) // undefined = cerrado
    const [linkCopiado, setLinkCopiado] = useState(false)

    const handleCopySolicitarPersonalLink = async () => {
        const link = `${window.location.origin}/solicitar-personal`
        try {
            await navigator.clipboard.writeText(link)
            setLinkCopiado(true)
            toast.success('Link copiado al portapapeles')
            setTimeout(() => setLinkCopiado(false), 2000)
        } catch {
            toast.error('No se pudo copiar el link')
        }
    }

    const fetchVacantes = useCallback(async () => {
        setLoading(true)
        try {
            let query = (supabase.from('seleccion_vacantes' as any) as any)
                .select('*', { count: 'exact' })
                .order('fecha_solicitud', { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            if (estadoFiltro !== 'TODOS') {
                query = query.eq('estado', estadoFiltro)
            }
            if (search.trim()) {
                const term = search.trim()
                query = query.or(`cargo.ilike.%${term}%,planta.ilike.%${term}%,area.ilike.%${term}%,solicita.ilike.%${term}%`)
            }

            const { data, error, count } = await query
            if (error) throw error
            setVacantes(data || [])
            setTotal(count || 0)
        } catch (err) {
            console.error('Error cargando base de datos de selección:', err)
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, estadoFiltro, search])

    useEffect(() => {
        fetchVacantes()
    }, [fetchVacantes])

    useEffect(() => {
        setPage(0)
    }, [search, estadoFiltro])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const handleSaved = () => {
        setModalVacante(undefined)
        fetchVacantes()
    }
    const handleDeleted = () => {
        setModalVacante(undefined)
        fetchVacantes()
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
                <h1 className="flex-1 text-center text-white font-medium text-lg">Base de Datos General</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 w-fit">
                        <Database size={18} />
                        {total} vacante{total !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopySolicitarPersonalLink}
                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all flex items-center gap-2"
                        >
                            {linkCopiado ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} />}
                            {linkCopiado ? 'Copiado' : 'Copiar link solicitar personal'}
                        </button>
                        <button
                            onClick={() => setModalVacante(null)}
                            className="h-11 px-5 rounded-xl bg-[#1D3557] hover:bg-[#15263f] text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Nueva vacante
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por cargo, planta, área o solicitante..."
                            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                        />
                    </div>
                    <select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                        {ESTADO_FILTROS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={40} className="text-blue-600 animate-spin" />
                    </div>
                ) : vacantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                        <Database size={48} className="text-slate-300" />
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin resultados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {vacantes.map(v => {
                            const cump = cumplimientoInfo(v)
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setModalVacante(v)}
                                    className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5"
                                >
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="space-y-2 flex-1 min-w-[200px]">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-black text-slate-800">{v.cargo}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ESTADO_BADGE[v.estado]}`}>
                                                    {v.estado}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cump.color}`}>
                                                    {cump.label}{cump.dias != null ? ` · ${cump.dias}d` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Building2 size={13} className="text-blue-400" />
                                                    {v.planta || 'Sin planta'}{v.area ? ` · ${v.area}` : ''}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-blue-400" />
                                                    {new Date(`${v.fecha_solicitud}T00:00:00`).toLocaleDateString('es-CO')}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users size={13} className="text-blue-400" />
                                                    {v.numero_personas_solicitada} persona{v.numero_personas_solicitada !== 1 ? 's' : ''}
                                                </span>
                                                {v.solicita && (
                                                    <span className="flex items-center gap-1.5">
                                                        <UserRound size={13} className="text-blue-400" />
                                                        {v.solicita}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-500">Página {page + 1} de {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {modalVacante !== undefined && (
                <VacanteModal
                    vacante={modalVacante}
                    onClose={() => setModalVacante(undefined)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}
