'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLES, ADMIN_ROLES } from '@/lib/constants/roles'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Umbrella,
    ArrowLeft,
    Search,
    Eraser,
    Loader2,
    Info,
    PlusCircle,
    History,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ChevronRight,
    ArrowRight,
    X,
    UserCircle,
    ClipboardList,
    Wallet,
    Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cargarEmpleadoPorCedula, vacacionesValidarCalcular, descargarQueryVacaciones } from '@/lib/vacation-utils'

export default function VacacionesPage() {
    const [view, setView] = useState<'welcome' | 'process' | 'history'>('welcome')
    const [cedula, setCedula] = useState('')
    const [empleado, setEmpleado] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [showInstructions, setShowInstructions] = useState(false)

    // Form state for new request
    const [formData, setFormData] = useState({
        diasTiempo: '',
        diasDinero: '',
        fechaInicio: '',
        fechaFin: '',
        fechaRegreso: '',
        personaEncargada: ''
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [validationMsg, setValidationMsg] = useState<string | null>(null)

    // Admin filtering
    const [filterCedula, setFilterCedula] = useState('')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('correo', user.email!)
                    .single()
                console.log('User Profile Loaded:', profile);
                setCurrentUser(profile || { correo: user.email })
            }
        }
        fetchUser()
    }, [supabase])

    const isAdmin = currentUser?.rol && ADMIN_ROLES.includes(currentUser.rol.toLowerCase() as any)

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true)
        try {
            // Updated to match the actual table columns
            let query = (supabase as any).from('Vacaciones').select('*').order('id', { ascending: false })

            if (filterCedula) {
                if (/^\d+$/.test(filterCedula)) {
                    query = query.eq('Cedula', parseInt(filterCedula))
                } else {
                    query = query.ilike('Empleado_Que_Disfruta', `%${filterCedula}%`)
                }
            }

            const { data, error } = await query
            if (error) throw error
            setHistory(data || [])
        } catch (err: any) {
            console.error('Error fetching history:', err)
            // Error handling - gracefully handle missing table during initial setup
            if (err.message?.includes('does not exist')) {
                setHistory([])
            } else {
                setError(err.message || 'Error al cargar el historial')
            }
        } finally {
            setHistoryLoading(false)
        }
    }, [supabase, filterCedula])

    const handleDownloadReport = () => {
        if (history.length === 0) return;
        descargarQueryVacaciones(history);
    }

    useEffect(() => {
        if (view === 'history') {
            fetchHistory()
        }
    }, [view, fetchHistory])

    // Logic from Flutter Prototype: vacacionesValidarCalcular
    useEffect(() => {
        const runValidation = async () => {
            if (!empleado) return;

            const disponibles = empleado.dias_pendientes || 0;
            const res = await vacacionesValidarCalcular(
                disponibles,
                formData.diasTiempo,
                formData.diasDinero,
                true // showMessages
            );

            if (res.ajustado) {
                setFormData(prev => ({
                    ...prev,
                    diasTiempo: res.diasTiempo.toString(),
                    diasDinero: res.diasDinero.toString()
                }));
                if (res.mensaje) {
                    setValidationMsg(res.mensaje);
                }
            } else {
                setValidationMsg(null);
            }
        };

        runValidation();
    }, [formData.diasTiempo, formData.diasDinero, empleado]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!cedula) return

        setLoading(true)
        setEmpleado(null)
        setError(null)
        setSuccess(null)

        try {
            console.log('Searching for cedula using FF-Ported logic:', cedula);

            const rawData = await cargarEmpleadoPorCedula(cedula);

            if (!rawData || Object.keys(rawData).length === 0) {
                throw new Error('Empleado no encontrado. Verifica la cédula.')
            }

            // Normalize
            const normalizedEmpleado = {
                id: rawData.id,
                cedula: rawData.id,
                nombreCompleto: rawData.nombrecompleto,
                nombre_completo: rawData.nombrecompleto, // Aliasing for compatibility
                planta: rawData.area, // Mapping area to planta concept
                area: rawData.area,
                jefe: rawData.jefe,
                dias_pendientes: rawData.Dias_Pendientes || 0,
                correo_jefe: rawData.CorreoJefe
            }

            setEmpleado(normalizedEmpleado)
            console.log('Combined Unified Empleado:', normalizedEmpleado);
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!empleado) {
            setError('Debe buscar un empleado primero')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            const { error: insertError } = await (supabase as any)
                .from('Vacaciones')
                .insert({
                    Cedula: empleado.cedula,
                    Empleado_Que_Disfruta: empleado.nombre_completo,
                    "Creado por": currentUser?.nombre || currentUser?.correo || 'Sistema',
                    "Fecha Solicitud": new Date().toLocaleDateString('es-CO'),
                    FechaInicial: formData.fechaInicio,
                    FechaFinal: formData.fechaFin,
                    FechaIngreso: formData.fechaRegreso,
                    Departamento: empleado.planta || '',
                    "Nombre del Jefe": empleado.jefe || '',
                    Aprobacion_Jefe: 'Pendiente',
                    DiasEnTiempo: formData.diasTiempo.toString(),
                    DiasEnDinero: formData.diasDinero.toString(),
                    PersonaEncargada: formData.personaEncargada,
                    correo: currentUser?.correo || '',
                })

            if (insertError) throw insertError

            setSuccess('Tu solicitud de vacaciones ha sido enviada con éxito.')
            setTimeout(() => {
                setView('welcome')
                setEmpleado(null)
                setCedula('')
                setFormData({
                    diasTiempo: '',
                    diasDinero: '',
                    fechaInicio: '',
                    fechaFin: '',
                    fechaRegreso: '',
                    personaEncargada: ''
                })
            }, 3000)
        } catch (err: any) {
            console.error('Error submitting request:', err)
            setError(err.message || 'Error al enviar la solicitud')
        } finally {
            setIsSubmitting(false)
        }
    }


    // Helper to calculate available days if the field exists
    const availableDays = empleado?.dias_pendientes || 0
    const newBalance = availableDays - (parseInt(formData.diasTiempo) || 0) - (parseInt(formData.diasDinero) || 0)

    return (
        <div className="min-h-screen bg-[#F1F4F8] pb-12">
            {/* Header */}
            <header className="bg-[#2d4356] text-white px-8 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => view === 'welcome' ? router.push('/menu') : setView('welcome')}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <Umbrella className="h-8 w-8 text-blue-300" />
                        <div>
                            <h1 className="text-xl font-black tracking-tight uppercase">Proceso Vacaciones</h1>
                            <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">Gestión de Solicitudes</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    {/* Branding removed as requested */}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-8">
                {view === 'welcome' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <Card className="border-none shadow-xl bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="bg-blue-100 p-6 rounded-3xl">
                                        <Umbrella className="h-20 w-20 text-blue-600" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-4xl font-black text-gray-800 mb-2">¡Tiempo de Descanso!</h2>
                                        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                                            Gestiona tus vacaciones de forma rápida y sencilla. Recuerda revisar la política de la empresa antes de solicitar.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                                onClick={() => setShowInstructions(!showInstructions)}
                                variant="outline"
                                className="h-32 flex flex-col gap-2 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-700"
                            >
                                <Info className="h-8 w-8 text-blue-600" />
                                <span className="font-bold text-lg uppercase tracking-tight">Instrucciones</span>
                            </Button>
                            <Button
                                onClick={() => setView('process')}
                                className="h-32 flex flex-col gap-2 bg-[#2d4356] hover:bg-[#1a2b38] transition-all"
                            >
                                <PlusCircle className="h-8 w-8 text-white" />
                                <span className="font-bold text-lg uppercase tracking-tight">Ingresar Solicitud</span>
                            </Button>
                            {isAdmin && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                                    <Button
                                        onClick={() => setView('history')}
                                        variant="secondary"
                                        className="h-32 flex flex-col gap-2 border-2 border-gray-200 hover:bg-gray-50 transition-all font-bold text-lg uppercase tracking-tight"
                                    >
                                        <History className="h-8 w-8 text-gray-700" />
                                        Visualizar Historial
                                    </Button>
                                    <Button
                                        onClick={handleDownloadReport}
                                        variant="outline"
                                        className="h-32 flex flex-col gap-2 border-2 border-blue-200 hover:bg-blue-50 transition-all font-bold text-lg uppercase tracking-tight text-blue-700"
                                    >
                                        <Download className="h-8 w-8" />
                                        Descargar Reporte
                                    </Button>
                                </div>
                            )}
                        </div>

                        {showInstructions && (
                            <Card className="border-blue-200 bg-blue-50 animate-in slide-in-from-top-4 overflow-hidden">
                                <CardHeader className="bg-blue-100/50 flex flex-row items-center justify-between border-b border-blue-200">
                                    <CardTitle className="text-blue-800 flex items-center gap-2 uppercase text-sm font-black">
                                        <Info className="h-5 w-5" />
                                        Guía de Solicitud de Vacaciones
                                    </CardTitle>
                                    <button onClick={() => setShowInstructions(false)} className="text-blue-500 hover:text-blue-700">
                                        <X className="h-5 w-5" />
                                    </button>
                                </CardHeader>
                                <CardContent className="pt-6 pb-8 space-y-4 text-sm text-blue-900 leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h4 className="font-black flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-600 rounded-full" />DÍAS DISPONIBLES</h4>
                                            <p>Puedes solicitar tanto días de descanso (Tiempo) como compensación económica (Dinero), siempre sujeto a aprobación.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-black flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-600 rounded-full" />FECHAS IMPORTANTES</h4>
                                            <p>Asegúrate de coordinar la <strong>Fecha Inicio</strong> y <strong>Fecha Fin</strong> con tu jefe directo antes de enviar el formulario.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 p-4 rounded-xl border border-blue-200 mt-4 italic font-medium">
                                        &quot;El descanso es parte fundamental de la productividad. ¡Planifica con tiempo!&quot;
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === 'process' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-[#2d4356]">
                                <UserCircle className="h-6 w-6 font-bold" />
                                <h3 className="text-lg font-black uppercase tracking-tight">Información Personal</h3>
                            </div>

                            <Card className="shadow-lg border-none">
                                <CardContent className="p-6">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Ingresa la cédula del empleado..."
                                                value={cedula}
                                                onChange={(e) => setCedula(e.target.value)}
                                                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all text-lg font-medium"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={loading || !cedula}
                                            className="h-12 px-6 bg-[#2d4356] hover:bg-[#1a2b38] gap-2 font-bold"
                                        >
                                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                            BUSCAR
                                        </Button>
                                    </form>

                                    {error && (
                                        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700 animate-in shake duration-300">
                                            <AlertCircle className="h-5 w-5" />
                                            <span className="text-sm font-bold">{error}</span>
                                        </div>
                                    )}

                                    {empleado && (
                                        <div className="mt-6 animate-in zoom-in-95 duration-200">
                                            <EmpleadoCard empleado={empleado} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {empleado && (
                            <form onSubmit={handleSubmit} className="space-y-6 pb-12 animate-in slide-in-from-bottom-4 duration-500">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#2d4356]">
                                        <Wallet className="h-6 w-6" />
                                        <h3 className="text-lg font-black uppercase tracking-tight">Configuración de Días</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="border-none shadow-md">
                                            <CardContent className="p-5 space-y-2">
                                                <label className="text-xs font-black text-gray-500 uppercase">Días Tiempo *</label>
                                                <Input
                                                    type="number"
                                                    required
                                                    placeholder="0"
                                                    value={formData.diasTiempo}
                                                    onChange={(e) => setFormData({ ...formData, diasTiempo: e.target.value })}
                                                    className="h-12 bg-gray-50 font-bold text-xl"
                                                />
                                            </CardContent>
                                        </Card>
                                        <Card className="border-none shadow-md">
                                            <CardContent className="p-5 space-y-2">
                                                <label className="text-xs font-black text-gray-500 uppercase">Días Dinero *</label>
                                                <Input
                                                    type="number"
                                                    required
                                                    placeholder="0"
                                                    value={formData.diasDinero}
                                                    onChange={(e) => setFormData({ ...formData, diasDinero: e.target.value })}
                                                    className="h-12 bg-gray-50 font-bold text-xl"
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {validationMsg && (
                                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 flex items-center gap-3 text-yellow-800 animate-in slide-in-from-left duration-300">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                            <span className="text-sm font-bold">{validationMsg}</span>
                                        </div>
                                    )}

                                    <div className="bg-blue-600/10 p-6 rounded-2xl border border-blue-600/20 flex justify-between items-center shadow-inner">
                                        <div>
                                            <p className="text-sm font-bold text-blue-900 uppercase opacity-60">Días Disponibles</p>
                                            <p className="text-3xl font-black text-blue-900 tracking-tight">{availableDays}</p>
                                        </div>
                                        <div className="h-12 w-[1px] bg-blue-600/20" />
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-blue-900 uppercase opacity-60">Nuevo Saldo</p>
                                            <p className={`text-3xl font-black tracking-tight ${newBalance < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                                                {newBalance}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#2d4356]">
                                        <Calendar className="h-6 w-6" />
                                        <h3 className="text-lg font-black uppercase tracking-tight">Fechas y Detalles</h3>
                                    </div>
                                    <Card className="border-none shadow-lg">
                                        <CardContent className="p-6 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase">Fecha Inicio *</label>
                                                    <Input
                                                        type="date"
                                                        required
                                                        value={formData.fechaInicio}
                                                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                                        className="h-12 bg-gray-50 font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase">Fecha Fin *</label>
                                                    <Input
                                                        type="date"
                                                        required
                                                        value={formData.fechaFin}
                                                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                                                        className="h-12 bg-gray-50 font-medium"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase">Fecha Regreso *</label>
                                                    <Input
                                                        type="date"
                                                        required
                                                        value={formData.fechaRegreso}
                                                        onChange={(e) => setFormData({ ...formData, fechaRegreso: e.target.value })}
                                                        className="h-12 bg-gray-50 font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase">Persona Encargada *</label>
                                                    <Input
                                                        required
                                                        placeholder="Nombre de quien cubrirá tus funciones..."
                                                        value={formData.personaEncargada}
                                                        onChange={(e) => setFormData({ ...formData, personaEncargada: e.target.value })}
                                                        className="h-12 bg-gray-50 font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </section>

                                {success ? (
                                    <div className="p-6 bg-green-50 border border-green-200 rounded-3xl flex flex-col items-center gap-4 text-green-800 animate-in zoom-in-95 duration-500 shadow-lg">
                                        <div className="bg-green-100 p-3 rounded-full">
                                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                                        </div>
                                        <p className="text-xl font-black uppercase text-center">{success}</p>
                                        <p className="text-sm text-green-600 font-medium">Redirigiendo al inicio...</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-14 flex-1 font-bold text-gray-500"
                                            onClick={() => setView('welcome')}
                                        >
                                            CANCELAR
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || newBalance < 0}
                                            className="h-14 flex-[2] bg-[#2d4356] hover:bg-[#1a2b38] text-lg font-black shadow-xl"
                                        >
                                            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <ClipboardList className="h-6 w-6 mr-2" />}
                                            ENVIAR SOLICITUD
                                        </Button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}

                {view === 'history' && (
                    <div className="space-y-6 animate-in slide-in-from-left duration-300 pb-12">
                        <Card className="border-none shadow-xl overflow-hidden">
                            <CardHeader className="bg-[#2d4356] text-white">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                        <History className="h-6 w-6 text-blue-300" />
                                        Historial de Solicitudes
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Filtrar por nombre o cédula..."
                                                value={filterCedula}
                                                onChange={(e) => setFilterCedula(e.target.value)}
                                                className="pl-9 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/40"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleDownloadReport}
                                            variant="outline"
                                            className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2 font-bold px-4"
                                        >
                                            <Download className="h-4 w-4" />
                                            REPORTES
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {historyLoading ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando registros...</p>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-gray-400 grayscale">
                                        <Eraser className="h-16 w-16" />
                                        <p className="text-lg font-bold uppercase tracking-tight">No se encontraron solicitudes</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                                    <th className="px-6 py-4">Empleado</th>
                                                    <th className="px-6 py-4 text-center">Días T/D</th>
                                                    <th className="px-6 py-4">Periodo</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {history.map((solicitud) => (
                                                    <tr key={solicitud.id} className="hover:bg-blue-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-800 text-sm">{solicitud.Empleado_Que_Disfruta}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] text-gray-500 font-medium">#{solicitud.Cedula}</span>
                                                                    <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded italic">
                                                                        {solicitud['Fecha Solicitud']}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-black text-blue-600 leading-none">{solicitud.DiasEnTiempo}</span>
                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Tiempo</span>
                                                                </div>
                                                                <div className="w-[1px] h-6 bg-gray-200" />
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-black text-green-600 leading-none">{solicitud.DiasEnDinero}</span>
                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Dinero</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-700">
                                                                    <span>{solicitud.FechaInicial ? new Date(solicitud.FechaInicial).toLocaleDateString('es-CO') : 'N/A'}</span>
                                                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                                                    <span>{solicitud.FechaFinal ? new Date(solicitud.FechaFinal).toLocaleDateString('es-CO') : 'N/A'}</span>
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-medium italic">Regresa: {solicitud.FechaIngreso ? new Date(solicitud.FechaIngreso).toLocaleDateString('es-CO') : 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${solicitud.Aprobacion_Jefe === 'Aprobado' ? 'bg-green-100 text-green-700' :
                                                                solicitud.Aprobacion_Jefe === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${solicitud.Aprobacion_Jefe === 'Aprobado' ? 'bg-green-600' :
                                                                    solicitud.Aprobacion_Jefe === 'Rechazado' ? 'bg-red-600' : 'bg-yellow-600'
                                                                    }`} />
                                                                {solicitud.Aprobacion_Jefe || 'Pendiente'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-black text-xs"
                                                            >
                                                                DETALLE
                                                                <ChevronRight className="h-4 w-4 ml-1" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}
