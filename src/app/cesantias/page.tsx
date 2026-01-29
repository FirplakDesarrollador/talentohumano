'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { SolicitudDetalle } from '@/components/Cesantias/SolicitudDetalle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    PiggyBank,
    ArrowLeft,
    Search,
    Eraser,
    Loader2,
    Info,
    PlusCircle,
    History,
    CheckCircle2,
    AlertCircle,
    FileText,
    Upload,
    ChevronRight,
    ArrowRight,
    Eye,
    X,
    ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CesantiasPage() {
    const [view, setView] = useState<'welcome' | 'process' | 'history'>('welcome')
    const [cedula, setCedula] = useState('')
    const [empleado, setEmpleado] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [showInstructions, setShowInstructions] = useState(false)
    const [selectedSolicitud, setSelectedSolicitud] = useState<any>(null)

    // Form state for new request
    const [formData, setFormData] = useState({
        tipoDeCesantias: '',
        motivo: '',
        valor: '',
        archivos: [] as File[]
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Admin filtering
    const [filterCedula, setFilterCedula] = useState('')
    const [filterTipo, setFilterTipo] = useState('')
    const [filterMotivo, setFilterMotivo] = useState('')

    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('correo', user.email!)
                    .single()
                setCurrentUser(profile || { correo: user.email })
            }
        }
        fetchUser()
    }, [supabase])

    const isAdmin = currentUser?.correo === 'renata.lainez@firplak.com' || currentUser?.correo === 'aprendiz.desarrollo@firplak.com'

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true)
        try {
            let query = supabase.from('cesantias').select('*').order('created', { ascending: false })

            if (filterCedula) query = query.ilike('cedula', `%${filterCedula}%`)
            if (filterTipo) query = query.eq('tipoDeCesantias', filterTipo)
            if (filterMotivo) query = query.eq('motivo', filterMotivo)

            const { data, error } = await query
            if (error) throw error
            setHistory(data || [])
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setHistoryLoading(false)
        }
    }, [supabase, filterCedula, filterTipo, filterMotivo])

    useEffect(() => {
        if (view === 'history') {
            fetchHistory()
        }
    }, [view, fetchHistory])

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!cedula) return

        setLoading(true)
        setEmpleado(null)
        setError(null)
        setSuccess(null)

        try {
            const { data, error } = await supabase
                .from('empleados')
                .select('*')
                .eq('id', parseInt(cedula))
                .single()

            if (error) throw new Error('Empleado no encontrado')
            setEmpleado(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFormData({ ...formData, archivos: [...formData.archivos, ...Array.from(e.target.files)] })
        }
    }

    const removeFile = (index: number) => {
        const newFiles = [...formData.archivos]
        newFiles.splice(index, 1)
        setFormData({ ...formData, archivos: newFiles })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!empleado || !formData.tipoDeCesantias || !formData.motivo || !formData.valor || formData.archivos.length === 0) {
            setError('Por favor completa todos los campos y adjunta al menos un soporte.')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            // 1. Upload files
            const uploadPromises = formData.archivos.map(async (file) => {
                const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
                const filePath = `${empleado.nombreCompleto}/${fileName}`

                const { data, error } = await supabase.storage
                    .from('Cesantias')
                    .upload(filePath, file)

                if (error) throw error

                const { data: { publicUrl } } = supabase.storage
                    .from('Cesantias')
                    .getPublicUrl(filePath)

                return publicUrl
            })

            const uploadedUrls = await Promise.all(uploadPromises)

            // 2. Insert record
            const { error: insertError } = await (supabase as any)
                .from('cesantias')
                .insert({
                    cedula: empleado.cedula,
                    nombre: empleado.nombreCompleto,
                    correo: currentUser?.correo || '',
                    tipoDeCesantias: formData.tipoDeCesantias,
                    valor: formData.valor,
                    motivo: formData.motivo,
                    created: new Date().toISOString(),
                    aprobacionTHT: 'Pendiente',
                    EntregoSoporteDePago: false,
                    soporte: uploadedUrls
                })

            if (insertError) throw insertError

            setSuccess('Tu solicitud ha sido enviada con éxito.')
            setTimeout(() => {
                setView('welcome')
                setEmpleado(null)
                setCedula('')
                setFormData({ tipoDeCesantias: '', motivo: '', valor: '', archivos: [] })
            }, 3000)

        } catch (err: any) {
            console.error('Error submitting request:', err)
            setError(err.message || 'Error al enviar la solicitud')
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatCurrency = (amount: string) => {
        const val = parseFloat(amount.replace(/[^0-9]/g, ''))
        if (isNaN(val)) return '$0'
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header / AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => view === 'welcome' ? router.push('/menu') : setView('welcome')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Cesantías</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {view === 'welcome' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <PiggyBank className="h-10 w-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Bienvenido a la solicitud de retiro de cesantías</h2>
                            <p className="text-gray-600 max-w-lg mx-auto">
                                A continuación puedes consultar el instructivo de uso o iniciar el proceso de solicitud.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            <Button
                                onClick={() => setShowInstructions(true)}
                                variant="outline"
                                className="h-32 flex flex-col gap-2 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
                            >
                                <Info className="h-8 w-8 text-blue-600" />
                                <span className="font-bold text-lg">Instrucciones</span>
                            </Button>
                            <Button
                                onClick={() => setView('process')}
                                className="h-32 flex flex-col gap-2 bg-[#2d4356] hover:bg-[#1a2b38] transition-all"
                            >
                                <PlusCircle className="h-8 w-8 text-white" />
                                <span className="font-bold text-lg">Ingresar Solicitud</span>
                            </Button>
                            {isAdmin && (
                                <Button
                                    onClick={() => setView('history')}
                                    variant="secondary"
                                    className="h-32 flex flex-col gap-2 border-2 border-gray-200 col-md-span-2 md:col-span-2"
                                >
                                    <History className="h-8 w-8 text-gray-700" />
                                    <span className="font-bold text-lg">Visualizar (Admin)</span>
                                </Button>
                            )}
                        </div>

                        {showInstructions && (
                            <Card className="border-blue-200 bg-blue-50 animate-in slide-in-from-top-4">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-blue-800 flex items-center gap-2">
                                        <Info className="h-5 w-5" />
                                        Instructivo de Uso
                                    </CardTitle>
                                    <button onClick={() => setShowInstructions(false)} className="text-blue-500 hover:text-blue-700">
                                        <X className="h-5 w-5" />
                                    </button>
                                </CardHeader>
                                <CardContent className="text-sm text-blue-900 leading-relaxed space-y-4">
                                    <p>A continuación estarán los motivos por los cuales es posible retirar tus cesantías y los documentos soporte que debes adjuntar:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Adquisición de vivienda, lote o terreno:</strong> Escrituras o compraventa donde conste que eres o serás el propietario y el monto a pagar.</li>
                                        <li><strong>Ampliación, reparación o mejora de vivienda:</strong> Escrituras o impuesto predial donde conste que eres el propietario y la cotización.</li>
                                        <li><strong>Amortización de vivienda:</strong> Compraventa, Impuesto predial o factura.</li>
                                        <li><strong>Educación superior (empleado, hijo(a), cónyuge):</strong> Prefactura de universidad o institución.</li>
                                    </ul>
                                    <p className="font-bold italic">Recuerda: Luego de realizar los pagos, debes enviar a Talento Humano los comprobantes respectivos para validación.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === 'process' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <Card className="border-none shadow-md overflow-hidden bg-white">
                            <CardContent className="p-6">
                                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <label className="text-sm font-semibold text-gray-600">Cédula del Empleado</label>
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
                                    <div className="flex bg-gray-100 p-1 rounded-lg h-12">
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
                                            onClick={() => { setCedula(''); setEmpleado(null); setError(null); }}
                                            className="h-full px-4 text-gray-500 hover:bg-white/50"
                                        >
                                            <Eraser className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {empleado && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <EmpleadoCard empleado={empleado} />

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Formulario de Solicitud</CardTitle>
                                        <CardDescription>Completa los detalles para tu retiro de cesantías</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Tipo de Cesantías</label>
                                                    <select
                                                        className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm"
                                                        value={formData.tipoDeCesantias}
                                                        onChange={(e) => setFormData({ ...formData, tipoDeCesantias: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Seleccione tipo...</option>
                                                        <option value="Empresa">Empresa</option>
                                                        <option value="Fondo">Fondo</option>
                                                        <option value="Ambas">Ambas</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Valor a Retirar</label>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Monto aproximado..."
                                                            value={formData.valor}
                                                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                                            required
                                                        />
                                                        <div className="mt-1 text-xs font-bold text-[#2a7b37]">
                                                            {formatCurrency(formData.valor)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Motivo del Retiro</label>
                                                    <select
                                                        className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm"
                                                        value={formData.motivo}
                                                        onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Seleccione motivo...</option>
                                                        <option value="Adquisición Vivienda, lote o terreno">Adquisición Vivienda, lote o terreno</option>
                                                        <option value="Ampliación, Reparación o Mejora">Ampliación, Reparación o Mejora</option>
                                                        <option value="Amortización Deuda Vivienda">Amortización Deuda Vivienda</option>
                                                        <option value="Pago Predial">Pago Predial</option>
                                                        <option value="Educación Empleado - Hijo o Conyuje">Educación Empleado - Hijo o Conyuje</option>
                                                    </select>
                                                </div>

                                                <div className="md:col-span-2 space-y-4">
                                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                        <Upload className="h-4 w-4" />
                                                        Documentos de Soporte
                                                    </label>

                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer group"
                                                    >
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            multiple
                                                            onChange={handleFileChange}
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                        />
                                                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                                                        <p className="font-medium text-gray-700">Haga clic para subir sus soportes</p>
                                                        <p className="text-xs text-gray-500 mt-1">PDF o imágenes (máx. 10 MB por archivo)</p>
                                                    </div>

                                                    {formData.archivos.length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {formData.archivos.map((file, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 italic text-xs">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                                        <span className="truncate">{file.name}</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 p-1">
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {success && (
                                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                                    {success}
                                                </div>
                                            )}

                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full h-14 text-lg font-bold bg-[#2d4356] hover:bg-[#1a2b38] text-white"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'ENVIAR SOLICITUD'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {view === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <Card className="border-none shadow-md overflow-hidden bg-white">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Cédula</label>
                                        <Input
                                            placeholder="Filtrar..."
                                            value={filterCedula}
                                            onChange={(e) => setFilterCedula(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm"
                                            value={filterTipo}
                                            onChange={(e) => setFilterTipo(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            <option value="Empresa">Empresa</option>
                                            <option value="Fondo">Fondo</option>
                                            <option value="Ambas">Ambas</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm"
                                            value={filterMotivo}
                                            onChange={(e) => setFilterMotivo(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            <option value="Adquisición Vivienda, lote o terreno">Adquisición Vivienda, lote o terreno</option>
                                            <option value="Ampliación, Reparación o Mejora">Ampliación, Reparación o Mejora</option>
                                            <option value="Amortización Deuda Vivienda">Amortización Deuda Vivienda</option>
                                            <option value="Pago Predial">Pago Predial</option>
                                            <option value="Educación Empleado - Hijo o Conyuje">Educación Empleado - Hijo o Conyuje</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                                    <p className="text-gray-500">Cargando historial...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600 font-bold text-lg">No se encontraron registros</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {history.map((item) => (
                                        <Card key={item.id} className="hover:shadow-lg transition-all border border-gray-100">
                                            <CardContent className="p-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-800">{item.nombre}</span>
                                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">{item.tipoDeCesantias}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500">C.C. {item.cedula} • {new Date(item.created).toLocaleDateString()}</p>
                                                        <p className="text-xs text-gray-600 font-medium">Motivo: {item.motivo}</p>
                                                    </div>
                                                    <div className="flex flex-row items-center gap-4 text-right">
                                                        <div className="space-y-1">
                                                            <p className="text-lg font-black text-blue-600">{formatCurrency(item.valor || '0')}</p>
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${item.aprobacionTHT === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                                                item.aprobacionTHT === 'Aprobado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {item.aprobacionTHT}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-10 w-10 p-0"
                                                            onClick={() => setSelectedSolicitud(item)}
                                                        >
                                                            <Eye className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedSolicitud && (
                <SolicitudDetalle
                    solicitud={selectedSolicitud}
                    onClose={() => setSelectedSolicitud(null)}
                    onUpdate={fetchHistory}
                />
            )}
        </div>
    )
}
