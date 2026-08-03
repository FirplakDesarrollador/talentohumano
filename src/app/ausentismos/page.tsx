'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_LEVELS, ADMIN_EMAILS, APPROVER_LEVELS, AUSENTISMOS_LEVELS, ANALISTAS_CON_ACCESO, JEFES_MOLDES, AUSENTISMOS_SIN_DETALLE, getPlantasPermitidas } from '@/lib/constants/roles'
import { resolveUserProfile } from '@/lib/auth/resolveUserProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Plus,
    ArrowLeft,
    UserX,
    Loader2,
    Search,
    Eraser,
    FileUp,
    ShieldAlert,
    Calendar,
    Download
} from 'lucide-react'
import { AusentismoCard, type Ausentismo } from '@/components/Ausentismos/AusentismoCard'
import { AusentismoRow } from '@/components/Ausentismos/AusentismoRow'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
    const [currentUser, setCurrentUser] = useState<{ correo?: string } | null>(null)
    const [userLevel, setUserLevel] = useState<string>('')
    const [tienePersonalACargo, setTienePersonalACargo] = useState(false)

    // UI State
    const [busqueda, setBusqueda] = useState('')
    const [filtroReciente, setFiltroReciente] = useState(false)
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [pendingEdit, setPendingEdit] = useState<Ausentismo | null>(null)

    // 1. Fetch Ausentismos
    useEffect(() => {
        const fetchAusentismos = async () => {
            setLoading(true)
            try {
                // Ensure user is authenticated first
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                setCurrentUser({ correo: user.email })

                // Fetch cargo level (prioriza empleado activo y sigue el vinculo
                // usuarios.empleado_id para correos genericos/compartidos)
                const profile = await resolveUserProfile(supabase, user.email!)
                const currentLevel = profile.nivelCargo
                const currentName = profile.nombreCompleto
                setUserLevel(currentLevel)
                setTienePersonalACargo(profile.tienePersonalACargo)

                // Restrict scope: supervisors/coordinadores/jefes (and anyone without special
                // plant-wide access) only see ausentismos of their direct reports or themselves.
                const isAdminUser = ADMIN_EMAILS.includes(user.email || '') || ADMIN_LEVELS.includes(currentLevel as any)
                const isAnalystUser = ANALISTAS_CON_ACCESO.includes(user.email || '')
                const fullAccessEmails = ['hector.chinchilla@firplak.com', 'estiven.londono@firplak.com']

                const applyScope = (q: any) => {
                    if (isAdminUser || isAnalystUser || fullAccessEmails.includes(user.email || '')) {
                        return q
                    }
                    const plantas = getPlantasPermitidas(user.email || '')
                    if (plantas && plantas.length > 0) {
                        const plantasFilter = plantas.map(p => `"${p}"`).join(',')
                        return q.or(`Planta.in.(${plantasFilter}),Jefe.eq."${currentName}","Nombre Completo".eq."${currentName}"`)
                    }
                    if (currentName) {
                        return q.or(`Jefe.eq."${currentName}","Nombre Completo".eq."${currentName}"`)
                    }
                    // No name resolved yet: show nothing rather than leaking all records.
                    return q.eq('Id', -1)
                }

                // Table name with spaces as hinted by Flutter code
                // Trying 'ausentismos' first as it was successful in probe
                // Order by FechaInicio (a real date column) rather than "Creado" (stored as
                // free-form text in inconsistent formats, so it doesn't sort chronologically).
                const { data, error } = await applyScope(
                    supabase.from('ausentismos' as any).select('*').order('FechaInicio', { ascending: false })
                )

                if (error) {
                    // Try without ordering if 'FechaInicio' doesn't exist either
                    const { data: dataNoOrder, error: errorNoOrder } = await applyScope(
                        supabase.from('ausentismos' as any).select('*')
                    )

                    if (errorNoOrder) {
                        // Last resort: Try Title Case 'Ausentismos'
                        const { data: dataTitle, error: errorTitle } = await applyScope(
                            supabase.from('Ausentismos' as any).select('*')
                        )

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

        // Date range filter: keep records whose absence period overlaps the selected range
        if (fechaDesde) {
            filtered = filtered.filter(a => {
                const fin = a['FechaFinal' as keyof Ausentismo] as unknown as string | null
                return !!fin && fin >= fechaDesde
            })
        }
        if (fechaHasta) {
            filtered = filtered.filter(a => {
                const inicio = a['FechaInicio' as keyof Ausentismo] as unknown as string | null
                return !!inicio && inicio <= fechaHasta
            })
        }

        // Most recent absence first
        filtered.sort((a, b) => {
            const fa = (a['FechaInicio' as keyof Ausentismo] as unknown as string) || ''
            const fb = (b['FechaInicio' as keyof Ausentismo] as unknown as string) || ''
            return fb.localeCompare(fa)
        })

        setFilteredAusentismos(filtered)
    }, [busqueda, ausentismos, filtroReciente, fechaDesde, fechaHasta])

    const isSystemAdmin = (currentUser?.correo && ADMIN_EMAILS.includes(currentUser.correo)) || ADMIN_LEVELS.includes(userLevel as any)
    const hasAccess = isSystemAdmin || AUSENTISMOS_LEVELS.includes(userLevel as any) || (currentUser?.correo && JEFES_MOLDES.includes(currentUser.correo)) || tienePersonalACargo
    const canViewDetalle = !(currentUser?.correo && AUSENTISMOS_SIN_DETALLE.includes(currentUser.correo))

    const handleDownloadExcel = async () => {
        const toastId = toast.loading('Generando archivo Excel...')
        try {
            const { data, error } = await supabase
                .from('ausentismos' as any)
                .select('*')
                .order('FechaInicio', { ascending: false })

            if (error) throw error

            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar', { id: toastId })
                return
            }

            const XLSX = await import('xlsx')
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Ausentismos')

            const date = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
            XLSX.writeFile(workbook, `Base_Datos_Ausentismos_${date}.xlsx`)

            toast.success('Archivo Excel descargado correctamente', { id: toastId })
        } catch (error: any) {
            console.error('Error downloading excel:', error)
            toast.error('Error al descargar Excel: ' + error.message, { id: toastId })
        }
    }

    if (!loading && !hasAccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                    No tienes permisos para acceder al módulo de Ausentismos. Contacta al administrador si crees que esto es un error.
                </p>
                <Button onClick={() => router.push('/menu')}>Volver al menú</Button>
            </div>
        )
    }

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
                            {isSystemAdmin && (
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadExcel}
                                    title="Descargar toda la base de datos de ausentismos en Excel"
                                    className="h-12 rounded-2xl px-6 font-bold text-xs tracking-widest uppercase transition-all border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 flex gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Descargar Excel</span>
                                </Button>
                            )}
                            <Button
                                variant={filtroReciente ? 'default' : 'outline'}
                                onClick={() => setFiltroReciente(true)}
                                className="h-12 rounded-2xl px-6 font-bold text-xs tracking-widest uppercase transition-all"
                            >
                                Últimos 5 Meses
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Desde</span>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    className="pl-11 h-11 bg-gray-50/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-blue-100 transition-all font-medium w-full sm:w-48"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Hasta</span>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    className="pl-11 h-11 bg-gray-50/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-blue-100 transition-all font-medium w-full sm:w-48"
                                />
                            </div>
                        </div>
                        {(fechaDesde || fechaHasta) && (
                            <Button
                                variant="outline"
                                onClick={() => { setFechaDesde(''); setFechaHasta('') }}
                                className="h-11 rounded-2xl px-4 font-bold text-xs tracking-widest uppercase text-gray-500 flex items-center gap-2"
                            >
                                <Eraser className="h-4 w-4" />
                                Limpiar Fechas
                            </Button>
                        )}
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
                            <AusentismoRow
                                key={`${a.Id}-${index}`}
                                ausentismo={a}
                                onClick={() => {
                                    if (!canViewDetalle) return
                                    setPendingEdit(a)
                                }}
                            />
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

            <ConfirmDialog
                isOpen={!!pendingEdit}
                variant="info"
                title="¿Deseas editar el ausentismo?"
                description={`Se abrirá el formulario de edición para ${pendingEdit?.['Nombre Completo'] || 'este colaborador'}.`}
                confirmLabel="Editar"
                cancelLabel="Cancelar"
                onConfirm={() => {
                    if (pendingEdit) router.push(`/ausentismos/nuevo?edit=${pendingEdit.Id}`)
                    setPendingEdit(null)
                }}
                onCancel={() => setPendingEdit(null)}
            />
        </div>
    )
}
