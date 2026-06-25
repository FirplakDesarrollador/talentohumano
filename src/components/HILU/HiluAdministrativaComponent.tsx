'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles'
import { ChevronDown, Calendar, CheckCircle2, Circle, Save, Star } from 'lucide-react'
import { toast } from 'sonner'
import { CrearFirma, VerFirma } from './FirmaComponents'
import { EvidenciasComponent } from './EvidenciasComponent'

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
    fh_firma_empleado: boolean;
    fh_firma_jefe: boolean;
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
    fi_firma_empleado: boolean;
    fi_firma_jefe: boolean;

    // FASE L
    fl_desempena_autonomia: boolean;
    fl_cumple_responsabilidades: boolean;
    fl_aplica_procedimientos: boolean;
    fl_ejecuta_sin_acompanamiento: boolean;
    fl_cumple_resultados: boolean;
    fl_comentarios: string | null;
    fl_firma_empleado: boolean;
    fl_firma_jefe: boolean;
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
}) => (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[220px] transition-all hover:border-blue-200 hover:shadow-md">
        <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-blue-400 animate-pulse'}`}></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
            </div>
            {value && (
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">√ FIRMADO</span>
                    {date && <span className="text-[8px] text-gray-400 mt-0.5">{new Date(date).toLocaleDateString()}</span>}
                </div>
            )}
        </div>
        <div className="flex-grow p-4 flex flex-col justify-center items-center bg-white relative">
            <div className="w-full">
                {value ? (
                    typeof value === 'string' && value.startsWith('http') ? <VerFirma firmaUrl={value} /> : <div className="text-green-600 font-bold text-center">Firma Electrónica Confirmada</div>
                ) : (
                    <CrearFirma onFirmaGuardada={onSave} />
                )}
            </div>
        </div>
    </div>
)

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

    useEffect(() => {
        setLocalData(hiluData)
    }, [hiluData])

    const canEdit = () => {
        if (!currentUser) return false
        const email = currentUser.email || ''
        const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(currentUser.nivelCargo || '')
        return isAdmin || ['Jefe', 'Director', 'Gerente', 'Coordinador'].includes(currentUser.nivelCargo)
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
        const isDone = data.fh_induccion_th && data.fh_induccion_sst && data.fh_presentacion_area && data.fh_explicacion_cargo && data.fh_firma_empleado && data.fh_firma_jefe
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
            data.fi_eval_actitud && data.fi_eval_adaptacion && data.fi_eval_aprendizaje && data.fi_eval_conocimiento && data.fi_firma_empleado && data.fi_firma_jefe
        const hasComment = !!(data.fi_comentarios?.trim())

        if (isDone && hasComment && !data.fi_completado) {
            await updateDB({ fi_completado: true, fi_fecha_finalizacion: new Date().toISOString() })
            alert('¡Fase I completada!')
        } else if (isDone && !hasComment && !data.fi_completado) {
            toast.warning('Falta agregar comentarios en la Fase I')
        }
    }

    const checkPhaseL = async (data: HiluAdminRow) => {
        const isDone = data.fl_desempena_autonomia && data.fl_cumple_responsabilidades && data.fl_aplica_procedimientos && data.fl_ejecuta_sin_acompanamiento && data.fl_cumple_resultados && data.fl_firma_empleado && data.fl_firma_jefe
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
                                    onSave={(firma) => setLocalData({ ...localData, fh_firma_empleado: true })}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fh_firma_jefe}
                                    onSave={(firma) => setLocalData({ ...localData, fh_firma_jefe: true })}
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

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <EvidenciasComponent 
                                evidencias={localData.fi_plan_entrenamiento || []}
                                onEvidenciasChange={(evs) => setLocalData({ ...localData, fi_plan_entrenamiento: evs })}
                                path={`hilu-admin/${localData.id}/plan`}
                                readOnly={!canEdit()}
                            />
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
                                    onSave={(firma) => setLocalData({ ...localData, fi_firma_empleado: true })}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fi_firma_jefe}
                                    onSave={(firma) => setLocalData({ ...localData, fi_firma_jefe: true })}
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
                                    onSave={(firma) => setLocalData({ ...localData, fl_firma_empleado: true })}
                                />
                                <SignatureWidget
                                    label="Firma Jefe"
                                    value={localData.fl_firma_jefe}
                                    onSave={(firma) => setLocalData({ ...localData, fl_firma_jefe: true })}
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
            {renderFaseH()}
            {renderFaseI()}
            {renderFaseL()}
        </div>
    )
}
