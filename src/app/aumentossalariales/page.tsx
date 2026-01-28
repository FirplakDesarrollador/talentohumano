'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
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
    ArrowBigUpDash
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AumentosSalarialesPage() {
    const [cedula, setCedula] = useState('')
    const [empleado, setEmpleado] = useState<any>(null)
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
            const { data: usersData } = await supabase
                .from('usuarios')
                .select('*')
                .in('rol', ['jefe', 'director', 'coordinador', 'gerente'])
                .order('nombre')

            if (usersData) setApprovers(usersData)

            // Fetch current app user
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('correo', user.email!)
                    .single()

                if (profile) setCurrentUser(profile)
            }
        }
        fetchContext()
    }, [supabase])

    const fetchHistory = useCallback(async (empleadoId: number) => {
        setHistoryLoading(true)
        try {
            const { data, error } = await (supabase
                .from('aumentos_salariales') as any)
                .select(`
                    *,
                    solicitante_info:usuarios!aumentos_salariales_solicitante_fkey(nombre),
                    aprobador_info:usuarios!aumentos_salariales_aprobador_fkey(nombre)
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
        if (!cedula) return

        setLoading(true)
        setEmpleado(null)
        setError(null)
        setSuccess(null)

        try {
            const { data, error } = await (supabase
                .from('empleados') as any)
                .select('*')
                .eq('id', parseInt(cedula))
                .single()

            if (error) throw new Error('Empleado no encontrado')
            setEmpleado(data)

            // Check for pending requests
            const { data: pending } = await (supabase
                .from('aumentos_salariales') as any)
                .select('id')
                .eq('empleado_id', (data as any).id)
                .eq('estado', 'Pendiente')
                .limit(1)

            if (pending && pending.length > 0) {
                setError('¡El empleado ya tiene una solicitud pendiente, se debe completar para poder crear otra!')
            }

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetSearch = () => {
        setCedula('')
        setEmpleado(null)
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
            const { error: insertError } = await (supabase
                .from('aumentos_salariales') as any)
                .insert([{
                    empleado_id: empleado.id,
                    cargoAnterior: empleado.cargo,
                    cargoPropuesto: formData.cargoPropuesto,
                    solicitante: currentUser.id,
                    aprobador: parseInt(formData.aprobador),
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                                <label className="text-sm font-semibold text-[#716E6A]">Cédula del Empleado</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="Ingrese cédula..."
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
                                    className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'create'
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
                                    className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history'
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
                                                                <p className="text-sm font-bold text-[#45433F]">{item.aprobador_info?.nombre || 'N/A'}</p>
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
