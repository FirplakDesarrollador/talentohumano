'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Loader2, CheckCircle2, Search, X, Upload, FileText, Trash2, ChevronDown } from 'lucide-react'
import { usePlantas } from '@/lib/hooks/usePlantas'

const MOTIVOS = [
    'Reemplazo por renuncia',
    'Incremento de la productividad',
    'Reemplazo por terminación de contrato',
    'Reemplazo por ascenso',
    'Reemplazo por licencia de incapacidad/maternidad/paternidad',
]

export default function SolicitarPersonalPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [form, setForm] = useState({
        cargo_solicitado: '',
        area_planta: '',
        motivo: 'Incremento de la productividad',
        reemplazo_de: '',
        cantidad_personas: '1',
        fecha_requerida: '',
        perfil: '',
        salario: '',
        horario: '',
    })

    // Perfil / Requisitos: texto libre o un archivo adjunto (perfil de cargo), no ambos.
    const [perfilModo, setPerfilModo] = useState<'texto' | 'archivo'>('texto')
    const [perfilArchivo, setPerfilArchivo] = useState<{ url: string; nombre: string } | null>(null)
    const [uploadingPerfil, setUploadingPerfil] = useState(false)

    // Persona que solicita: buscador de empleados en vez de texto libre, para
    // poder asignarle la tarea de Planner con su cuenta real de Microsoft 365.
    const [empleadoSearch, setEmpleadoSearch] = useState('')
    const [empleadoResults, setEmpleadoResults] = useState<any[]>([])
    const [showEmpleadoResults, setShowEmpleadoResults] = useState(false)
    const [selectedEmpleado, setSelectedEmpleado] = useState<{ id: number; nombreCompleto: string; correo_electronico: string } | null>(null)
    const empleadoBoxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (selectedEmpleado) {
                setEmpleadoResults([])
                return
            }
            let query = supabase
                .from('empleados')
                .select('id, nombreCompleto, correo_electronico')
                .eq('activo', true)
                .not('correo_electronico', 'is', null)
                .order('nombreCompleto')
                .limit(50)
            if (empleadoSearch.length > 0) {
                query = query.ilike('nombreCompleto', `%${empleadoSearch}%`)
            }
            const { data } = await query
            setEmpleadoResults(data || [])
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, 300)
        return () => clearTimeout(handler)
    }, [empleadoSearch, selectedEmpleado])

    // Cargo Solicitado: desplegable con busqueda sobre el directorio maestro de
    // cargos, con opcion de crear uno nuevo (se guarda directo en la tabla `cargos`)
    // si no existe todavia.
    const [cargoResults, setCargoResults] = useState<{ id: number; cargo: string }[]>([])
    const [showCargoResults, setShowCargoResults] = useState(false)
    const [addingCargo, setAddingCargo] = useState(false)
    const cargoBoxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = setTimeout(async () => {
            let query = supabase
                .from('cargos' as any)
                .select('id, cargo')
                .not('cargo', 'is', null)
                .order('cargo')
                .limit(50)
            if (form.cargo_solicitado.length > 0) {
                query = query.ilike('cargo', `%${form.cargo_solicitado}%`)
            }
            const { data } = await query
            setCargoResults((data as any) || [])
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, 300)
        return () => clearTimeout(handler)
    }, [form.cargo_solicitado])

    // Cierra los desplegables al hacer clic fuera, como cualquier combobox.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (empleadoBoxRef.current && !empleadoBoxRef.current.contains(event.target as Node)) {
                setShowEmpleadoResults(false)
            }
            if (cargoBoxRef.current && !cargoBoxRef.current.contains(event.target as Node)) {
                setShowCargoResults(false)
            }
            if (plantaBoxRef.current && !plantaBoxRef.current.contains(event.target as Node)) {
                setShowPlantaResults(false)
            }
            if (reemplazoBoxRef.current && !reemplazoBoxRef.current.contains(event.target as Node)) {
                setShowReemplazoResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectCargo = (cargo: string) => {
        set('cargo_solicitado', cargo)
        setShowCargoResults(false)
    }

    // Área / Planta: desplegable con busqueda sobre la misma tabla `plantas`
    // que usa el resto de la app (Gestor de Personal, filtros, etc.).
    const { plantas } = usePlantas()
    const [showPlantaResults, setShowPlantaResults] = useState(false)
    const plantaBoxRef = useRef<HTMLDivElement>(null)
    const plantaResults = plantas.filter(p => p.toLowerCase().includes(form.area_planta.toLowerCase()))

    const selectPlanta = (planta: string) => {
        set('area_planta', planta)
        setShowPlantaResults(false)
    }

    // ¿Es Reemplazo?: oculta Motivo y "A quién reemplaza" hasta que se marque.
    // Al desmarcar, el motivo vuelve a "Incremento de la productividad" (el
    // unico motivo que no es un reemplazo).
    const [esReemplazo, setEsReemplazo] = useState(false)
    const toggleEsReemplazo = (checked: boolean) => {
        setEsReemplazo(checked)
        if (checked) {
            set('motivo', MOTIVOS.find(m => m.startsWith('Reemplazo')) || MOTIVOS[0])
        } else {
            set('motivo', 'Incremento de la productividad')
            set('reemplazo_de', '')
        }
    }

    // A quién reemplaza: desplegable con busqueda sobre TODOS los empleados,
    // activos e inactivos (a diferencia del buscador de "Persona que Solicita",
    // que solo busca entre los activos).
    const [reemplazoResults, setReemplazoResults] = useState<any[]>([])
    const [showReemplazoResults, setShowReemplazoResults] = useState(false)
    const reemplazoBoxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!esReemplazo) return
        const handler = setTimeout(async () => {
            let query = supabase
                .from('empleados')
                .select('id, nombreCompleto, activo')
                .order('nombreCompleto')
                .limit(50)
            if (form.reemplazo_de.length > 0) {
                query = query.ilike('nombreCompleto', `%${form.reemplazo_de}%`)
            }
            const { data } = await query
            setReemplazoResults(data || [])
        }, 300)
        return () => clearTimeout(handler)
    }, [form.reemplazo_de, esReemplazo, supabase])

    const selectReemplazo = (nombre: string) => {
        set('reemplazo_de', nombre)
        setShowReemplazoResults(false)
    }

    const handleAddCargo = async () => {
        const nombre = form.cargo_solicitado.trim()
        if (!nombre) return

        setAddingCargo(true)
        try {
            const { error } = await (supabase.from('cargos' as any) as any).insert({ cargo: nombre })
            if (error) throw error
            set('cargo_solicitado', nombre)
            setShowCargoResults(false)
        } catch (err: any) {
            console.error('Error creando cargo:', err)
            alert('No se pudo agregar el cargo nuevo. Intenta de nuevo.')
        } finally {
            setAddingCargo(false)
        }
    }

    const selectEmpleado = (emp: any) => {
        setSelectedEmpleado(emp)
        setEmpleadoSearch(emp.nombreCompleto)
        setShowEmpleadoResults(false)
    }

    const clearEmpleado = () => {
        setSelectedEmpleado(null)
        setEmpleadoSearch('')
    }

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

    const handlePerfilArchivoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingPerfil(true)
        try {
            // Nombre aleatorio + extension: el nombre original del archivo (con
            // tildes, espacios, parentesis, etc.) puede romper la key de Storage.
            const fileExt = file.name.includes('.') ? file.name.split('.').pop() : ''
            const randomName = Math.random().toString(36).substring(2)
            const fileName = `${Date.now()}_perfil_${randomName}${fileExt ? `.${fileExt}` : ''}`

            const { data, error } = await supabase.storage
                .from('solicitudes-personal')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('solicitudes-personal')
                .getPublicUrl(data.path)

            setPerfilArchivo({ url: publicUrl, nombre: file.name })
        } catch (err: any) {
            console.error('Error uploading perfil archivo:', err)
            const detail = err?.message || err?.error_description || err?.statusCode
            alert(`Error al subir el archivo${detail ? `: ${detail}` : ''}. Intenta de nuevo.`)
        } finally {
            setUploadingPerfil(false)
            e.target.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEmpleado || !form.cargo_solicitado) {
            setError('Selecciona quién solicita (de la lista) y completa el cargo solicitado.')
            return
        }

        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/solicitudes-personal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    solicitante_empleado_id: selectedEmpleado.id,
                    solicitante_nombre: selectedEmpleado.nombreCompleto,
                    solicitante_correo: selectedEmpleado.correo_electronico,
                    cargo_solicitado: form.cargo_solicitado,
                    area_planta: form.area_planta || null,
                    motivo: form.motivo,
                    reemplazo_de: esReemplazo ? (form.reemplazo_de || null) : null,
                    cantidad_personas: parseInt(form.cantidad_personas) || 1,
                    fecha_requerida: form.fecha_requerida || null,
                    perfil: perfilModo === 'texto' ? (form.perfil || null) : null,
                    perfil_archivo_url: perfilModo === 'archivo' ? (perfilArchivo?.url || null) : null,
                    perfil_archivo_nombre: perfilModo === 'archivo' ? (perfilArchivo?.nombre || null) : null,
                    salario: form.salario || null,
                    horario: form.horario || null,
                }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Error al enviar la solicitud')
            }
            setSuccess(true)
        } catch (err: any) {
            console.error('Error creating solicitud de personal:', err)
            setError('No se pudo enviar la solicitud. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100 border border-blue-50 p-12 text-center">
                    <div className="flex justify-center mb-8">
                        <div className="p-6 bg-green-100 rounded-full text-green-600">
                            <CheckCircle2 size={48} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">¡Solicitud Enviada!</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">
                        Talento Humano revisará tu solicitud de personal y se pondrá en contacto contigo.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-50 text-slate-900 min-h-screen py-8 px-4 font-sans">
            <div className="max-w-xl mx-auto mb-8 text-center mt-4">
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 border-2 border-white">
                        <Briefcase size={26} />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">Solicitud de Personal</h1>
                <p className="text-slate-500 text-sm font-medium">Completa este formulario para pedir a Talento Humano la apertura de una vacante</p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-12">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-8 space-y-6">
                        <div className="space-y-2 relative" ref={empleadoBoxRef}>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Persona que Solicita</label>
                            <div className="relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={empleadoSearch}
                                    onChange={(e) => {
                                        setEmpleadoSearch(e.target.value)
                                        setSelectedEmpleado(null)
                                        setShowEmpleadoResults(true)
                                    }}
                                    onFocus={() => setShowEmpleadoResults(true)}
                                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    placeholder="Escribe o selecciona tu nombre..."
                                    autoComplete="off"
                                    required
                                />
                                {selectedEmpleado ? (
                                    <button
                                        type="button"
                                        onClick={clearEmpleado}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowEmpleadoResults(prev => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showEmpleadoResults ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {showEmpleadoResults && (
                                <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 max-h-64 overflow-y-auto">
                                    {empleadoResults.length > 0 ? (
                                        empleadoResults.map((emp) => (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => selectEmpleado(emp)}
                                                className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors"
                                            >
                                                <p className="text-sm font-bold text-slate-800">{emp.nombreCompleto}</p>
                                                <p className="text-xs text-slate-400">{emp.correo_electronico}</p>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="px-5 py-3 text-sm text-slate-400">Sin resultados</p>
                                    )}
                                </div>
                            )}

                            {selectedEmpleado && (
                                <p className="text-xs text-emerald-600 font-bold ml-1">✓ {selectedEmpleado.correo_electronico}</p>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 relative" ref={cargoBoxRef}>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cargo Solicitado</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.cargo_solicitado}
                                        onChange={(e) => {
                                            set('cargo_solicitado', e.target.value)
                                            setShowCargoResults(true)
                                        }}
                                        onFocus={() => setShowCargoResults(true)}
                                        className="w-full h-14 pl-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        placeholder="Ej: Operario de producción"
                                        autoComplete="off"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCargoResults(prev => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showCargoResults ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {showCargoResults && (
                                    <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 max-h-64 overflow-y-auto">
                                        {cargoResults.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => selectCargo(c.cargo)}
                                                className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-bold text-slate-800"
                                            >
                                                {c.cargo}
                                            </button>
                                        ))}
                                        {form.cargo_solicitado.trim() && !cargoResults.some(c => c.cargo?.toLowerCase() === form.cargo_solicitado.trim().toLowerCase()) && (
                                            <button
                                                type="button"
                                                onClick={handleAddCargo}
                                                disabled={addingCargo}
                                                className="w-full px-5 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1"
                                            >
                                                {addingCargo ? (
                                                    <Loader2 size={14} className="animate-spin text-emerald-600" />
                                                ) : (
                                                    <span className="text-emerald-600 font-black text-base leading-none">+</span>
                                                )}
                                                <span className="text-sm font-bold text-emerald-600">
                                                    Agregar &quot;{form.cargo_solicitado.trim()}&quot; como nuevo cargo
                                                </span>
                                            </button>
                                        )}
                                        {cargoResults.length === 0 && !form.cargo_solicitado.trim() && (
                                            <p className="px-5 py-3 text-sm text-slate-400">Escribe para buscar un cargo...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 relative" ref={plantaBoxRef}>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área / Planta</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.area_planta}
                                        onChange={(e) => {
                                            set('area_planta', e.target.value)
                                            setShowPlantaResults(true)
                                        }}
                                        onFocus={() => setShowPlantaResults(true)}
                                        className="w-full h-14 pl-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        placeholder="Ej: Marmol Sintético"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPlantaResults(prev => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showPlantaResults ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {showPlantaResults && (
                                    <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 max-h-64 overflow-y-auto">
                                        {plantaResults.length > 0 ? (
                                            plantaResults.map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => selectPlanta(p)}
                                                    className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-bold text-slate-800"
                                                >
                                                    {p}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="px-5 py-3 text-sm text-slate-400">Sin resultados</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                                    <input
                                        type="checkbox"
                                        checked={esReemplazo}
                                        onChange={(e) => toggleEsReemplazo(e.target.checked)}
                                        className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-4 focus:ring-blue-100 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">¿Es Reemplazo?</span>
                                </label>
                            </div>
                            {esReemplazo && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                                        <select
                                            value={form.motivo}
                                            onChange={(e) => set('motivo', e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        >
                                            {MOTIVOS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 relative" ref={reemplazoBoxRef}>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">¿A quién reemplaza?</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.reemplazo_de}
                                                onChange={(e) => {
                                                    set('reemplazo_de', e.target.value)
                                                    setShowReemplazoResults(true)
                                                }}
                                                onFocus={() => setShowReemplazoResults(true)}
                                                className="w-full h-14 pl-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                                placeholder="Nombre de la persona que salió"
                                                autoComplete="off"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowReemplazoResults(prev => !prev)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <ChevronDown className={`h-4 w-4 transition-transform ${showReemplazoResults ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>

                                        {showReemplazoResults && (
                                            <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 max-h-64 overflow-y-auto">
                                                {reemplazoResults.length > 0 ? (
                                                    reemplazoResults.map((emp) => (
                                                        <button
                                                            key={emp.id}
                                                            type="button"
                                                            onClick={() => selectReemplazo(emp.nombreCompleto)}
                                                            className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                                                        >
                                                            <span className="text-sm font-bold text-slate-800">{emp.nombreCompleto}</span>
                                                            {!emp.activo && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">Retirado</span>
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-5 py-3 text-sm text-slate-400">Sin resultados</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cantidad de Personas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.cantidad_personas}
                                    onChange={(e) => set('cantidad_personas', e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Requerida</label>
                                <input
                                    type="date"
                                    value={form.fecha_requerida}
                                    onChange={(e) => set('fecha_requerida', e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perfil / Requisitos</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setPerfilModo('texto')}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${perfilModo === 'texto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Escribir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPerfilModo('archivo')}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${perfilModo === 'archivo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Subir archivo
                                        </button>
                                    </div>
                                </div>

                                {perfilModo === 'texto' ? (
                                    <textarea
                                        value={form.perfil}
                                        onChange={(e) => set('perfil', e.target.value)}
                                        rows={3}
                                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium resize-none"
                                        placeholder="Experiencia, habilidades, estudios requeridos..."
                                    />
                                ) : (
                                    <div>
                                        <input
                                            type="file"
                                            id="perfilArchivoInput"
                                            className="hidden"
                                            onChange={handlePerfilArchivoSelect}
                                            disabled={uploadingPerfil}
                                        />
                                        {!perfilArchivo ? (
                                            <button
                                                type="button"
                                                disabled={uploadingPerfil}
                                                onClick={() => document.getElementById('perfilArchivoInput')?.click()}
                                                className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2 text-slate-400"
                                            >
                                                {uploadingPerfil ? (
                                                    <Loader2 size={20} className="animate-spin text-blue-600" />
                                                ) : (
                                                    <>
                                                        <Upload size={20} />
                                                        <span className="text-xs font-bold">Subir perfil de cargo (PDF, Word, imagen...)</span>
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-full px-5 py-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText size={18} className="text-emerald-600 shrink-0" />
                                                    <span className="text-sm font-medium text-slate-700 truncate">{perfilArchivo.nombre}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPerfilArchivo(null)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Salario</label>
                                    <input
                                        type="text"
                                        value={form.salario}
                                        onChange={(e) => set('salario', e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        placeholder="Ej: $1.500.000 - $1.800.000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Horario</label>
                                    <input
                                        type="text"
                                        value={form.horario}
                                        onChange={(e) => set('horario', e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        placeholder="Ej: Lunes a viernes 7am - 5pm"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar Solicitud'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="max-w-xl mx-auto mt-4 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Firplak — Talento Humano
            </div>
        </div>
    )
}
