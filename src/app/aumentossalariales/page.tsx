'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NIVELES_CARGO, APPROVER_LEVELS, ADMIN_LEVELS, ADMIN_EMAILS, AUMENTOS_SALARIALES_LEVELS } from '@/lib/constants/roles'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Search,
    Eraser,
    TrendingUp,
    History,
    Calendar,
    UserCheck,
    Briefcase,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowBigUpDash,
    ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AumentosSalarialesPage() {
    const [cedula, setCedula] = useState('')
    const [empleado, setEmpleado] = useState<any>(null)
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
    const [approvers, setApprovers] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Form state
    const [formData, setFormData] = useState({
        salarioActual: '',
        salarioPropuesto: '',
        fechaAplicacion: '',
        aprobador: '',
        requiereAscenso: 'NO',
        cargoPropuesto: 'No aplica',
        comentarios: ''
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchContext = async () => {
            // Fetch users with roles for approver dropdown
            // We'll search in employees table first if possible, but the 'usuarios' table contains the app users
            // For now, we continue using 'usuarios' table for the list of approvers but mapping levels
            const { data: usersData } = await supabase
                .from('usuarios')
                .select('id, nombre, rol, empleado_id')
                .order('nombre')

            // Filter users that have an approver level
            const approverList = (usersData as any[])?.filter((u: any) => {
                const roleMap: Record<string, string> = {
                    'admin': 'Jefe',
                    'jefe': 'Jefe',
                    'gerente': 'Gerente',
                    'director': 'Director',
                    'coordinador': 'Coordinador'
                }
                const level = roleMap[u.rol?.toLowerCase()] || u.rol
                return (APPROVER_LEVELS as any).includes(level)
            })

            if (approverList) setApprovers(approverList)

            // Fetch current app user
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('correo', user.email!)
                    .single()

                if (profile) {
                    const roleMap: Record<string, string> = {
                        'admin': 'Jefe',
                        'desarrollador': 'Jefe',
                        'jefe': 'Jefe',
                        'gerente': 'Gerente',
                        'director': 'Director',
                        'coordinador': 'Coordinador',
                        'analista': 'Analista'
                    }
                    const mappedLevel = roleMap[(profile as any).rol?.toLowerCase()] || (profile as any).rol
                    setCurrentUser({ ...(profile as any), correo: user.email, nivelCargo: mappedLevel })

                    // Check for access permission
                    const isSystemAdmin = (user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(mappedLevel as any)
                    const hasAccess = isSystemAdmin || AUMENTOS_SALARIALES_LEVELS.includes(mappedLevel as any)
                    
                    if (!hasAccess) {
                        toast.error('No tienes permisos para acceder a este módulo')
                        router.push('/menu')
                    }
                }
            }
        }
        fetchContext()
    }, [supabase, router])

    const fetchHistory = useCallback(async (empleadoId: number) => {
        setHistoryLoading(true)
        try {
            const { data, error } = await (supabase
                .from('aumentosSalariales') as any)
                .select(`
                    *,
                    solicitante_info:usuarios!aumentosSalariales_solicitante_fkey(nombre),
                    aprobador_info:empleados!aumentosSalariales_aprobador_fkey(nombreCompleto)
                `)
                .eq('empleado_id', empleadoId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setHistory(data || [])
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setHistoryLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        if (empleado && activeTab === 'history') {
            fetchHistory(empleado.id)
        }
    }, [activeTab, empleado, fetchHistory])

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const cleanQuery = cedula.trim()
        if (!cleanQuery) return

        setLoading(true)
        setEmpleado(null)
        setSearchResults([])
        setError(null)
        setSuccess(null)

        try {
            let combinedData: any[] = []
            
            // 1. Siempre buscamos por nombre (ilike)
            try {
                const { data: nameData, error: nameError } = await (supabase.from('empleados') as any)
                    .select('*')
                    .ilike('nombreCompleto', `%${cleanQuery}%`)
                
                if (nameError) console.warn('Name search error:', nameError)
                if (nameData) combinedData = [...nameData]
            } catch (e) {
                console.warn('Name search exception:', e)
            }

            // 2. Si es numérico, también buscamos por ID o Cédula
            if (/^\d+$/.test(cleanQuery)) {
                try {
                    const searchNum = parseInt(cleanQuery)
                    
                    // Buscamos por ID
                    const { data: idData } = await (supabase.from('empleados') as any)
                        .select('*')
                        .eq('id', searchNum)
                    
                    if (idData && idData.length > 0) {
                        idData.forEach((item: any) => {
                            if (item && item.id && !combinedData.some(ex => ex.id === item.id)) {
                                combinedData.push(item)
                            }
                        })
                    }

                    // Buscamos por Cédula
                    const { data: cedData } = await (supabase.from('empleados') as any)
                        .select('*')
                        .eq('cedula', searchNum)
                    
                    if (cedData && cedData.length > 0) {
                        cedData.forEach((item: any) => {
                            if (item && item.id && !combinedData.some(ex => ex.id === item.id)) {
                                combinedData.push(item)
                            }
                        })
                    }

                    // Por si acaso la cédula está guardada como texto
                    const { data: cedTextData } = await (supabase.from('empleados') as any)
                        .select('*')
                        .eq('cedula', cleanQuery)

                    if (cedTextData && cedTextData.length > 0) {
                        cedTextData.forEach((item: any) => {
                            if (item && item.id && !combinedData.some(ex => ex.id === item.id)) {
                                combinedData.push(item)
                            }
                        })
                    }
                } catch (e) {
                    console.warn('Numeric search exception:', e)
                }
            }

            if (combinedData.length > 0) {
                if (combinedData.length === 1) {
                    await selectEmpleado(combinedData[0])
                } else {
                    setSearchResults(combinedData)
                }
            } else {
                throw new Error('No se encontró ningún empleado con ese nombre o cédula')
            }
        } catch (err: any) {
            console.error('Search full error:', err)
            const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
            setError(`Error: ${msg !== '{}' ? msg : 'Error inesperado en la base de datos'}`)
        } finally {
            setLoading(false)
        }
    }

    const selectEmpleado = async (emp: any) => {
        if (!emp) return
        setEmpleado(emp)
        setSearchResults([])
        
        // Actualizar el campo de búsqueda con la cédula del seleccionado
        const idDisplay = emp.cedula?.toString() || emp.id?.toString() || ''
        setCedula(idDisplay)
        
        setLoading(true)
        setError(null)

        try {
            // Check for pending requests
            const { data: pending } = await (supabase
                .from('aumentosSalariales') as any)
                .select('id')
                .eq('empleado_id', emp.id)
                .eq('estado', 'Pendiente')
                .limit(1)

            if (pending && pending.length > 0) {
                setError('¡El empleado ya tiene una solicitud pendiente, se debe completar para poder crear otra!')
            }
        } catch (err: any) {
            console.error('Error checking pending:', err)
        } finally {
            setLoading(false)
        }
    }

    const resetSearch = () => {
        setCedula('')
        setEmpleado(null)
        setSearchResults([])
        setError(null)
        setSuccess(null)
        setHistory([])
        setActiveTab('create')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!empleado) return
        if (!currentUser) {
            setError('No se pudo identificar al usuario actual')
            return
        }

        if (!formData.salarioActual || !formData.salarioPropuesto || !formData.fechaAplicacion || !formData.aprobador) {
            setError('Por favor completa todos los campos obligatorios')
            return
        }

        setLoading(true)
        try {
            // Find the approver's employee_id
            const selectedApprover = approvers.find(a => a.id === parseInt(formData.aprobador));
            if (!selectedApprover || !selectedApprover.empleado_id) {
                setError('El aprobador seleccionado no tiene un registro de empleado válido.');
                setLoading(false);
                return;
            }

            const { error: insertError } = await (supabase
                .from('aumentosSalariales') as any)
                .insert([{
                    empleado_id: empleado.id,
                    cargoAnterior: empleado.cargo,
                    cargoPropuesto: formData.cargoPropuesto,
                    solicitante: currentUser.id,
                    aprobador: selectedApprover.empleado_id,
                    comentariosSolicitante: formData.comentarios,
                    fechaAplicacion: formData.fechaAplicacion,
                    salarioActual: parseFloat(formData.salarioActual),
                    salarioPropuesto: parseFloat(formData.salarioPropuesto),
                    planta: empleado.planta,
                    jefe: empleado.jefe,
                    requiereAscenso: formData.requiereAscenso === 'SI',
                    estado: 'Pendiente',
                }] as any)

            if (insertError) throw insertError

            setSuccess('Su solicitud fue enviada correctamente!')
            // Reset form
            setFormData({
                salarioActual: '',
                salarioPropuesto: '',
                fechaAplicacion: '',
                aprobador: '',
                requiereAscenso: 'NO',
                cargoPropuesto: 'No aplica',
                comentarios: ''
            })
            // Switch to history to see the new request
            setTimeout(() => {
                setActiveTab('history')
                fetchHistory(empleado.id)
            }, 1500)

        } catch (err: any) {
            console.error('Error creating request:', err)
            setError(err.message || 'No se pudo crear la solicitud')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: string | number) => {
        if (!amount) return '$0'
        const val = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(val)) return '$0'
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header / AppBar style */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Aumentos Salariales</h1>
                <div className="w-8" /> {/* Spacer to center title */}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#45433F] mb-2 flex items-center gap-3">
                        <TrendingUp className="text-blue-600" />
                        Aumentos Salariales
                    </h1>
                    <p className="text-gray-600">Gestiona las solicitudes de aumento y ascenso para los empleados</p>
                </div>

                {/* Search Sidebar/Top Section */}
                <Card className="mb-8 border-none shadow-md overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-semibold text-[#716E6A]">Búsqueda de Empleado</label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Cédula o nombre..."
                                        className="pl-10 h-12"
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                </div>
                            </div>
                            <div className="flex bg-[#716E6A]/10 p-1 rounded-lg h-12">
                                <Button
                                    type="submit"
                                    className="bg-[#2a7b37] hover:bg-[#1e5c29] h-full px-6"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Buscar'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetSearch}
                                    className="h-full px-4 text-[#716E6A] hover:bg-white/50"
                                >
                                    <Eraser className="h-5 w-5" />
                                </Button>
                            </div>
                        </form>

                        {/* Search Results List */}
                        {searchResults.length > 0 && !empleado && (
                            <div className="mt-4 border rounded-lg divide-y bg-gray-50 max-h-60 overflow-y-auto shadow-inner">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => selectEmpleado(result)}
                                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800">{result.nombreCompleto}</p>
                                            <p className="text-xs text-gray-500">
                                                ID: {result.cedula || result.id} • {result.cargo || 'Sin cargo'}
                                            </p>
                                        </div>
                                        <UserCheck className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {empleado && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <EmpleadoCard empleado={empleado} />

                        {/* Tabs Container */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="flex border-b border-gray-100">
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`relative flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'create'
                                        ? 'text-blue-600 bg-blue-50/30'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <TrendingUp size={18} />
                                    CREAR SOLICITUD
                                    {activeTab === 'create' && <div className="absolute bottom-0 w-32 h-1 bg-blue-600 rounded-t-full" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`relative flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history'
                                        ? 'text-blue-600 bg-blue-50/30'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <History size={18} />
                                    HISTORIAL SOLICITUDES
                                    {activeTab === 'history' && <div className="absolute bottom-0 w-32 h-1 bg-blue-600 rounded-t-full" />}
                                </button>
                            </div>

                            <div className="p-8">
                                {activeTab === 'create' ? (
                                    error && error.includes('pendiente') ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <AlertCircle size={48} className="text-red-500 mb-4" />
                                            <h3 className="text-xl font-bold text-red-600 max-w-md">
                                                {error}
                                            </h3>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Salarios Section */}
                                                <div className="space-y-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                                    <h3 className="font-bold flex items-center gap-2 text-[#45433F]">
                                                        <TrendingUp size={18} className="text-green-600" />
                                                        Información Salarial
                                                    </h3>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Salario Actual</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="text"
                                                                placeholder="Ingrese salario actual..."
                                                                className="h-12 text-lg font-medium"
                                                                value={formData.salarioActual}
                                                                onChange={(e) => setFormData({ ...formData, salarioActual: e.target.value })}
                                                                required
                                                            />
                                                            <div className="mt-1 text-sm font-bold text-[#2a7b37]">
                                                                {formatCurrency(formData.salarioActual)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Salario Propuesto</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="text"
                                                                placeholder="Ingrese salario propuesto..."
                                                                className="h-12 text-lg font-medium"
                                                                value={formData.salarioPropuesto}
                                                                onChange={(e) => setFormData({ ...formData, salarioPropuesto: e.target.value })}
                                                                required
                                                            />
                                                            <div className="mt-1 text-sm font-bold text-[#2a7b37]">
                                                                {formatCurrency(formData.salarioPropuesto)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dates and Approver Section */}
                                                <div className="space-y-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                                    <h3 className="font-bold flex items-center gap-2 text-[#45433F]">
                                                        <Calendar size={18} className="text-blue-600" />
                                                        Detalles de Aplicación
                                                    </h3>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Fecha de Aplicación</label>
                                                        <Input
                                                            type="date"
                                                            className="h-12"
                                                            value={formData.fechaAplicacion}
                                                            onChange={(e) => setFormData({ ...formData, fechaAplicacion: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Aprobador</label>
                                                        <select
                                                            className="w-full h-12 rounded-md border border-input bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 appearance-none"
                                                            value={formData.aprobador}
                                                            onChange={(e) => setFormData({ ...formData, aprobador: e.target.value })}
                                                            required
                                                        >
                                                            <option value="">Seleccione aprobador...</option>
                                                            {approvers.map(a => (
                                                                <option key={a.id} value={a.id}>{a.nombre} - {a.rol}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Promotion Section */}
                                                <div className="md:col-span-2 space-y-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div className="flex items-center gap-4">
                                                            <ArrowBigUpDash size={24} className="text-orange-500" />
                                                            <div>
                                                                <h3 className="font-bold text-[#45433F]">¿Solicitar un ascenso?</h3>
                                                                <p className="text-xs text-gray-500">Marque SI si el aumento incluye un cambio de cargo</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, requiereAscenso: 'NO', cargoPropuesto: 'No aplica' })}
                                                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${formData.requiereAscenso === 'NO' ? 'bg-[#716E6A] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                                            >
                                                                NO
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, requiereAscenso: 'SI', cargoPropuesto: '' })}
                                                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${formData.requiereAscenso === 'SI' ? 'bg-[#2a7b37] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                                            >
                                                                SI
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {formData.requiereAscenso === 'SI' && (
                                                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                            <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Cargo Propuesto</label>
                                                            <Input
                                                                placeholder="Ingrese el cargo propuesto..."
                                                                className="h-12"
                                                                value={formData.cargoPropuesto}
                                                                onChange={(e) => setFormData({ ...formData, cargoPropuesto: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Comments Section */}
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-xs font-bold text-[#716E6A] uppercase tracking-wider">Comentarios / Justificación</label>
                                                    <textarea
                                                        className="w-full min-h-[120px] rounded-md border border-input bg-gray-50/30 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 transition-all"
                                                        placeholder="Justifique por qué el empleado debe recibir este aumento y/o ascenso..."
                                                        value={formData.comentarios}
                                                        onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {error && !error.includes('pendiente') && (
                                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                                    {error}
                                                </div>
                                            )}

                                            {success && (
                                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                                    {success}
                                                </div>
                                            )}

                                            <Button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full h-14 text-lg font-bold bg-[#716E6A] hover:bg-[#45433F] text-white shadow-lg transition-all transform hover:scale-[1.01]"
                                            >
                                                {loading ? (
                                                    <Loader2 className="animate-spin h-6 w-6 mr-2" />
                                                ) : 'SOLICITAR AUMENTO'}
                                            </Button>
                                        </form>
                                    )
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-[#45433F]">Historial de Solicitudes</h3>
                                            <div className="text-xs font-bold text-gray-400 uppercase">
                                                ID Empleado: {empleado.id}
                                            </div>
                                        </div>

                                        {historyLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                                                <p className="text-gray-500 font-medium">Obteniendo historial...</p>
                                            </div>
                                        ) : history.length === 0 ? (
                                            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-600 font-bold text-lg">Sin solicitudes anteriores</p>
                                                <p className="text-sm text-gray-400">Este empleado no tiene registros de aumentos salariales.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-6">
                                                {history.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                                                    >
                                                        <div className="flex items-center justify-between p-4 bg-gray-50/80 border-b border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 rounded-full ${item.estado === 'Pendiente' ? 'bg-yellow-500 animate-pulse' :
                                                                    item.estado === 'Aprobado' ? 'bg-green-500' : 'bg-red-500'
                                                                    }`} />
                                                                <span className="font-bold text-sm text-[#45433F]">{item.estado.toUpperCase()}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                {new Date(item.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Salario Propuesto</p>
                                                                <p className="text-lg font-bold text-[#2a7b37]">{formatCurrency(item.salarioPropuesto)}</p>
                                                                <p className="text-xs text-gray-500 line-through">{formatCurrency(item.salarioActual)}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Cargo</p>
                                                                <p className="text-sm font-bold text-[#45433F]">{item.cargoPropuesto || item.cargoAnterior}</p>
                                                                <p className="text-xs text-gray-500">Ant: {item.cargoAnterior}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Aprobador</p>
                                                                <p className="text-sm font-bold text-[#45433F]">{item.aprobador_info?.nombreCompleto || 'N/A'}</p>
                                                                <p className="text-[10px] text-gray-400 uppercase mt-2">Solicitante</p>
                                                                <p className="text-xs text-gray-600">{item.solicitante_info?.nombre || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        {item.comentariosSolicitante && (
                                                            <div className="px-6 py-3 bg-blue-50/20 border-t border-gray-50">
                                                                <p className="text-xs text-gray-600 italic">&quot;{item.comentariosSolicitante}&quot;</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!empleado && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <UserCheck size={80} className="text-[#716E6A] mb-4" />
                        <h2 className="text-2xl font-bold text-[#45433F]">Busque un empleado para comenzar</h2>
                        <p className="text-gray-500 max-w-sm">Ingrese el número de cédula en el buscador superior para gestionar sus aumentos.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
