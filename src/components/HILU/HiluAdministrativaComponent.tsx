'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS, ADMIN_LEVELS, RESTRICTED_SUPERVISORS, COORDINADORES_CON_ACCESO, DIRECTORES_CON_ACCESO, JEFES_CON_ACCESO, HILU_ADMIN_EDIT_OVERRIDES } from '@/lib/constants/roles'
import { ChevronDown, Calendar, CheckCircle2, Circle, Save, Star, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CrearFirma, VerFirma } from './FirmaComponents'
import { EvidenciasComponent } from './EvidenciasComponent'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Datos legados guardaron el texto literal "true"/"false" en los campos de firma
// en vez de un booleano real o una firma dibujada (data URI). Como "false" es un
// string truthy en JS, hay que interpretarlo explícitamente en vez de usar el valor crudo.
// Una firma eliminada se guarda como '' (string vacío), que tampoco cuenta como firmado.
const isFirmado = (value?: string | boolean | null) => value === true || (typeof value === 'string' && value !== 'false' && value !== '')

interface HiluAdminRow {
    id: number;
    empleado_id: number;
    cargo: string;

    // FASE H
    fh_induccion_th: boolean;
    fh_induccion_sst: boolean;
    fh_presentacion_area: boolean;
    fh_explicacion_cargo: boolean;
    fh_comentarios: string | null;
    fh_firma_empleado: string | boolean | null;
    fh_firma_jefe: string | boolean | null;
    fh_completado: boolean;
    fh_fecha_finalizacion: string | null;

    // FASE I
    fi_capacitacion_funciones: boolean;
    fi_capacitacion_procesos: boolean;
    fi_capacitacion_herramientas: boolean;
    fi_acompanamiento_practico: boolean;
    fi_comentarios: string | null;
    fi_eval_actitud: number | null;
    fi_eval_adaptacion: number | null;
    fi_eval_aprendizaje: number | null;
    fi_eval_conocimiento: number | null;
    fi_completado: boolean;
    fi_fecha_finalizacion: string | null;
    fi_plan_entrenamiento?: string[];
    fi_link_excel?: string | null;
    fi_firma_empleado: string | boolean | null;
    fi_firma_jefe: string | boolean | null;

    // FASE L
    fl_desempena_autonomia: boolean;
    fl_cumple_responsabilidades: boolean;
    fl_aplica_procedimientos: boolean;
    fl_ejecuta_sin_acompanamiento: boolean;
    fl_cumple_resultados: boolean;
    fl_comentarios: string | null;
    fl_firma_empleado: string | boolean | null;
    fl_firma_jefe: string | boolean | null;
    fl_completado: boolean;
    fl_fecha_finalizacion: string | null;
}

interface Props {
    empleado: any;
    hiluData: HiluAdminRow;
    currentUser: any;
    onUpdate: () => void;
}

const PillCheckbox = ({ id, checked, onChange, label, disabled }: { id: string, checked: boolean, onChange: (c: boolean) => void, label: string, disabled?: boolean }) => (
    <div
        onClick={() => !disabled && onChange(!checked)}
        className={`
            flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer'}
            ${!disabled && checked ? 'bg-white border-blue-200' : !disabled ? 'bg-white border-gray-200 hover:border-blue-300' : ''}
        `}
    >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {checked ? (
            <CheckCircle2 className={`h-6 w-6 ${disabled ? 'text-gray-400' : 'text-[#1e2f3d]'}`} fill={disabled ? '#9ca3af' : '#1e2f3d'} color="white" />
        ) : (
            <Circle className="h-6 w-6 text-gray-300" />
        )}
    </div>
)

