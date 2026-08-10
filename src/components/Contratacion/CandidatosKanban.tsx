'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, Sparkles, X, Check, CreditCard, FileText, Loader2, Phone, Mail, Landmark, RefreshCcw, ArrowRight, Ban } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

interface Documento {
    tipo: string
    url: string
    created_at?: string
}

interface Candidato {
    id: string
    nombre_completo: string
    cedula: string
    telefono: string
    email: string
    estado: string
    eps: string
    pension: string
    cesantias: string
    banco: string
    cuenta_bancaria: string
    documentos: Documento[] | null
}

export function CandidatosKanban() {
    const supabase = createClient()
    const [candidates, setCandidates] = useState<Candidato[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCandidate, setSelectedCandidate] = useState<Candidato | null>(null)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [pendingCancel, setPendingCancel] = useState<Candidato | null>(null)

    // Al pasar a "Listos para Contratar", verifica si ya existe un registro
    // en empleados para esa cedula (empleados.id ES la cedula en esta app) y,
    // si no existe, lo crea con lo poco que sabemos del candidato. El resto
    // de campos (cargo, planta, area, nivelCargo...) quedan pendientes para
    // que Talento Humano los complete en Gestor de Personal.
    const ensureEmpleadoExiste = async (candidate: Candidato) => {
        const cedulaNum = Number(candidate.cedula)
        if (!Number.isFinite(cedulaNum) || cedulaNum <= 0) {
            toast.warning('No se pudo vincular con Empleados: la cédula del candidato no es un número válido')
            return
        }

        const { data: existente, error: buscarErr } = await supabase
            .from('empleados')
            .select('id')
            .eq('id', cedulaNum)
            .maybeSingle()

        if (buscarErr) {
            console.error('Error verificando si el empleado ya existe:', buscarErr)
            toast.error('No se pudo verificar si el empleado ya existe')
            return
        }

        if (existente) {
            toast.info('Este candidato ya tiene un registro en Empleados')
            return
        }

        const { error: insertErr } = await (supabase.from('empleados') as any)
            .insert({
                id: cedulaNum,
                nombreCompleto: candidate.nombre_completo,
                correo_electronico: candidate.email || null,
                telefono: candidate.telefono || null,
                empresa: 'Firplak',
                activo: true,
            })

        if (insertErr) {
            console.error('Error creando el empleado:', insertErr)
            toast.error('No se pudo crear el registro en Empleados')
            return
        }

        toast.success('Empleado creado en el maestro de Empleados (completa cargo/planta en Gestor de Personal)')
    }

    const handleUpdateEstado = async (candidate: Candidato, nuevoEstado: string) => {
        setUpdatingId(candidate.id)
        try {
            const { data, error } = await (supabase.rpc as any)('update_candidate_status', {
                p_candidato_id: candidate.id,
                p_nuevo_estado: nuevoEstado,
            })
            if (error) throw error
            if (data && !data.success) throw new Error(data.error)

            if (nuevoEstado === 'APROBADO') {
                await ensureEmpleadoExiste(candidate)
            }

            await fetchCandidates()
            toast.success('Estado actualizado')
        } catch (err: any) {
            console.error('Error updating candidate status:', err)
            toast.error('No se pudo actualizar el estado')
        } finally {
            setUpdatingId(null)
        }
    }

    const fetchCandidates = async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase.rpc as any)('get_candidates_with_docs')
            if (error) throw error
            setCandidates(data || [])
        } catch (err) {
            console.error('Error fetching candidates:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCandidates()
    }, [])

    const filteredCandidates = candidates.filter(c =>
        c.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cedula?.includes(searchTerm)
    )

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center py-24">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
        )
    }

    const columns = [
        { estado: 'NUEVO', label: 'Nuevos Inscritos', dot: 'bg-blue-500' },
        { estado: 'REVISION', label: 'En Verificación', dot: 'bg-amber-500' },
        { estado: 'APROBADO', label: 'Listos para Contratar', dot: 'bg-emerald-500' },
        { estado: 'CANCELADO', label: 'Proceso Cancelado', dot: 'bg-rose-500' },
    ]

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative group w-full sm:w-96">
                    <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 h-12 bg-white border border-slate-200 rounded-2xl text-sm w-full focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-700 outline-none shadow-sm transition-all font-medium"
                    />
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchCandidates}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                        title="Refrescar"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2">
                        <Users size={18} />
                        {candidates.length} Registrados
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-6 select-none">
                <div className="flex gap-8 h-full min-w-[1100px]">
                    {columns.map(col => (
                        <div key={col.estado} className="w-[350px] flex-shrink-0 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-5 px-3">
                                <div className="flex items-center gap-2.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                                    <h2 className="font-bold text-slate-700 tracking-tight">{col.label}</h2>
                                </div>
                                <span className="bg-slate-200/50 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                                    {filteredCandidates.filter(c => c.estado === col.estado).length}
                                </span>
                            </div>
                            <div className="flex-1 bg-slate-100/40 rounded-[24px] p-4 space-y-4 overflow-y-auto border border-slate-200/50">
                                {filteredCandidates.filter(c => c.estado === col.estado).map(candidate => (
                                    <CandidateCard
                                        key={candidate.id}
                                        candidate={candidate}
                                        onClick={() => setSelectedCandidate(candidate)}
                                        updating={updatingId === candidate.id}
                                        onAvanzar={col.estado === 'NUEVO' ? () => handleUpdateEstado(candidate, 'REVISION') : undefined}
                                        onAprobar={col.estado === 'REVISION' ? () => handleUpdateEstado(candidate, 'APROBADO') : undefined}
                                        onCancelar={col.estado === 'REVISION' ? () => setPendingCancel(candidate) : undefined}
                                    />
                                ))}
                                {filteredCandidates.filter(c => c.estado === col.estado).length === 0 && <EmptyColumn />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCandidate && (
                <CandidateDetailModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
            )}

            <ConfirmDialog
                isOpen={!!pendingCancel}
                variant="danger"
                title="¿Cancelar este proceso?"
                description={pendingCancel ? `Se moverá a "${pendingCancel.nombre_completo}" a Proceso Cancelado.` : ''}
                confirmLabel="Cancelar proceso"
                cancelLabel="Volver"
                onConfirm={() => {
                    if (pendingCancel) handleUpdateEstado(pendingCancel, 'CANCELADO')
                    setPendingCancel(null)
                }}
                onCancel={() => setPendingCancel(null)}
            />
        </div>
    )
}

function CandidateCard({ candidate, onClick, updating, onAvanzar, onAprobar, onCancelar }: {
    candidate: Candidato
    onClick: () => void
    updating?: boolean
    onAvanzar?: () => void
    onAprobar?: () => void
    onCancelar?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all group animate-in fade-in zoom-in-95"
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-2 py-1 rounded uppercase tracking-widest">Postulación Online</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">{candidate.nombre_completo}</h3>
            <p className="text-xs text-slate-400 font-bold tracking-tight">C.C. {candidate.cedula}</p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{candidate.documentos?.length || 0} Documentos</span>
                </div>
            </div>

            {(onAvanzar || onAprobar || onCancelar) && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {updating ? (
                        <div className="flex-1 flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <>
                            {onAvanzar && (
                                <button
                                    onClick={onAvanzar}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all"
                                >
                                    En Verificación <ArrowRight className="h-3 w-3" />
                                </button>
                            )}
                            {onAprobar && (
                                <button
                                    onClick={onAprobar}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all"
                                >
                                    Continuar <ArrowRight className="h-3 w-3" />
                                </button>
                            )}
                            {onCancelar && (
                                <button
                                    onClick={onCancelar}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all"
                                    title="Cancelar proceso"
                                >
                                    <Ban className="h-3 w-3" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function EmptyColumn() {
    return (
        <div className="bg-white/50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center opacity-40">
            <Sparkles size={24} className="text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-400 text-xs tracking-tight">Sin candidatos en esta etapa</h3>
        </div>
    )
}

function CandidateDetailModal({ candidate, onClose }: { candidate: Candidato; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
                <div className="w-80 bg-slate-50/50 p-10 border-r border-slate-100 flex flex-col overflow-y-auto">
                    <div className="mb-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl mx-auto mb-6 shadow-xl shadow-blue-100 border-4 border-white">
                            {candidate.nombre_completo?.substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{candidate.nombre_completo}</h2>
                        <div className="mt-4 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block border border-green-100">
                            Expediente Electrónico
                        </div>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="space-y-4">
                            <DetailItem icon={CreditCard} label="Documento" value={candidate.cedula} />
                            <DetailItem icon={Phone} label="Teléfono" value={candidate.telefono} />
                            <DetailItem icon={Mail} label="Correo" value={candidate.email} />
                            <DetailItem icon={Landmark} label="Cuenta Banco" value={`${candidate.banco || 'N/A'} - ${candidate.cuenta_bancaria || 'No Registra'}`} />
                        </div>

                        <div className="pt-8 border-t border-slate-200">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Política de Datos</label>
                            <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold p-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                                <Check size={14} /> Consentimiento Firmado Digitalmente
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-10 flex flex-col bg-white overflow-hidden relative">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <FileText size={24} className="text-blue-600" />
                            <h3 className="font-extrabold text-2xl text-slate-800 tracking-tighter">Documentación Cargada</h3>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-3">
                        {candidate.documentos?.map((doc, idx) => (
                            <div key={idx} className="group border-2 border-slate-50 rounded-[20px] p-6 hover:bg-slate-50 hover:border-blue-100 transition-all flex justify-between items-center bg-white shadow-sm hover:shadow-lg">
                                <div className="flex items-center gap-5">
                                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-sm tracking-tight">{doc.tipo.replace(/_/g, ' ')}</h4>
                                        {doc.created_at && (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cargado el {new Date(doc.created_at).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                >
                                    Ver Original
                                </a>
                            </div>
                        ))}
                        {(!candidate.documentos || candidate.documentos.length === 0) && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-20">
                                <FileText size={48} className="mb-4" />
                                <p className="font-bold">No hay documentos cargados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex gap-4 items-start">
            <div className="p-2.5 bg-white rounded-xl text-slate-400 shadow-sm border border-slate-100">
                <Icon size={18} />
            </div>
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{label}</label>
                <p className="text-sm font-bold text-slate-800 break-all">{value}</p>
            </div>
        </div>
    )
}
