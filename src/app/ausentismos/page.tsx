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
            <header className="bg-[#1D3557] text-white px-8 py-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/menu')}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <UserX className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight uppercase">Gestión de Ausentismos</h1>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Panel administrativo</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Actions & Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="flex-1 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                placeholder="Buscar por nombre o motivo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="pl-12 h-14 bg-white border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 text-base"
                            />
                            {busqueda && (
                                <button
                                    onClick={() => setBusqueda('')}
                                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                                >
                                    <Eraser className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* FF-Ported Toggle */}
                        <div className="flex items-center gap-3 bg-white px-6 rounded-2xl border border-gray-100 shadow-sm h-14">
                            <Switch
                                id="recent-filter"
                                checked={filtroReciente}
                                onCheckedChange={setFiltroReciente}
                                className="data-[state=checked]:bg-blue-600"
                            />
                            <Label htmlFor="recent-filter" className="text-sm font-bold text-gray-600 cursor-pointer whitespace-nowrap">
                                Últimos 5 meses
                            </Label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/ausentismos/registro-masivo">
                            <Button className="h-14 px-6 bg-white hover:bg-gray-50 text-blue-900 border-2 border-blue-900 font-bold rounded-2xl shadow-sm flex gap-2">
                                <FileUp className="h-5 w-5" />
                                <span className="hidden sm:inline">Registro Masivo</span>
                            </Button>
                        </Link>
                        <Button
                            onClick={() => router.push('/ausentismos/nuevo')}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg flex gap-2 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Crear Ausentismo</span>
                        </Button>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <p className="text-gray-500 font-medium animate-pulse">Cargando registros...</p>
                    </div>
                ) : filteredAusentismos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAusentismos.map((a) => (
                            <AusentismoCard key={a.id} ausentismo={a} />
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