const StarRating = ({ value, onChange, label, disabled }: { value: number, onChange?: (v: number) => void, label: string, disabled?: boolean }) => {
    const stars = [1, 2, 3, 4, 5] // Administrativa 1 to 5 scale? The user's prompt had 3 stars visually but usually 1-5
    return (
        <div className="flex flex-col gap-1 p-3 bg-white rounded-lg border border-gray-100 shadow-sm h-full">
            <span className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                {label}
                <span className="text-blue-600 font-bold">{value > 0 ? `${value}/5` : ''}</span>
            </span>
            <div className="flex gap-1 justify-center mt-auto">
                {stars.map((s) => (
                    <button
                        key={s}
                        disabled={disabled}
                        type="button"
                        onClick={() => onChange?.(s)}
                        className={`focus:outline-none transition-all ${!disabled && onChange ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                    >
                        <Star
                            className={`h-6 w-6 ${s <= value ? 'text-blue-600 fill-blue-600' : 'text-gray-300'}`}
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}

const SignatureWidget = ({
    label,
    value,
    onSave,
    date
}: {
    label: string,
    value?: string | boolean | null,
    onSave: (firma: string) => void,
    date?: string | null
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [pendingEdit, setPendingEdit] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(false)

    // Solo un string distinto de "true"/"false" es una firma dibujada real (data URI).
    const isRealSignature = typeof value === 'string' && value !== 'true' && value !== 'false';
    const isSigned = isFirmado(value);
    const showForm = !isSigned || isEditing;

    return (
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[220px] transition-all hover:border-blue-200 hover:shadow-md">
            <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isSigned ? 'bg-green-500' : 'bg-blue-400 animate-pulse'}`}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                </div>
                {isSigned && !isEditing && (
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">√ FIRMADO</span>
                            {date && <span className="text-[8px] text-gray-400 mt-0.5">{new Date(date).toLocaleDateString()}</span>}
                        </div>
                        <button
                            type="button"
                            onClick={() => setPendingEdit(true)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar firma"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPendingDelete(true)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar firma"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-grow p-4 flex flex-col justify-center items-center bg-white relative">
                <div className="w-full">
                    {showForm ? (
                        <CrearFirma
                            onFirmaGuardada={(firma) => { onSave(firma); setIsEditing(false) }}
                            onCancel={isSigned ? () => setIsEditing(false) : undefined}
                        />
                    ) : isRealSignature ? (
                        <VerFirma firmaUrl={value as string} />
                    ) : (
                        <div className="text-green-600 font-bold text-center">Firma Electrónica Confirmada</div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={pendingEdit}
                variant="warning"
                title="¿Editar esta firma?"
                description="La firma actual se reemplazará cuando guardes la nueva. Esta acción no se puede deshacer."
                confirmLabel="Editar"
                cancelLabel="Cancelar"
                onConfirm={() => { setIsEditing(true); setPendingEdit(false) }}
                onCancel={() => setPendingEdit(false)}
            />

            <ConfirmDialog
                isOpen={pendingDelete}
                variant="danger"
                title="¿Eliminar esta firma?"
                description="Se eliminará la firma guardada. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { onSave(''); setPendingDelete(false) }}
                onCancel={() => setPendingDelete(false)}
            />
        </div>
    )
}

const PhaseHeader = ({ title, progress, isOpen, onClick }: { title: string, progress: number, isOpen: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full bg-[#374151] text-white px-6 py-4 flex items-center justify-between cursor-pointer rounded-t-lg"
    >
        <h3 className="font-medium text-lg">{title}</h3>

        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
            <div className="h-6 w-full bg-gray-600 rounded-full overflow-hidden relative">
                <div
                    className="h-full bg-white transition-all duration-500 flex items-center justify-center text-[#374151] font-bold text-xs"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                >
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md mix-blend-difference">
                    [{progress}%]
                </div>
            </div>
        </div>

        <div className="bg-white rounded-full p-1">
            <ChevronDown className={`h-4 w-4 text-gray-800 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
    </div>
)

export function HiluAdministrativaComponent({ empleado, hiluData, currentUser, onUpdate }: Props) {
    const supabase = createClient()
    const [openPhase, setOpenPhase] = useState<'H' | 'I' | 'L' | null>('H')
    const [localData, setLocalData] = useState<HiluAdminRow>(hiluData)
    const [confirmDeleteLink, setConfirmDeleteLink] = useState(false)
    // Estado independiente para el link de Excel - solo cambia por acciones explícitas
    const [linkedExcelUrl, setLinkedExcelUrl] = useState<string | null>(hiluData.fi_link_excel || null)
    const [tempLink, setTempLink] = useState('')
    const [isLinkSaving, setIsLinkSaving] = useState(false)

    useEffect(() => {
        setLocalData(hiluData)
        // Solo sincronizar el URL si cambia desde afuera (ej: primera carga)
        // NO sobreescribir si el usuario ya vinculó algo en esta sesión
    }, [hiluData])

    const canEdit = () => {
        if (!currentUser) return false
        const email = currentUser.email || ''
        const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(currentUser.nivelCargo || '')
        if (isAdmin) return true
        // Scoped override: user allowed to edit only this specific employee's record
        if (HILU_ADMIN_EDIT_OVERRIDES[email]?.includes(hiluData.empleado_id)) return true
        // Same permissions as HILU Operativa
        if (
            email === 'hector.chinchilla@firplak.com' ||
            email === 'estiven.londono@firplak.com' ||
            email === 'coordinacioncalidad@firplak.com' ||
            email === 'david.ramirez@firplak.com' ||
            email === 'jakeline.chaverra@firplak.com' ||
            email === 'maria.perez@firplak.com' ||
            email === 'juliana.ramirez@firplak.com' ||
            email === 'sara.aguilar@firplak.com' ||
            email === 'analistaabastecimiento@firplak.com' ||
            RESTRICTED_SUPERVISORS.includes(email) ||
            COORDINADORES_CON_ACCESO.includes(email) ||
            DIRECTORES_CON_ACCESO.includes(email) ||
            JEFES_CON_ACCESO.includes(email)
        ) return true
        return ['Jefe', 'Director', 'Gerente', 'Coordinador'].includes(currentUser.nivelCargo)
    }

    const updateDB = async (payload: Partial<HiluAdminRow>) => {
        try {
            const { error } = await (supabase as any)
                .from('hilu_administrativa')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', hiluData.id)

            if (error) throw error
            onUpdate()
            toast.success('Cambios guardados')
        } catch (error: any) {
            console.error(error)
            toast.error('Error al guardar: ' + error.message)
        }
    }

    const checkPhaseH = async (data: HiluAdminRow) => {
        const isDone = data.fh_induccion_th && data.fh_induccion_sst && data.fh_presentacion_area && data.fh_explicacion_cargo && isFirmado(data.fh_firma_empleado) && isFirmado(data.fh_firma_jefe)
        const hasComment = !!(data.fh_comentarios?.trim())

        if (isDone && hasComment && !data.fh_completado) {
            await updateDB({ fh_completado: true, fh_fecha_finalizacion: new Date().toISOString() })
            alert('¡Fase H completada!')
        } else if (isDone && !hasComment && !data.fh_completado) {
            toast.warning('Falta agregar comentarios en la Fase H')
        }
    }

    const checkPhaseI = async (data: HiluAdminRow) => {
        const isDone = data.fi_capacitacion_funciones && data.fi_capacitacion_procesos && data.fi_capacitacion_herramientas && data.fi_acompanamiento_practico &&
            data.fi_eval_actitud && data.fi_eval_adaptacion && data.fi_eval_aprendizaje && data.fi_eval_conocimiento && isFirmado(data.fi_firma_empleado) && isFirmado(data.fi_firma_jefe)
        const hasComment = !!(data.fi_comentarios?.trim())

        if (isDone && hasComment && !data.fi_completado) {
            await updateDB({ fi_completado: true, fi_fecha_finalizacion: new Date().toISOString() })
            alert('¡Fase I completada!')
        } else if (isDone && !hasComment && !data.fi_completado) {
            toast.warning('Falta agregar comentarios en la Fase I')
        }
    }

    const checkPhaseL = async (data: HiluAdminRow) => {
        const isDone = data.fl_desempena_autonomia && data.fl_cumple_responsabilidades && data.fl_aplica_procedimientos && data.fl_ejecuta_sin_acompanamiento && data.fl_cumple_resultados && isFirmado(data.fl_firma_empleado) && isFirmado(data.fl_firma_jefe)
        const hasComment = !!(data.fl_comentarios?.trim())

        if (isDone && hasComment && !data.fl_completado) {
            await updateDB({ fl_completado: true, fl_fecha_finalizacion: new Date().toISOString() })
            alert('¡Fase L completada!')
        } else if (isDone && !hasComment && !data.fl_completado) {
            toast.warning('Falta agregar comentarios en la Fase L')
        }
    }

    const renderFaseH = () => {
        const checks = [localData.fh_induccion_th, localData.fh_induccion_sst, localData.fh_presentacion_area, localData.fh_explicacion_cargo]
        const progress = Math.round((checks.filter(Boolean).length / 4) * 100)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa]">
                <PhaseHeader title="Etapa H – Inducción e incorporación" progress={progress} isOpen={openPhase === 'H'} onClick={() => setOpenPhase(openPhase === 'H' ? null : 'H')} />
                {openPhase === 'H' && (
                    <CardContent className={`p-6 space-y-6 bg-[#f8f9fa] ${!canEdit() ? 'opacity-70 pointer-events-none' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PillCheckbox id="fh_induccion_th" label="Inducción Talento y Cultura" checked={localData.fh_induccion_th} onChange={(c) => setLocalData({ ...localData, fh_induccion_th: c })} />
                            <PillCheckbox id="fh_induccion_sst" label="Inducción SST" checked={localData.fh_induccion_sst} onChange={(c) => setLocalData({ ...localData, fh_induccion_sst: c })} />
                            <PillCheckbox id="fh_presentacion_area" label="Presentación del área y estructura organizacional" checked={localData.fh_presentacion_area} onChange={(c) => setLocalData({ ...localData, fh_presentacion_area: c })} />
                            <PillCheckbox id="fh_explicacion_cargo" label="Explicación general del cargo y propósito del área" checked={localData.fh_explicacion_cargo} onChange={(c) => setLocalData({ ...localData, fh_explicacion_cargo: c })} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-12 space-y-2">
                                <Label className="text-gray-500">Comentarios <span className="text-red-500">*</span></Label>
                                <textarea
                                    className="w-full h-[100px] p-3 rounded-md border border-gray-200 resize-none text-sm"
                                    defaultValue={localData.fh_comentarios || ''}
                                    onBlur={(e) => setLocalData({ ...localData, fh_comentarios: e.target.value })}
                                />
                            </div>

                            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <SignatureWidget
                                    label="Firma Empleado"
                                    value={localData.fh_firma_empleado}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fh_firma_empleado: firma };
                                        setLocalData(next);
                                        await updateDB({ fh_firma_empleado: firma } as any);
                                    }}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fh_firma_jefe}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fh_firma_jefe: firma };
                                        setLocalData(next);
                                        await updateDB({ fh_firma_jefe: firma } as any);
                                    }}
                                />
                            </div>

                            <div className="lg:col-span-12 flex justify-end mt-4">
                                <Button
                                    className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white px-8"
                                    onClick={async () => {
                                        await updateDB(localData)
                                        checkPhaseH(localData)
                                    }}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Etapa H
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseI = () => {
        const checks = [localData.fi_capacitacion_funciones, localData.fi_capacitacion_procesos, localData.fi_capacitacion_herramientas, localData.fi_acompanamiento_practico]
        const progress = Math.round((checks.filter(Boolean).length / 4) * 100)

        const faseHComplete = !!localData.fh_completado;

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa I – Entrenamiento y Capacitación" progress={progress} isOpen={openPhase === 'I'} onClick={() => setOpenPhase(openPhase === 'I' ? null : 'I')} />
                {openPhase === 'I' && (
                    <CardContent className={`p-6 space-y-6 bg-[#f8f9fa] ${(!faseHComplete || !canEdit()) ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PillCheckbox id="fi_capacitacion_funciones" label="Capacitación en funciones, actividades y responsabilidades del cargo" checked={localData.fi_capacitacion_funciones} onChange={(c) => setLocalData({ ...localData, fi_capacitacion_funciones: c })} />
                            <PillCheckbox id="fi_capacitacion_procesos" label="Capacitación en procesos y procedimientos aplicables al cargo" checked={localData.fi_capacitacion_procesos} onChange={(c) => setLocalData({ ...localData, fi_capacitacion_procesos: c })} />
                            <PillCheckbox id="fi_capacitacion_herramientas" label="Capacitación en herramientas, sistemas y formatos requeridos en el cargo" checked={localData.fi_capacitacion_herramientas} onChange={(c) => setLocalData({ ...localData, fi_capacitacion_herramientas: c })} />
                            <PillCheckbox id="fi_acompanamiento_practico" label="Acompañamiento práctico y guiado de actividades asignadas" checked={localData.fi_acompanamiento_practico} onChange={(c) => setLocalData({ ...localData, fi_acompanamiento_practico: c })} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                            <StarRating label="Actitud" value={localData.fi_eval_actitud || 0} onChange={(v) => setLocalData({ ...localData, fi_eval_actitud: v })} />
                            <StarRating label="Adaptación" value={localData.fi_eval_adaptacion || 0} onChange={(v) => setLocalData({ ...localData, fi_eval_adaptacion: v })} />
                            <StarRating label="Aprendizaje" value={localData.fi_eval_aprendizaje || 0} onChange={(v) => setLocalData({ ...localData, fi_eval_aprendizaje: v })} />
                            <StarRating label="Conocimiento" value={localData.fi_eval_conocimiento || 0} onChange={(v) => setLocalData({ ...localData, fi_eval_conocimiento: v })} />
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-6">
                            <div>
                                <Label className="text-gray-600 font-bold mb-2 flex items-center gap-2">
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Excel</span>
                                    Plan de Entrenamiento del perfil de cargo (SharePoint)
                                </Label>

                                {linkedExcelUrl ? (
                                    <div className="relative group overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-all p-5">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#107c41]"></div>
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="bg-[#107c41]/10 p-3.5 rounded-xl shadow-inner flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#107c41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M15 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"></path><path d="M9 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"></path><path d="M13 18l-4-5"></path><path d="M9 13l4 5"></path><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2z"></path></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-base font-black text-gray-800 truncate">Plan de Entrenamiento.xlsx</h4>
                                                    <p className="text-xs text-gray-500 font-medium">Sincronizado vía SharePoint</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                                <Button 
                                                    onClick={() => window.open(linkedExcelUrl, '_blank')}
                                                    className="w-full md:w-auto bg-[#107c41] hover:bg-[#0c5c30] text-white shadow-lg shadow-green-900/20 rounded-xl px-6 h-11 font-bold transition-all hover:scale-105 active:scale-95"
                                                    type="button"
                                                >
                                                    Abrir Documento
                                                </Button>
                                                {canEdit() && (
                                                    <Button 
                                                        onClick={() => setConfirmDeleteLink(true)}
                                                        variant="ghost" 
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-11 w-11 p-0 rounded-xl transition-colors flex-shrink-0"
                                                        title="Eliminar documento"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                </div>
                                                <input 
                                                    type="text"
                                                    placeholder="Pega aquí el link de SharePoint (https://firplak.sharepoint.com/...)" 
                                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#107c41] focus:border-[#107c41] outline-none transition-all shadow-sm"
                                                    value={tempLink}
                                                    onChange={(e) => setTempLink(e.target.value)}
                                                    disabled={!canEdit() || isLinkSaving}
                                                />
                                            </div>
                                            {canEdit() && (
                                                <Button 
                                                    onClick={async () => {
                                                        const url = tempLink.trim()
                                                        if (!url) {
                                                            toast.error("Pega un link primero")
                                                            return
                                                        }
                                                        setIsLinkSaving(true)
                                                        try {
                                                            const { error } = await (supabase as any)
                                                                .from('hilu_administrativa')
                                                                .update({ fi_link_excel: url, updated_at: new Date().toISOString() })
                                                                .eq('id', hiluData.id)
                                                            if (error) {
                                                                toast.error('Error al vincular: ' + error.message)
                                                                console.error(error)
                                                            } else {
                                                                setLinkedExcelUrl(url)
                                                                setTempLink('')
                                                                toast.success('Documento vinculado correctamente ✅')
                                                            }
                                                        } finally {
                                                            setIsLinkSaving(false)
                                                        }
                                                    }}
                                                    disabled={isLinkSaving}
                                                    className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white shadow-md rounded-xl h-[50px] px-8 flex-shrink-0 font-bold tracking-wide disabled:opacity-60"
                                                    type="button"
                                                >
                                                    {isLinkSaving ? (
                                                        <span className="flex items-center gap-2">
                                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                                            Guardando...
                                                        </span>
                                                    ) : 'Vincular Archivo'}
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 pl-1 font-medium mt-1">El archivo quedará vinculado permanentemente a este empleado. Podrás abrirlo en cualquier momento.</p>
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <Label className="text-gray-600 font-bold mb-2 block">Otros Anexos / Evidencias</Label>
                                <EvidenciasComponent
                                    evidencias={localData.fi_plan_entrenamiento || []}
                                    onEvidenciasChange={async (evs) => {
                                        const updated = { ...localData, fi_plan_entrenamiento: evs }
                                        setLocalData(updated)
                                        await updateDB({ fi_plan_entrenamiento: evs })
                                    }}
                                    path={`hilu-admin/${localData.id}/plan`}
                                    readOnly={!canEdit()}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-12 space-y-2">
                                <Label className="text-gray-500">Comentarios <span className="text-red-500">*</span></Label>
                                <textarea
                                    className="w-full h-[100px] p-3 rounded-md border border-gray-200 resize-none text-sm"
                                    placeholder="Comentarios con el registro del plan de entrenamiento y temas abordados del perfil de cargo..."
                                    defaultValue={localData.fi_comentarios || ''}
                                    onBlur={(e) => setLocalData({ ...localData, fi_comentarios: e.target.value })}
                                />
                            </div>

                            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <SignatureWidget
                                    label="Firma Empleado"
                                    value={localData.fi_firma_empleado}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fi_firma_empleado: firma };
                                        setLocalData(next);
                                        await updateDB({ fi_firma_empleado: firma } as any);
                                    }}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fi_firma_jefe}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fi_firma_jefe: firma };
                                        setLocalData(next);
                                        await updateDB({ fi_firma_jefe: firma } as any);
                                    }}
                                />
                            </div>

                            <div className="lg:col-span-12 flex justify-end mt-4">
                                <Button
                                    className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white px-8"
                                    onClick={async () => {
                                        await updateDB(localData)
                                        checkPhaseI(localData)
                                    }}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Etapa I
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseL = () => {
        const checks = [localData.fl_desempena_autonomia, localData.fl_cumple_responsabilidades, localData.fl_aplica_procedimientos, localData.fl_ejecuta_sin_acompanamiento, localData.fl_cumple_resultados]
        const progress = Math.round((checks.filter(Boolean).length / 5) * 100)

        const faseIComplete = !!localData.fi_completado;

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa L – Validación en el cargo" progress={progress} isOpen={openPhase === 'L'} onClick={() => setOpenPhase(openPhase === 'L' ? null : 'L')} />
                {openPhase === 'L' && (
                    <CardContent className={`p-6 space-y-6 bg-[#f8f9fa] ${(!faseIComplete || !canEdit()) ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <PillCheckbox id="fl_desempena_autonomia" label="Desempeña sus funciones con autonomía y apropiación del rol" checked={localData.fl_desempena_autonomia} onChange={(c) => setLocalData({ ...localData, fl_desempena_autonomia: c })} />
                            <PillCheckbox id="fl_cumple_responsabilidades" label="Cumple con las responsabilidades asignadas" checked={localData.fl_cumple_responsabilidades} onChange={(c) => setLocalData({ ...localData, fl_cumple_responsabilidades: c })} />
                            <PillCheckbox id="fl_aplica_procedimientos" label="Aplica correctamente los procedimientos y lineamientos definidos para el cargo" checked={localData.fl_aplica_procedimientos} onChange={(c) => setLocalData({ ...localData, fl_aplica_procedimientos: c })} />
                            <PillCheckbox id="fl_ejecuta_sin_acompanamiento" label="Ejecuta las funciones asignadas sin acompañamiento frecuente" checked={localData.fl_ejecuta_sin_acompanamiento} onChange={(c) => setLocalData({ ...localData, fl_ejecuta_sin_acompanamiento: c })} />
                            <PillCheckbox id="fl_cumple_resultados" label="Cumple con los resultados esperados y acordados en el perfil de cargo" checked={localData.fl_cumple_resultados} onChange={(c) => setLocalData({ ...localData, fl_cumple_resultados: c })} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-12 space-y-2">
                                <Label className="text-gray-500">Comentarios <span className="text-red-500">*</span></Label>
                                <textarea
                                    className="w-full h-[100px] p-3 rounded-md border border-gray-200 resize-none text-sm"
                                    defaultValue={localData.fl_comentarios || ''}
                                    onBlur={(e) => setLocalData({ ...localData, fl_comentarios: e.target.value })}
                                />
                            </div>

                            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <SignatureWidget
                                    label="Firma Empleado en formación"
                                    value={localData.fl_firma_empleado}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fl_firma_empleado: firma };
                                        setLocalData(next);
                                        await updateDB({ fl_firma_empleado: firma } as any);
                                    }}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fl_firma_jefe}
                                    onSave={async (firma) => {
                                        const next = { ...localData, fl_firma_jefe: firma };
                                        setLocalData(next);
                                        await updateDB({ fl_firma_jefe: firma } as any);
                                    }}
                                />
                            </div>

                            <div className="lg:col-span-12 flex justify-end mt-4">
                                <Button
                                    className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white px-8"
                                    onClick={async () => {
                                        await updateDB(localData)
                                        checkPhaseL(localData)
                                    }}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Etapa L
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <ConfirmDialog
                isOpen={confirmDeleteLink}
                title="Eliminar documento"
                description="¿Estás seguro de que deseas desvincular este documento de Excel? Esta acción es permanente y no se puede deshacer."
                confirmLabel="Sí, eliminar"
                cancelLabel="Cancelar"
                variant="danger"
                onConfirm={async () => {
                    try {
                        const { error } = await (supabase as any)
                            .from('hilu_administrativa')
                            .update({ fi_link_excel: null, updated_at: new Date().toISOString() })
                            .eq('id', hiluData.id)
                        if (error) {
                            toast.error('Error al eliminar: ' + error.message)
                        } else {
                            setLinkedExcelUrl(null)
                            setTempLink('')
                            toast.success('Documento desvinculado')
                        }
                    } finally {
                        setConfirmDeleteLink(false)
                    }
                }}
                onCancel={() => setConfirmDeleteLink(false)}
            />
            {renderFaseH()}
            {renderFaseI()}
            {renderFaseL()}
        </div>
    )
}
