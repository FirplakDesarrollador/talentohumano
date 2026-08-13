'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowRight,
    CreditCard,
    ShieldCheck,
    Building,
    Briefcase,
    Landmark,
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Trash2,
} from 'lucide-react'

const DOCUMENT_TYPES = [
    { id: 'HOJA_VIDA', label: 'Hoja de Vida', sub: 'Con foto actualizada', required: true, icon: FileText },
    { id: 'CEDULA', label: 'Cédula de Ciudadanía', sub: 'Ampliada al 150%', required: true, icon: CreditCard },
    { id: 'POLICIA', label: 'Certificado Policía (DAS)', sub: 'www.policia.gov.co', required: true, icon: ShieldCheck },
    { id: 'PROCURADURIA', label: 'Certificado Buena Conducta', sub: 'www.procuraduria.gov.co', required: true, icon: ShieldCheck },
    { id: 'EPS', label: 'Certificado EPS', sub: 'Certificado de afiliación', required: true, icon: Building },
    { id: 'PENSION', label: 'Certificado Pensión', sub: 'Fondo de pensión', required: true, icon: Building },
    { id: 'CESANTIAS', label: 'Certificado Cesantías', sub: 'Fondo de cesantías', required: true, icon: Building },
    { id: 'LABORAL', label: 'Certificado Laboral', sub: 'Últimos 3 años', required: true, icon: Briefcase },
    { id: 'BANCO', label: 'Certificado Bancario', sub: 'Banco de Bogotá o Bancolombia', required: true, icon: Landmark },
    { id: 'BACHILLER', label: 'Acta de Grado Bachiller', sub: 'Opcional', required: false, icon: FileText },
    { id: 'SUPERIOR', label: 'Diplomas Educación Superior', sub: 'Técnica, Profesional o Cursos', required: false, icon: FileText },
    { id: 'MILITAR', label: 'Libreta Militar', sub: 'Opcional', required: false, icon: CreditCard },
]

type UploadedFile = { url: string; name: string }

