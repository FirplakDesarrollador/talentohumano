'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    GraduationCap,
    Users,
    UserCheck,
    UserMinus,
    HelpCircle,
} from 'lucide-react'
import { PracticanteModal, type Practicante } from '@/components/Seleccion/PracticanteModal'

type TabValue = 'TODOS' | 'ACTIVO' | 'SALIO' | 'SIN_ESTADO'

const TABS: { value: TabValue; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'ACTIVO', label: 'Activos' },
    { value: 'SALIO', label: 'Recientemente salió' },
    { value: 'SIN_ESTADO', label: 'Sin estado' },
]

function categoria(estado: string | null): TabValue {
    const e = (estado || '').trim().toUpperCase()
    if (!e) return 'SIN_ESTADO'
    if (e.includes('SALI')) return 'SALIO'
    if (e.startsWith('ACTIV')) return 'ACTIVO'
    return 'SIN_ESTADO'
}

const ESTADO_BADGE: Record<TabValue, string> = {
    TODOS: 'bg-slate-100 text-slate-500 border-slate-200',
    ACTIVO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    SALIO: 'bg-amber-100 text-amber-700 border-amber-200',
    SIN_ESTADO: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function PracticantesPage() {
    const router = useRouter()
    const supabase = createClient()

    const [practicantes, setPracticantes] = useState<Practicante[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState<TabValue>('TODOS')
    const [modalPracticante, setModalPracticante] = useState<Practicante | null | undefined>(undefined) // undefined = cerrado

    const fetchPracticantes = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase.from('seleccion_practicantes' as any) as any)
                .select('*')
                .order('perfil', { ascending: true })
            if (error) throw error
            setPracticantes(data || [])
        } catch (err) {
            console.error('Error cargando practicantes:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPracticantes()
    }, [fetchPracticantes])

    const stats = useMemo(() => {
        const base = { total: practicantes.length, activo: 0, salio: 0, sinEstado: 0 }
        for (const p of practicantes) {
            const c = categoria(p.estado)
            if (c === 'ACTIVO') base.activo++
            else if (c === 'SALIO') base.salio++
            else base.sinEstado++
        }
        return base
    }, [practicantes])

    const filtrados = useMemo(() => {
        const term = search.trim().toLowerCase()
        return practicantes.filter(p => {
            if (tab !== 'TODOS' && categoria(p.estado) !== tab) return false
            if (term) {
                const haystack = `${p.perfil} ${p.tipo || ''} ${p.estado || ''} ${p.status || ''}`.toLowerCase()
                if (!haystack.includes(term)) return false
            }
            return true
        })
    }, [practicantes, tab, search])

    const handleSaved = () => {
        setModalPracticante(undefined)
        fetchPracticantes()
    }
    const handleDeleted = () => {
        setModalPracticante(undefined)
        fetchPracticantes()
    }

    const statCards = [
        { label: 'Total de practicantes', value: stats.total, desc: 'Todos los cupos registrados', icon: GraduationCap, color: 'text-blue-600 bg-blue-50' },
        { label: 'Activos', value: stats.activo, desc: 'Vinculados actualmente', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Recientemente salió', value: stats.salio, desc: 'Terminaron su proceso', icon: UserMinus, color: 'text-amber-600 bg-amber-50' },
        { label: 'Sin estado', value: stats.sinEstado, desc: 'Falta registrar su estado', icon: HelpCircle, color: 'text-slate-500 bg-slate-100' },
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
                <h1 className="flex-1 text-center text-white font-medium text-lg">Practicantes</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-[#1D3557] tracking-tight">Base de datos de practicantes</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Gestiona y da seguimiento a los cupos de practicantes y aprendices.</p>
                    </div>
                    <button
                        onClick={() => setModalPracticante(null)}
                        className="h-11 px-5 rounded-xl bg-[#1D3557] hover:bg-[#15263f] text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo practicante
                    </button>
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
                            const count = t.value === 'TODOS' ? stats.total : t.value === 'ACTIVO' ? stats.activo : t.value === 'SALIO' ? stats.salio : stats.sinEstado
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

                    <div className="p-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por perfil, tipo o estado..."
                                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 size={40} className="text-blue-600 animate-spin" />
                        </div>
                    ) : filtrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                            <GraduationCap size={48} className="text-slate-300" />
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin resultados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <th className="px-5 py-3">Perfil</th>
                                        <th className="px-5 py-3">Tipo</th>
                                        <th className="px-5 py-3 text-center">Cupos</th>
                                        <th className="px-5 py-3">Ingresa</th>
                                        <th className="px-5 py-3">Sale</th>
                                        <th className="px-5 py-3">Estado</th>
                                        <th className="px-5 py-3">Seguimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtrados.map(p => (
                                        <tr
                                            key={p.id}
                                            onClick={() => setModalPracticante(p)}
                                            className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-3.5">
                                                <span className="font-bold text-gray-800 text-sm">{p.perfil}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{p.tipo || '—'}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600 text-center">
                                                <span className="inline-flex items-center gap-1">
                                                    <Users size={13} className="text-blue-400" />
                                                    {p.cantidad}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{p.fecha_ingreso || '—'}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-600">{p.fecha_sale || '—'}</td>
                                            <td className="px-5 py-3.5">
                                                {p.estado ? (
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ESTADO_BADGE[categoria(p.estado)]}`}>
                                                        {p.estado}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[220px] truncate">{p.status || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && filtrados.length > 0 && (
                        <div className="px-5 py-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 font-medium">
                                Mostrando {filtrados.length} de {practicantes.length} resultados
                            </p>
                        </div>
                    )}
                </div>
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
