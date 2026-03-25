'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Plus,
    ArrowLeft,
    UserX,
    Loader2,
    Search,
    Eraser,
    FileUp
} from 'lucide-react'
import { AusentismoCard, type Ausentismo } from '@/components/Ausentismos/AusentismoCard'
import { AusentismoRow } from '@/components/Ausentismos/AusentismoRow'
import { toast } from 'sonner'
import Link from 'next/link'
import { subMonths, isAfter, parse, isValid } from 'date-fns'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function AusentismosPage() {
    const router = useRouter()
    const supabase = createClient()

    // Data State
    const [ausentismos, setAusentismos] = useState<Ausentismo[]>([])
    const [filteredAusentismos, setFilteredAusentismos] = useState<Ausentismo[]>([])
    const [loading, setLoading] = useState(true)

    // UI State
    const [busqueda, setBusqueda] = useState('')
    const [filtroReciente, setFiltroReciente] = useState(false)

    // 1. Fetch Ausentismos
    useEffect(() => {
        const fetchAusentismos = async () => {
            setLoading(true)
            try {
                // Ensure user is authenticated first
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    console.log('No user session found, skipping fetch')
                    return
                }

                // Table name with spaces as hinted by Flutter code
                // Trying 'ausentismos' first as it was successful in probe
                const { data, error } = await supabase
                    .from('ausentismos' as any)
                    .select('*')
                    .order('Creado', { ascending: false })

                if (error) {
                    // Try without ordering if 'Creado' doesn't exist either
                    const { data: dataNoOrder, error: errorNoOrder } = await supabase
                        .from('ausentismos' as any)
                        .select('*')

                    if (errorNoOrder) {
                        // Last resort: Try Title Case 'Ausentismos'
                        const { data: dataTitle, error: errorTitle } = await supabase
                            .from('Ausentismos' as any)
                            .select('*')

                        if (errorTitle) throw errorTitle
                        setAusentismos(dataTitle as any[])
                    } else {
                        setAusentismos(dataNoOrder as any[])
                    }
                } else {
                    setAusentismos(data as any[])
                }
            } catch (err: any) {
                console.error('Detailed fetch error:', {
                    message: err.message,
                    details: err.details,
                    hint: err.hint,
                    code: err.code,
                    full: err
                })
                // Only show toast if it's not a generic auth error
                if (err.message !== 'Unexpected token < in JSON at position 0') {
                    toast.error('No se pudieron cargar los ausentismos')
                }
            } finally {
                setLoading(false)
            }
        }
        fetchAusentismos()
    }, [supabase])

    // 2. Filter Logic
    useEffect(() => {
        let filtered = [...ausentismos]

        // FF-Ported Filter: Últimos 5 meses
        if (filtroReciente) {
            const haceCincoMeses = subMonths(new Date(), 5)
            filtered = filtered.filter(a => {
                const creadoVal = a['Creado' as keyof Ausentismo] || a['created_at' as keyof Ausentismo]
                if (!creadoVal) return false

                const creadoStr = String(creadoVal)
                let fecha: Date
                // Try parsing ISO first, then the specific FF format if needed
                fecha = new Date(creadoStr)
                if (!isValid(fecha)) {
                    // Fallback to FF format: 'M/d/yyyy h:mm a'
                    try {
                        fecha = parse(creadoStr, 'M/d/yyyy h:mm a', new Date())
                    } catch {
                        return false
                    }
                }

                return isAfter(fecha, haceCincoMeses)
            })
        }

        if (busqueda) {
            const b = busqueda.toLowerCase()
            filtered = filtered.filter(a =>
                (a['Nombre Completo' as keyof Ausentismo] || '').toString().toLowerCase().includes(b) ||
                (a['Motivo Ausentismo' as keyof Ausentismo] || '').toString().toLowerCase().includes(b)
            )
        }

        setFilteredAusentismos(filtered)
    }, [busqueda, ausentismos, filtroReciente])

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Header */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Ausentismos</h1>
                <div className="w-8" />
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Actions & Filters */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col gap-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                placeholder="Buscar por nombre o motivo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="pl-12 h-12 bg-gray-50/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-blue-100 transition-all font-medium"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={!filtroReciente ? 'default' : 'outline'}
                                onClick={() => setFiltroReciente(false)}
                                className="h-12 rounded-2xl px-6 font-bold text-xs tracking-widest uppercase transition-all"
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filtroReciente ? 'default' : 'outline'}
                                onClick={() => setFiltroReciente(true)}
                                className="h-12 rounded-2xl px-6 font-bold text-xs tracking-widest uppercase transition-all"
                            >
                                Últimos 5 Meses
                            </Button>
                        </div>
                    </div>
                </div>

                {/* List Header */}
                <div className="hidden md:flex px-4 py-2 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <div className="w-1/3 min-w-[200px]">Empleado / Cargo</div>
                    <div className="w-32">Motivo</div>
                    <div className="flex-1">Periodo</div>
                    <div className="shrink-0 w-32 text-right pr-6">Duración</div>
                </div>

                <div className="flex justify-end gap-3 mb-6">
                    <Link href="/ausentismos/registro-masivo">
                        <Button className="h-12 px-6 bg-white hover:bg-gray-50 text-blue-900 border-2 border-blue-900 font-bold rounded-2xl shadow-sm flex gap-2">
                            <FileUp className="h-5 w-5" />
                            <span className="hidden sm:inline">Registro Masivo</span>
                        </Button>
                    </Link>
                    <Button
                        onClick={() => router.push('/ausentismos/nuevo')}
                        className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg flex gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Crear Ausentismo</span>
                    </Button>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <p className="text-gray-500 font-medium animate-pulse">Cargando registros...</p>
                    </div>
                ) : filteredAusentismos.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {filteredAusentismos.map((a, index) => (
                            <AusentismoRow key={`${a.id}-${index}`} ausentismo={a} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-dashed border-gray-200">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UserX className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron registros</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            No hay ausentismos que coincidan con tu búsqueda o aún no se han registrado datos.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}
