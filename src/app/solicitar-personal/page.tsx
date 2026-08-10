'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Loader2, CheckCircle2, Search, X } from 'lucide-react'

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
        motivo: MOTIVOS[0],
        reemplazo_de: '',
        cantidad_personas: '1',
        fecha_requerida: '',
        perfil: '',
        salario: '',
        horario: '',
    })

    // Persona que solicita: buscador de empleados en vez de texto libre, para
    // poder asignarle la tarea de Planner con su cuenta real de Microsoft 365.
    const [empleadoSearch, setEmpleadoSearch] = useState('')
    const [empleadoResults, setEmpleadoResults] = useState<any[]>([])
    const [showEmpleadoResults, setShowEmpleadoResults] = useState(false)
    const [selectedEmpleado, setSelectedEmpleado] = useState<{ id: number; nombreCompleto: string; correo_electronico: string } | null>(null)

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
                .limit(8)
            if (empleadoSearch.length > 0) {
                query = query.ilike('nombreCompleto', `%${empleadoSearch}%`)
            }
            const { data } = await query
            setEmpleadoResults(data || [])
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, 300)
        return () => clearTimeout(handler)
    }, [empleadoSearch, selectedEmpleado])

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
                    reemplazo_de: form.motivo.startsWith('Reemplazo') ? (form.reemplazo_de || null) : null,
                    cantidad_personas: parseInt(form.cantidad_personas) || 1,
                    fecha_requerida: form.fecha_requerida || null,
                    perfil: form.perfil || null,
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
                        <div className="space-y-2 relative">
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
                                    placeholder="Escribe tu nombre..."
                                    required
                                />
                                {selectedEmpleado && (
                                    <button
                                        type="button"
                                        onClick={clearEmpleado}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {showEmpleadoResults && empleadoResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2">
                                    {empleadoResults.map((emp) => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => selectEmpleado(emp)}
                                            className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors"
                                        >
                                            <p className="text-sm font-bold text-slate-800">{emp.nombreCompleto}</p>
                                            <p className="text-xs text-slate-400">{emp.correo_electronico}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedEmpleado && (
                                <p className="text-xs text-emerald-600 font-bold ml-1">✓ {selectedEmpleado.correo_electronico}</p>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cargo Solicitado</label>
                                <input
                                    type="text"
                                    value={form.cargo_solicitado}
                                    onChange={(e) => set('cargo_solicitado', e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    placeholder="Ej: Operario de producción"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área / Planta</label>
                                <input
                                    type="text"
                                    value={form.area_planta}
                                    onChange={(e) => set('area_planta', e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    placeholder="Ej: Marmol Sintético"
                                />
                            </div>
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
                            {form.motivo.startsWith('Reemplazo') && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">¿A quién reemplaza?</label>
                                    <input
                                        type="text"
                                        value={form.reemplazo_de}
                                        onChange={(e) => set('reemplazo_de', e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                        placeholder="Nombre de la persona que salió"
                                    />
                                </div>
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
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Perfil / Requisitos</label>
                                <textarea
                                    value={form.perfil}
                                    onChange={(e) => set('perfil', e.target.value)}
                                    rows={3}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium resize-none"
                                    placeholder="Experiencia, habilidades, estudios requeridos..."
                                />
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