export default function PostulacionPage() {
    const supabase = createClient()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [doc, setDoc] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')

    const [eps, setEps] = useState('')
    const [pension, setPension] = useState('')
    const [cesantias, setCesantias] = useState('')
    const [banco, setBanco] = useState('')
    const [cuenta, setCuenta] = useState('')

    const [legalAccepted, setLegalAccepted] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({})
    const [uploadingStatus, setUploadingStatus] = useState<Record<string, boolean>>({})
    const [finishedCandidate, setFinishedCandidate] = useState<{ id: string } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeUploadType, setActiveUploadType] = useState<string | null>(null)

    const goToStep = (nextStep: number) => {
        if (nextStep === 2) {
            if (!name || !doc || !phone || !email) {
                alert('Por favor completa todos los campos obligatorios del formulario.')
                return
            }
        }
        setStep(nextStep)
        window.scrollTo(0, 0)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeUploadType) return

        setUploadingStatus(prev => ({ ...prev, [activeUploadType]: true }))

        try {
            // Nombres reales de hojas de vida/cédulas suelen traer tildes, paréntesis,
            // "#", etc. que Supabase Storage rechaza como key. Se genera un nombre
            // aleatorio + extensión y el nombre original solo se guarda para mostrarlo.
            const fileExt = file.name.includes('.') ? file.name.split('.').pop() : ''
            const randomName = Math.random().toString(36).substring(2)
            const fileName = `${Date.now()}_${activeUploadType}_${randomName}${fileExt ? `.${fileExt}` : ''}`
            const { data, error } = await supabase.storage
                .from('expedientes-postulacion')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('expedientes-postulacion')
                .getPublicUrl(data.path)

            setUploadedFiles(prev => ({ ...prev, [activeUploadType]: { url: publicUrl, name: file.name } }))
        } catch (error: any) {
            console.error('Upload error:', error)
            const detail = error?.message || error?.error_description || error?.statusCode
            alert(`Error al subir el archivo${detail ? `: ${detail}` : ''}. Intenta de nuevo.`)
        } finally {
            setUploadingStatus(prev => ({ ...prev, [activeUploadType]: false }))
            setActiveUploadType(null)
        }
    }

    const triggerUpload = (typeId: string) => {
        setActiveUploadType(typeId)
        fileInputRef.current?.click()
    }

    const removeFile = (typeId: string) => {
        setUploadedFiles(prev => {
            const next = { ...prev }
            delete next[typeId]
            return next
        })
    }

    const handleFinalize = async () => {
        setLoading(true)
        try {
            const documentosJson = Object.keys(uploadedFiles).map(typeId => ({
                tipo: typeId,
                url: uploadedFiles[typeId].url,
            }))

            const { data, error } = await (supabase.rpc as any)('save_postulacion', {
                p_nombre_completo: name,
                p_cedula: doc,
                p_telefono: phone,
                p_email: email,
                p_eps: eps,
                p_pension: pension,
                p_cesantias: cesantias,
                p_banco: banco,
                p_cuenta_bancaria: cuenta,
                p_documentos: documentosJson,
            })

            if (error) throw error
            if (data && !data.success) throw new Error(data.error)

            setFinishedCandidate({ id: data.candidato_id })
            setStep(4)
        } catch (error: any) {
            console.error('Finalize error:', error)
            alert(`Error al guardar la postulación: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const mandatoryDocs = DOCUMENT_TYPES.filter(d => d.required)
    const areAllMandatoryUploaded = mandatoryDocs.every(d => uploadedFiles[d.id])

    return (
        <div className="bg-slate-50 text-slate-900 min-h-screen py-8 px-4 font-sans relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="max-w-xl mx-auto mb-8 text-center mt-4">
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200 border-2 border-white">
                        TH
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">Portal de Postulación</h1>
                <p className="text-slate-500 text-sm font-medium">Completa tu expediente digital para iniciar el proceso</p>

                <div className="flex justify-center mt-8 gap-3">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-2.5 w-20 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-slate-200'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="max-w-xl mx-auto pb-12">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Información de Contacto</h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">Ingresa tus datos reales para poder contactarte.</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                            placeholder="Ej: Camila Jimenez"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Número de Cédula</label>
                                        <input
                                            type="number"
                                            value={doc}
                                            onChange={(e) => setDoc(e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                            placeholder="Sin puntos"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                            placeholder="tu@email.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Celular / WhatsApp</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium"
                                            placeholder="300 123 4567"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Landmark size={18} className="text-blue-600" />
                                        Información Adicional (Afiliaciones)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">EPS</label>
                                            <input
                                                type="text"
                                                value={eps}
                                                onChange={(e) => setEps(e.target.value)}
                                                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm"
                                                placeholder="Ej: Sura, Sanitas..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fondo de Pensión</label>
                                            <input
                                                type="text"
                                                value={pension}
                                                onChange={(e) => setPension(e.target.value)}
                                                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm"
                                                placeholder="Ej: Colpensiones, Proteccion..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fondo de Cesantías</label>
                                            <input
                                                type="text"
                                                value={cesantias}
                                                onChange={(e) => setCesantias(e.target.value)}
                                                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm"
                                                placeholder="Ej: Porvenir, Proteccion..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Banco</label>
                                            <input
                                                type="text"
                                                value={banco}
                                                onChange={(e) => setBanco(e.target.value)}
                                                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm"
                                                placeholder="Banco de Bogotá / Bancolombia"
                                            />
                                        </div>
                                        <div className="col-span-full space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Número de Cuenta</label>
                                            <input
                                                type="text"
                                                value={cuenta}
                                                onChange={(e) => setCuenta(e.target.value)}
                                                className="w-full h-12 px-5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm"
                                                placeholder="Solo si cuentas con una de las anteriores"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={() => goToStep(2)}
                                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-blue-100"
                                >
                                    Siguiente: Autorización Legal
                                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Autorización de Datos</h2>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl text-sm text-slate-600 h-64 overflow-y-auto mb-6 border border-slate-100 leading-relaxed">
                                    <p className="mb-4 font-black text-slate-900 uppercase tracking-widest text-[10px]">Consentimiento Ley 1581 de 2012</p>
                                    <p className="mb-4">
                                        Yo, <span className="font-bold text-slate-900">{name || 'Candidato'}</span>, identificado con C.C. <span className="font-bold text-slate-900">{doc || '---'}</span>, autorizo de manera libre, voluntaria, previa, explícita, informada e inequívoca a la empresa para recolectar, almacenar, usar, circular, suprimir y en general, tratar mis datos personales para fines relacionados con el proceso de selección y contratación.
                                    </p>
                                    <p className="mb-4">
                                        Entiendo que la información suministrada será tratada bajo estrictas medidas de seguridad y confidencialidad. Tengo derecho a conocer, actualizar y rectificar mis datos personales en cualquier momento a través de los canales oficiales.
                                    </p>
                                    <p>
                                        Asimismo, autorizo el envío de notificaciones relacionadas con mi proceso de selección a través de mi correo electrónico y número de celular registrado.
                                    </p>
                                </div>

                                <div
                                    className={`flex items-start space-x-4 mb-8 p-4 rounded-2xl transition-all cursor-pointer border-2 ${legalAccepted ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:border-slate-100'}`}
                                    onClick={() => setLegalAccepted(!legalAccepted)}
                                >
                                    <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center ${legalAccepted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                                        {legalAccepted && <CheckCircle2 size={16} />}
                                    </div>
                                    <label className="text-sm font-bold leading-snug text-slate-700 cursor-pointer select-none">
                                        He leído, comprendo y acepto la política de tratamiento de datos personales de la empresa.
                                    </label>
                                </div>

                                <button
                                    disabled={!legalAccepted}
                                    onClick={() => goToStep(3)}
                                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-100"
                                >
                                    Confirmar y Continuar
                                </button>
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <button onClick={() => goToStep(1)} className="text-sm text-slate-400 font-bold hover:text-slate-800 underline underline-offset-4 decoration-2">Editar mis datos básicos</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-600">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Expediente Digital</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Sube tus documentos obligatorios</p>
                                </div>
                                <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-600 font-bold text-xs border border-blue-100">
                                    {Object.keys(uploadedFiles).length} / {DOCUMENT_TYPES.length} Subidos
                                </div>
                            </div>
                            <div className="p-8 space-y-4 max-h-[600px] overflow-y-auto pr-4">
                                {DOCUMENT_TYPES.map((type) => {
                                    const isUploaded = !!uploadedFiles[type.id]
                                    const isUploading = uploadingStatus[type.id]

                                    return (
                                        <div
                                            key={type.id}
                                            className={`group border-2 rounded-2xl p-5 transition-all ${isUploaded ? 'border-green-200 bg-green-50/30' : 'border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50/30'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl transition-colors ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                        <type.icon size={22} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-800 text-sm">{type.label}</h4>
                                                            {type.required && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Obligatorio</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-medium">{type.sub}</p>
                                                    </div>
                                                </div>

                                                {!isUploaded && !isUploading && (
                                                    <button
                                                        onClick={() => triggerUpload(type.id)}
                                                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                                    >
                                                        Subir
                                                    </button>
                                                )}

                                                {isUploading && (
                                                    <div className="flex items-center gap-2 text-blue-600 text-[11px] font-bold py-1 px-3 bg-blue-50 rounded-lg animate-pulse">
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Cargando...
                                                    </div>
                                                )}

                                                {isUploaded && (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 size={24} className="text-green-500" />
                                                        <button
                                                            onClick={() => removeFile(type.id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isUploaded && (
                                                <div className="mt-3 text-[10px] text-green-700 font-mono flex items-center gap-1.5 bg-green-100/50 p-2 rounded-lg">
                                                    <CheckCircle2 size={10} />
                                                    Archivo: {uploadedFiles[type.id].name.substring(0, 40)}{uploadedFiles[type.id].name.length > 40 ? '...' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-4">
                                {!areAllMandatoryUploaded && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                        <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                            Para finalizar, debes subir todos los documentos marcados como <span className="font-bold">Obligatorio</span>. Los opcionales puedes adjuntarlos después si lo deseas.
                                        </p>
                                    </div>
                                )}
                                <button
                                    disabled={!areAllMandatoryUploaded || loading}
                                    onClick={handleFinalize}
                                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-black text-lg rounded-2xl transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Procesando Postulación...
                                        </>
                                    ) : 'Finalizar y Enviar Postulación'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in zoom-in duration-700">
                        <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-100 border border-blue-50 p-12 text-center">
                            <div className="flex justify-center mb-8 relative">
                                <div className="absolute inset-0 bg-green-100 rounded-full scale-110 blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative p-6 bg-green-100 rounded-full text-green-600 animate-bounce">
                                    <CheckCircle2 size={64} />
                                </div>
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 mb-3 tracking-tighter">¡Registro Completado!</h2>
                            <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                                Tu postulación ha sido enviada con éxito. El equipo de Talento Humano revisará tus documentos y te contactará pronto.
                            </p>
                            <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100 mb-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resumen del Proceso</p>
                                <p className="mb-1 text-slate-800 font-bold tracking-tight">Candidato: <span className="text-blue-600 ml-1">{name}</span></p>
                                <p className="text-slate-800 font-bold tracking-tight">ID Proceso: <span className="text-blue-600 ml-1 font-mono uppercase">{finishedCandidate?.id?.split('-')[0]}</span></p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-sm text-slate-400 hover:text-blue-600 font-black uppercase tracking-widest transition-colors"
                            >
                                Iniciar nueva postulación
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-xl mx-auto mt-4 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Firplak — Talento Humano
            </div>
        </div>
    )
}
