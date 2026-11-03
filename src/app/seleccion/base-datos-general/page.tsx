'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    Database,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    Link2,
    Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { VacanteModal, type Vacante } from '@/components/Seleccion/VacanteModal'

const PAGE_SIZE = 15

const TABS: { value: 'TODAS' | 'ACTIVA' | 'CERRADA' | 'CANCELADA'; label: string }[] = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'ACTIVA', label: 'Activas' },
    { value: 'CERRADA', label: 'Cerradas' },
    { value: 'CANCELADA', label: 'Canceladas' },
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

function buildPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
    const filtered = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
    const result: (number | '...')[] = []
    let prev = 0
    for (const p of filtered) {
        if (prev && p - prev > 1) result.push('...')
        result.push(p)
        prev = p
    }
    return result
}

export default function BaseDatosGeneralPage() {
    const router = useRouter()
    const supabase = createClient()

    const [vacantes, setVacantes] = useState<Vacante[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState<typeof TABS[number]['value']>('TODAS')
    const [areaFiltro, setAreaFiltro] = useState('TODAS')
    const [plantaFiltro, setPlantaFiltro] = useState('TODAS')
    const [modalVacante, setModalVacante] = useState<Vacante | null | undefined>(undefined) // undefined = cerrado
    const [linkCopiado, setLinkCopiado] = useState(false)

    const [stats, setStats] = useState({ total: 0, activa: 0, cerrada: 0, cancelada: 0 })
    const [areas, setAreas] = useState<string[]>([])
    const [plantas, setPlantas] = useState<string[]>([])

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

    // Opciones de filtro Área/Planta y conteos por estado: se cargan aparte (solo
    // columnas livianas, sin paginar) para no depender de lo que esté filtrado.
    const fetchStatsYOpciones = useCallback(async () => {
        try {
            const base = () => supabase.from('seleccion_vacantes' as any) as any
            const [{ count: cTotal }, { count: cActiva }, { count: cCerrada }, { count: cCancelada }, { data: opciones }] = await Promise.all([
                base().select('*', { count: 'exact', head: true }),
                base().select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVA'),
                base().select('*', { count: 'exact', head: true }).eq('estado', 'CERRADA'),
                base().select('*', { count: 'exact', head: true }).eq('estado', 'CANCELADA'),
                base().select('area, planta'),
            ])
            setStats({ total: cTotal || 0, activa: cActiva || 0, cerrada: cCerrada || 0, cancelada: cCancelada || 0 })
            const areaSet = new Set<string>()
            const plantaSet = new Set<string>()
            for (const row of (opciones || [])) {
                if (row.area) areaSet.add(row.area)
                if (row.planta) plantaSet.add(row.planta)
            }
            setAreas([...areaSet].sort((a, b) => a.localeCompare(b)))
            setPlantas([...plantaSet].sort((a, b) => a.localeCompare(b)))
        } catch (err) {
            console.error('Error cargando estadísticas de selección:', err)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchVacantes = useCallback(async () => {
        setLoading(true)
        try {
            let query = (supabase.from('seleccion_vacantes' as any) as any)
                .select('*', { count: 'exact' })
                .order('fecha_solicitud', { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            if (tab !== 'TODAS') {
                query = query.eq('estado', tab)
            }
            if (areaFiltro !== 'TODAS') {
                query = query.eq('area', areaFiltro)
            }
            if (plantaFiltro !== 'TODAS') {
                query = query.eq('planta', plantaFiltro)
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
    }, [page, tab, areaFiltro, plantaFiltro, search])

    useEffect(() => {
        fetchStatsYOpciones()
    }, [fetchStatsYOpciones])

    useEffect(() => {
        fetchVacantes()
    }, [fetchVacantes])

    useEffect(() => {
        setPage(0)
    }, [search, tab, areaFiltro, plantaFiltro])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const pageNumbers = useMemo(() => buildPageNumbers(page + 1, totalPages), [page, totalPages])

    const handleSaved = () => {
        setModalVacante(undefined)
        fetchVacantes()
        fetchStatsYOpciones()
    }
    const handleDeleted = () => {
        setModalVacante(undefined)
        fetchVacantes()
        fetchStatsYOpciones()
    }

    const statCards = [
        { label: 'Total de vacantes', value: stats.total, desc: 'Todas las solicitudes', icon: Database, color: 'text-blue-600 bg-blue-50' },
        { label: 'Activas', value: stats.activa, desc: 'En búsqueda de candidatos', icon: Clock, color: 'text-blue-600 bg-blue-50' },
        { label: 'Cerradas', value: stats.cerrada, desc: 'Procesos finalizados', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Canceladas', value: stats.cancelada, desc: 'Solicitud no continuó', icon: XCircle, color: 'text-slate-500 bg-slate-100' },
    ]

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

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-[#1D3557] tracking-tight">Base de datos de vacantes</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Gestiona, consulta y da seguimiento a todas las solicitudes de personal.</p>
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map(s => {
                        const Icon = s.icon
                        return (
                            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                                    <div className={`rounded-xl p-2 ${s.color}`}>
                                        <Icon size={16} />
                                    </div>
                                </div>
                                <p className="text-3xl font-black text-slate-800">{s.value}</p>
                                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-1 px-3 pt-3 border-b border-slate-100 overflow-x-auto">
                        {TABS.map(t => {
                            const count = t.value === 'TODAS' ? stats.total : t.value === 'ACTIVA' ? stats.activa : t.value === 'CERRADA' ? stats.cerrada : stats.cancelada
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => setTab(t.value)}
                                    className={`px-4 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all border-b-2 ${tab === t.value
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {t.label} ({count})
                                </button>
                            )
                        })}
                    </div>

                    <div className="p-4 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por cargo, planta, área o solicitante..."
                                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                            />
                        </div>
                        <select
                            value={areaFiltro}
                            onChange={(e) => setAreaFiltro(e.target.value)}
                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="TODAS">Área: todas</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <select
                            value={plantaFiltro}
                            onChange={(e) => setPlantaFiltro(e.target.value)}
                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="TODAS">Planta: todas</option>
                            {plantas.map(p => <option key={p} value={p}>{p}</option>)}
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <th className="px-5 py-3">Cargo</th>
                                        <th className="px-5 py-3">Área</th>
                                        <th className="px-5 py-3">Planta</th>
                                        <th className="px-5 py-3">Fecha solicitud</th>
                                        <th className="px-5 py-3 text-center">Días</th>
                                        <th className="px-5 py-3">Estado</th>
                                        <th className="px-5 py-3">Cumplimiento ANS</th>
                                        <th className="px-5 py-3">Solicitante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {vacantes.map(v => {
                                        const cump = cumplimientoInfo(v)
                                        return (
                                            <tr
                                                key={v.id}
                                                onClick={() => setModalVacante(v)}
                                                className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 text-sm">{v.cargo}</span>
                                                        {v.numero_personas_solicitada > 1 && (
                                                            <span className="text-[11px] text-slate-400 font-medium">{v.numero_personas_solicitada} personas</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{v.area || '—'}</td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{v.planta || '—'}</td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">
                                                    {new Date(`${v.fecha_solicitud}T00:00:00`).toLocaleDateString('es-CO')}
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600 text-center">{cump.dias != null ? `${cump.dias}d` : '—'}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ESTADO_BADGE[v.estado]}`}>
                                                        {v.estado}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cump.color}`}>
                                                        {cump.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{v.solicita || '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && vacantes.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 flex-wrap gap-3">
                            <p className="text-xs text-slate-400 font-medium">
                                Mostrando {page * PAGE_SIZE + 1}-{Math.min(total, page * PAGE_SIZE + vacantes.length)} de {total} resultados
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {pageNumbers.map((p, i) => p === '...' ? (
                                    <span key={`dots-${i}`} className="px-1.5 text-slate-300 text-sm">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p - 1)}
                                        className={`h-9 min-w-9 px-2 rounded-lg text-sm font-bold transition-all ${p === page + 1
                                            ? 'bg-[#1D3557] text-white'
                                            : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
