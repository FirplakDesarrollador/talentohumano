'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus2, Loader2, CheckCircle2, Upload, FileText, Trash2 } from 'lucide-react'

interface VacanteOpcion {
    id: number
    cargo: string
    planta: string | null
}

export default function InscripcionCandidatosPage() {
    const supabase = createClient()

    const [vacantes, setVacantes] = useState<VacanteOpcion[]>([])
    const [loadingVacantes, setLoadingVacantes] = useState(true)

    const [vacanteId, setVacanteId] = useState('')
    const [nombre, setNombre] = useState('')
    const [cedula, setCedula] = useState('')
    const [telefono, setTelefono] = useState('')
    const [email, setEmail] = useState('')
    const [mensaje, setMensaje] = useState('')
    const [legalAccepted, setLegalAccepted] = useState(false)

    const [hojaVida, setHojaVida] = useState<{ url: string; nombre: string } | null>(null)
    const [subiendoHojaVida, setSubiendoHojaVida] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const fetchVacantes = async () => {
            try {
                const { data, error } = await (supabase.from('seleccion_vacantes' as any) as any)
                    .select('id, cargo, planta')
                    .eq('estado', 'ACTIVA')
                    .order('cargo', { ascending: true })
                if (error) throw error
                setVacantes(data || [])
            } catch (err) {
                console.error('Error cargando vacantes activas:', err)
            } finally {
                setLoadingVacantes(false)
            }
        }
        fetchVacantes()
    }, [supabase])

    const handleHojaVidaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSubiendoHojaVida(true)
        try {
            const fileExt = file.name.includes('.') ? file.name.split('.').pop() : ''
            const randomName = Math.random().toString(36).substring(2)
            const fileName = `candidatos-seleccion/${Date.now()}_cv_${randomName}${fileExt ? `.${fileExt}` : ''}`

            const { data, error } = await supabase.storage
                .from('solicitudes-personal')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('solicitudes-personal')
                .getPublicUrl(data.path)

            setHojaVida({ url: publicUrl, nombre: file.name })
        } catch (err: any) {
            console.error('Error subiendo hoja de vida:', err)
            alert('No se pudo subir el archivo. Intenta de nuevo.')
        } finally {
            setSubiendoHojaVida(false)
            e.target.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vacanteId) { setError('Selecciona la vacante a la que quieres aplicar.'); return }
        if (!nombre.trim() || !cedula.trim() || !telefono.trim() || !email.trim()) {
            setError('Completa todos los campos obligatorios.')
            return
        }
        if (!hojaVida) { setError('Adjunta tu hoja de vida.'); return }
        if (!legalAccepted) { setError('Debes autorizar el tratamiento de tus datos personales para continuar.'); return }

        setLoading(true)
        setError(null)
        try {
            const { error } = await (supabase.from('seleccion_candidatos' as any) as any).insert({
                vacante_id: parseInt(vacanteId, 10),
                nombre_completo: nombre.trim(),
                cedula: cedula.trim(),
                telefono: telefono.trim(),
                email: email.trim(),
                hoja_vida_url: hojaVida.url,
                hoja_vida_nombre: hojaVida.nombre,
                mensaje: mensaje.trim() || null,
            })
            if (error) throw error
            setSuccess(true)
        } catch (err: any) {
            console.error('Error creando inscripción de candidato:', err)
            setError('No se pudo enviar tu inscripción. Intenta nuevamente.')
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
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">¡Gracias por tu interés!</h2>
                    <p className="text-slate-500 leading-relaxed font-medium">
                        Recibimos tu inscripción correctamente. El equipo de Talento Humano la revisará y se pondrá en contacto contigo.
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
                        <UserPlus2 size={26} />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">Inscripción de Candidatos</h1>
                <p className="text-slate-500 text-sm font-medium">Postúlate a una de nuestras vacantes activas en FIRPLAK</p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-12">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Vacante a la que aplicas</label>
                            <select
                                value={vacanteId}
                                onChange={(e) => setVacanteId(e.target.value)}
                                disabled={loadingVacantes}
                                className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                required
                            >
                                <option value="">{loadingVacantes ? 'Cargando vacantes...' : 'Selecciona una vacante'}</option>
                                {vacantes.map(v => (
                                    <option key={v.id} value={v.id}>{v.cargo}{v.planta ? ` — ${v.planta}` : ''}</option>
                                ))}
                            </select>
                            {!loadingVacantes && vacantes.length === 0 && (
                                <p className="text-xs text-amber-600 ml-1">No hay vacantes activas en este momento.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre completo</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cédula</label>
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Correo electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Hoja de vida</label>
                            <input
                                type="file"
                                id="hojaVidaInput"
                                className="hidden"
                                onChange={handleHojaVidaSelect}
                                disabled={subiendoHojaVida}
                                accept=".pdf,.doc,.docx"
                            />
                            {!hojaVida ? (
                                <button
                                    type="button"
                                    disabled={subiendoHojaVida}
                                    onClick={() => document.getElementById('hojaVidaInput')?.click()}
                                    className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2 text-slate-400"
                                >
                                    {subiendoHojaVida ? (
                                        <Loader2 size={20} className="animate-spin text-blue-600" />
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span className="text-xs font-bold">Subir hoja de vida (PDF o Word)</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="w-full px-5 py-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText size={18} className="text-emerald-600 shrink-0" />
                                        <span className="text-sm font-medium text-slate-700 truncate">{hojaVida.nombre}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHojaVida(null)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mensaje (opcional)</label>
                            <textarea
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                rows={3}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium resize-none"
                                placeholder="Cuéntanos por qué te interesa este cargo..."
                            />
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={legalAccepted}
                                onChange={(e) => setLegalAccepted(e.target.checked)}
                                className="h-5 w-5 mt-0.5 rounded-md border-slate-300 text-blue-600 focus:ring-4 focus:ring-blue-100 cursor-pointer shrink-0"
                            />
                            <span className="text-xs text-slate-500 leading-relaxed">
                                Autorizo a FIRPLAK S.A. el tratamiento de mis datos personales conforme a su Política de Protección de Datos, con fines del proceso de selección.
                            </span>
                        </label>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading || subiendoHojaVida}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar inscripción'}
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
