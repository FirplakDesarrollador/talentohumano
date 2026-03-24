'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/constants/roles'
import type { Database } from '@/lib/supabase/types'
import { EvidenciasComponent } from './EvidenciasComponent'
import { CrearFirma, VerFirma } from './FirmaComponents'
import { ChevronDown, Calendar, CheckCircle2, Circle, Save, Image as ImageIcon } from 'lucide-react'

type QueryHiluRow = Database['public']['Views']['query_hilu']['Row']

interface HiluComponentProps {
    empleado: QueryHiluRow
    onUpdate: () => void
    currentUser?: any
}

const TOOLS_LIST = ['GI', 'TE-EE', 'A/F', "5'S", 'LIDERAZGO', 'BITACORA', 'OPT', 'OPT SIS', 'RRC', 'QRQC'] as const
const PHASE_I_CHECKS = ['Entrenamiento de la herramienta', 'Hace acompañado la herramienta'] as const
const PHASE_L_CHECKS = ['Ejecuta la herramienta con calidad', 'Cumple con la ejecución de la herramienta', 'Cumple con el estándar de la herramienta'] as const
const PHASE_U_CHECKS = ['Entrena en la metodología', 'Acompaña metodología', 'Sabe entrenar solo la metodología'] as const

type ToolDetails = Record<string, Record<string, boolean>>

const getRoleType = (cargo: string | null) => {
    if (!cargo) return 'OPERARIO'
    const cargoLower = cargo.toLowerCase()
    if (cargoLower.includes('director')) return 'DIRECTOR'
    if (cargoLower.includes('supervisor')) return 'SUPERVISOR'
    const jefeKeywords = ['jefe', 'coordinador', 'gerente', 'lider', 'líder', 'facilitador']
    if (jefeKeywords.some(kw => cargoLower.includes(kw))) return 'JEFE'
    return 'OPERARIO'
}

// Custom Components
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

export function HiluComponent({ empleado, onUpdate, currentUser }: HiluComponentProps) {
    const supabase = createClient()
    const [openPhase, setOpenPhase] = useState<'H' | 'I' | 'L' | 'U' | null>('H')

    // localEmpleado allows for optimistic UI updates without waiting for DB/Parent re-fetch
    const [localEmpleado, setLocalEmpleado] = useState<QueryHiluRow>(empleado)

    // Sync local state only when identity changes to avoid overwrites from stale refreshes
    useEffect(() => {
        if (empleado?.cedula !== localEmpleado?.cedula) {
            setLocalEmpleado(empleado)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empleado?.cedula])

    // Generic update function (Internal sync)
    const updatePhase = async (table: 'fase_H' | 'fase_I' | 'fase_L' | 'fase_U', id: number, data: any) => {
        try {
            const { error } = await (supabase
                .from(table) as any)
                .update({
                    ...data,
                    modified_at: new Date().toISOString(),
                    modified_by: currentUser?.id
                })
                .eq('id', id)

            if (error) throw error
            onUpdate() // Still call onUpdate to sync parent state in background
        } catch (error: any) {
            console.error('Error updating phase:', JSON.stringify(error, null, 2))
            alert(`Error al guardar cambios: ${error.message || 'Consulte la consola'}`)
            // Revert on error? For now, the next prop update will revert it anyway.
        }
    }

    // Tool Logic Helpers
    const handleToolCheck = (phase: 'I' | 'L' | 'U', tool: string, checkInfo: string, currentVal: boolean) => {
        const fieldMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_detalles', 'L': 'fl_detalles', 'U': 'fu_detalles' }
        const idMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_id', 'L': 'fl_id', 'U': 'fu_id' }
        const tableMap = { 'I': 'fase_I', 'L': 'fase_L', 'U': 'fase_U' } as const

        // Cast to unknown first to avoid TS issues with View types vs Table types
        const currentDetails = (localEmpleado[fieldMap[phase]] as unknown as ToolDetails) || {}

        // Deep clone
        const newDetails = JSON.parse(JSON.stringify(currentDetails))

        if (!newDetails[tool]) newDetails[tool] = {}
        newDetails[tool][checkInfo] = !currentVal

        // Optimistic Update
        const newLocal = { ...localEmpleado }
        // @ts-ignore
        newLocal[fieldMap[phase]] = newDetails
        setLocalEmpleado(newLocal)

        // @ts-ignore - Supabase update (requires DB column 'detalles' to be added via migration)
        updatePhase(tableMap[phase], localEmpleado[idMap[phase]] as number, { detalles: newDetails })
    }

    const isToolComplete = (phase: 'I' | 'L' | 'U', tool: string) => {
        const fieldName: keyof QueryHiluRow = phase === 'I' ? 'fi_detalles' : phase === 'L' ? 'fl_detalles' : 'fu_detalles'
        const details = (localEmpleado[fieldName] as unknown as ToolDetails) || {}
        const checks = phase === 'I' ? PHASE_I_CHECKS : phase === 'L' ? PHASE_L_CHECKS : PHASE_U_CHECKS
        return checks.every(chk => details[tool]?.[chk])
    }

    const renderToolGrid = (phase: 'I' | 'L' | 'U') => {
        const role = getRoleType(localEmpleado.cargo)
        const availableTools = role === 'SUPERVISOR'
            ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
            : role === 'OPERARIO'
                ? TOOLS_LIST
                : TOOLS_LIST.filter(t => ![''].includes(t))
        const checks = phase === 'I' ? PHASE_I_CHECKS : phase === 'L' ? PHASE_L_CHECKS : PHASE_U_CHECKS
        const fieldName: keyof QueryHiluRow = phase === 'I' ? 'fi_detalles' : phase === 'L' ? 'fl_detalles' : 'fu_detalles'
        const details = (localEmpleado[fieldName] as unknown as ToolDetails) || {}

        return (
            <div className="space-y-4">
                {availableTools.map(tool => {
                    // Per-tool conditional: L requires same tool complete in I, U requires same tool complete in L
                    const toolDisabled = phase === 'L'
                        ? !isToolComplete('I', tool)
                        : phase === 'U'
                            ? !isToolComplete('L', tool)
                            : false

                    const toolDetails = (details[tool] as Record<string, boolean>) || {}
                    const completedChecks = checks.filter(chk => toolDetails[chk]).length
                    const toolProgress = Math.round((completedChecks / checks.length) * 100)

                    return (
                        <div key={tool} className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-gray-100 pb-4 last:border-0 items-center">
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-bold text-sm text-[#2d4356] ${toolDisabled ? 'opacity-50' : ''}`}>{tool}</span>
                                    <span className={`text-[10px] font-bold ${toolProgress === 100 ? 'text-green-600' : 'text-blue-600'}`}>{toolProgress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${toolProgress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${toolProgress}%` }}
                                    />
                                </div>
                                {toolDisabled && <span className="text-[9px] text-red-500 font-bold uppercase mt-1">Pendiente fase anterior</span>}
                            </div>
                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {checks.map(chk => (
                                    <PillCheckbox
                                        key={chk}
                                        id={`${phase}-${tool}-${chk}`}
                                        label={chk}
                                        checked={toolDetails[chk] || false}
                                        disabled={toolDisabled}
                                        onChange={() => handleToolCheck(phase, tool, chk, toolDetails[chk] || false)}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // PHASE H RENDER
    const renderFaseH = () => {
        if (!localEmpleado.fh_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const checks = [
            localEmpleado.fh_induccion_th,
            localEmpleado.fh_aros_seguridad,
            localEmpleado.fh_induccion_planta,
            localEmpleado.fh_puesto_piloto,
            localEmpleado.fh_observacion_puesto,
            localEmpleado.fh_explicacion_puesto
        ]
        const completed = checks.filter(Boolean).length
        const progress = Math.round((completed / 6) * 100)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa]">
                <PhaseHeader
                    title="Etapa H"
                    progress={progress}
                    isOpen={openPhase === 'H'}
                    onClick={() => setOpenPhase(openPhase === 'H' ? null : 'H')}
                />

                {openPhase === 'H' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        {/* Top Row: Info & Primary Checks */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                                <Calendar className="h-5 w-5" />
                                <span>{localEmpleado.fh_dias_transcurridos || 0} días en esta fase</span>
                            </div>

                            <div className="relative">
                                <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                    {localEmpleado.fh_created_at ? new Date(localEmpleado.fh_created_at).toLocaleDateString() : 'Null'}
                                </div>
                            </div>

                            <PillCheckbox
                                id="fh_induccion_th"
                                label="Inducción de Talento humano"
                                checked={localEmpleado.fh_induccion_th || false}
                                onChange={(c) => {
                                    // Optimistic
                                    setLocalEmpleado(prev => ({ ...prev, fh_induccion_th: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, {
                                        induccion_th: c,
                                        induccion_th_fecha: c ? new Date().toISOString() : null,
                                        induccion_th_responsable_id: c ? currentUser?.id : null
                                    })
                                }}
                            />

                            <PillCheckbox
                                id="fh_aros_seguridad"
                                label="Normas de seguridad"
                                checked={localEmpleado.fh_aros_seguridad || false}
                                onChange={(c) => {
                                    setLocalEmpleado(prev => ({ ...prev, fh_aros_seguridad: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, { aros_seguridad: c })
                                }}
                            />
                        </div>

                        {/* Middle Row: Operational Checks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PillCheckbox
                                id="fh_induccion_planta"
                                label="Inducción inicial en Planta"
                                checked={localEmpleado.fh_induccion_planta || false}
                                onChange={(c) => {
                                    setLocalEmpleado(prev => ({ ...prev, fh_induccion_planta: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, { induccion_planta: c })
                                }}
                            />
                            <PillCheckbox
                                id="fh_puesto_piloto"
                                label="Entrenamiento puesto piloto"
                                checked={localEmpleado.fh_puesto_piloto || false}
                                onChange={(c) => {
                                    setLocalEmpleado(prev => ({ ...prev, fh_puesto_piloto: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, { puesto_piloto: c })
                                }}
                            />
                            <PillCheckbox
                                id="fh_observacion_puesto"
                                label="Observación puesto de trabajo"
                                checked={localEmpleado.fh_observacion_puesto || false}
                                onChange={(c) => {
                                    setLocalEmpleado(prev => ({ ...prev, fh_observacion_puesto: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, { observacion_puesto: c })
                                }}
                            />
                            <PillCheckbox
                                id="fh_explicacion_puesto"
                                label="Explicación puesto de trabajo"
                                checked={localEmpleado.fh_explicacion_puesto || false}
                                onChange={(c) => {
                                    setLocalEmpleado(prev => ({ ...prev, fh_explicacion_puesto: c }))
                                    updatePhase('fase_H', localEmpleado.fh_id!, { explicacion_puesto: c })
                                }}
                            />
                        </div>

                        {/* Bottom Section: Details & Signatures */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            {/* Comments */}
                            <div className="lg:col-span-3 space-y-2">
                                <Label className="text-gray-500 font-normal">Comentarios</Label>
                                <textarea
                                    className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="[fh_comentario]"
                                    defaultValue={localEmpleado.fh_comentario || ''}
                                    onBlur={(e) => updatePhase('fase_H', localEmpleado.fh_id!, { comentario: e.target.value })}
                                />
                            </div>

                            {/* Evidences */}
                            <div className="lg:col-span-3 space-y-2">
                                <Label className="text-gray-500 font-normal text-center block">Evidencias</Label>
                                <EvidenciasComponent
                                    evidencias={localEmpleado.fh_evidencias || []}
                                    onEvidenciasChange={(evs) => updatePhase('fase_H', localEmpleado.fh_id!, { evidencias: evs })}
                                    path="fase-h"
                                />
                            </div>

                            {/* Signatures */}
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label>
                                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50">
                                        {localEmpleado.fh_firma_empleado ? (
                                            <VerFirma firmaUrl={localEmpleado.fh_firma_empleado} />
                                        ) : (
                                            <CrearFirma onFirmaGuardada={(firma) => updatePhase('fase_H', localEmpleado.fh_id!, { firma_empleado: firma })} />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label>
                                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50">
                                        {localEmpleado.fh_firma_supervisor ? (
                                            <VerFirma firmaUrl={localEmpleado.fh_firma_supervisor} />
                                        ) : (
                                            <CrearFirma onFirmaGuardada={(firma) => updatePhase('fase_H', localEmpleado.fh_id!, { firma_supervisor: firma })} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Save & Finish Area */}
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2">
                                <Button
                                    className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"
                                    onClick={() => alert('Cambios guardados')} // Changes execute on blur/click, this is visual feedback
                                >
                                    <Save className="h-4 w-4" />
                                    Guardar
                                </Button>

                                <div className="mt-auto pt-4">
                                    <Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label>
                                    <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">
                                        {localEmpleado.fh_fecha_finalizacion_fase ? new Date(localEmpleado.fh_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseI = () => {
        if (!localEmpleado.fi_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const role = getRoleType(localEmpleado.cargo)
        let progress = 0
        if (role === 'OPERARIO') {
            const checks = [
                localEmpleado.fi_titular,
                localEmpleado.fi_estandar_hdt,
                localEmpleado.fi_entrenamiento_calidad,
                localEmpleado.fi_hace_acompanado,
                localEmpleado.fi_hace_solo
            ]
            const completed = checks.filter(Boolean).length
            progress = Math.round((completed / 5) * 100)
        } else {
            const availableTools = role === 'SUPERVISOR'
                ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
                : TOOLS_LIST.filter(t => ![''].includes(t))
            const completedTools = availableTools.filter(t => isToolComplete('I', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa I" progress={progress} isOpen={openPhase === 'I'} onClick={() => setOpenPhase(openPhase === 'I' ? null : 'I')} />
                {openPhase === 'I' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{localEmpleado.fi_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{localEmpleado.fi_created_at ? new Date(localEmpleado.fi_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <PillCheckbox id="fi_titular" label="Es el Titular del Puesto" checked={localEmpleado.fi_titular || false} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fi_titular: c }))
                                        updatePhase('fase_I', localEmpleado.fi_id!, { titular: c })
                                    }} />
                                    <PillCheckbox id="fi_estandar_hdt" label="Estándar HDT" checked={localEmpleado.fi_estandar_hdt || false} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fi_estandar_hdt: c }))
                                        updatePhase('fase_I', localEmpleado.fi_id!, { estandar_hdt: c })
                                    }} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PillCheckbox id="fi_entrenamiento_calidad" label="Entrenamiento Calidad" checked={localEmpleado.fi_entrenamiento_calidad || false} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fi_entrenamiento_calidad: c }))
                                        updatePhase('fase_I', localEmpleado.fi_id!, { entrenamiento_calidad: c })
                                    }} />
                                    <PillCheckbox id="fi_hace_acompanado" label="Hace Acompañado" checked={localEmpleado.fi_hace_acompanado || false} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fi_hace_acompanado: c }))
                                        updatePhase('fase_I', localEmpleado.fi_id!, { hace_acompanado: c })
                                    }} />
                                    <PillCheckbox id="fi_hace_solo" label="Hace Solo" checked={localEmpleado.fi_hace_solo || false} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fi_hace_solo: c }))
                                        updatePhase('fase_I', localEmpleado.fi_id!, { hace_solo: c })
                                    }} />
                                    <div className="relative">
                                        <Label className="absolute -top-2 left-2 px-1 text-xs text-gray-500 z-10">Entrenado por</Label>
                                        <Input className="h-full pt-4" defaultValue={localEmpleado.fi_entrenado_por || ''} onBlur={(e) => updatePhase('fase_I', localEmpleado.fi_id!, { entrenado_por: e.target.value })} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase I</h4>
                                {renderToolGrid('I')}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={localEmpleado.fi_comentario || ''} onBlur={(e) => updatePhase('fase_I', localEmpleado.fi_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={localEmpleado.fi_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_I', localEmpleado.fi_id!, { evidencias: evs })} path="fase-i" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fi_firma_empleado ? <VerFirma firmaUrl={localEmpleado.fi_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_I', localEmpleado.fi_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fi_firma_supervisor ? <VerFirma firmaUrl={localEmpleado.fi_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_I', localEmpleado.fi_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{localEmpleado.fi_fecha_finalizacion_fase ? new Date(localEmpleado.fi_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseL = () => {
        if (!localEmpleado.fl_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const role = getRoleType(localEmpleado.cargo)
        let progress = 0
        if (role === 'OPERARIO') {
            const checks = [
                localEmpleado.fl_cumple_calidad,
                localEmpleado.fl_cumple_estandar,
                localEmpleado.fl_cumple_tiempo
            ]
            const completed = checks.filter(Boolean).length
            progress = Math.round((completed / 3) * 100)
        } else {
            const availableTools = role === 'SUPERVISOR'
                ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
                : TOOLS_LIST.filter(t => ![''].includes(t))
            const completedTools = availableTools.filter(t => isToolComplete('L', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }
        // Phase L is disabled until ALL phase I checks are complete (OPERARIO only)
        const faseIComplete = !!(localEmpleado.fi_titular && localEmpleado.fi_estandar_hdt && localEmpleado.fi_entrenamiento_calidad && localEmpleado.fi_hace_acompanado && localEmpleado.fi_hace_solo)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa L" progress={progress} isOpen={openPhase === 'L'} onClick={() => setOpenPhase(openPhase === 'L' ? null : 'L')} />
                {openPhase === 'L' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{localEmpleado.fl_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{localEmpleado.fl_created_at ? new Date(localEmpleado.fl_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <div className="space-y-2">
                                {!faseIComplete && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
                                        ⚠️ Complete todas las habilidades de la Fase I para habilitar la Fase L
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <PillCheckbox id="fl_cumple_calidad" label="Cumple Calidad" checked={localEmpleado.fl_cumple_calidad || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_calidad: c }))
                                        updatePhase('fase_L', localEmpleado.fl_id!, { cumple_calidad: c })
                                    }} />
                                    <PillCheckbox id="fl_cumple_estandar" label="Cumple Estándar" checked={localEmpleado.fl_cumple_estandar || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_estandar: c }))
                                        updatePhase('fase_L', localEmpleado.fl_id!, { cumple_estandar: c })
                                    }} />
                                    <PillCheckbox id="fl_cumple_tiempo" label="Cumple Tiempo" checked={localEmpleado.fl_cumple_tiempo || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_tiempo: c }))
                                        updatePhase('fase_L', localEmpleado.fl_id!, { cumple_tiempo: c })
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase L</h4>
                                {renderToolGrid('L')}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={localEmpleado.fl_comentario || ''} onBlur={(e) => updatePhase('fase_L', localEmpleado.fl_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={localEmpleado.fl_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_L', localEmpleado.fl_id!, { evidencias: evs })} path="fase-l" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fl_firma_empleado ? <VerFirma firmaUrl={localEmpleado.fl_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_L', localEmpleado.fl_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fl_firma_supervisor ? <VerFirma firmaUrl={localEmpleado.fl_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_L', localEmpleado.fl_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{localEmpleado.fl_fecha_finalizacion_fase ? new Date(localEmpleado.fl_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseU = () => {
        if (!localEmpleado.fu_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const role = getRoleType(localEmpleado.cargo)
        let progress = 0
        if (role === 'OPERARIO') {
            const checks = [
                localEmpleado.fu_capacitado_para_entrenar,
                localEmpleado.fu_entrena_solo,
                localEmpleado.fu_acompana_entrenamientos
            ]
            const completed = checks.filter(Boolean).length
            progress = Math.round((completed / 3) * 100)
        } else {
            const availableTools = role === 'SUPERVISOR'
                ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
                : TOOLS_LIST.filter(t => ![''].includes(t))
            const completedTools = availableTools.filter(t => isToolComplete('U', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }
        // Phase U is disabled until ALL phase L checks are complete (OPERARIO only)
        const faseLComplete = !!(localEmpleado.fl_cumple_calidad && localEmpleado.fl_cumple_estandar && localEmpleado.fl_cumple_tiempo)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa U" progress={progress} isOpen={openPhase === 'U'} onClick={() => setOpenPhase(openPhase === 'U' ? null : 'U')} />
                {openPhase === 'U' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{localEmpleado.fu_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{localEmpleado.fu_created_at ? new Date(localEmpleado.fu_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <div className="space-y-2">
                                {!faseLComplete && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
                                        ⚠️ Complete todas las habilidades de la Fase L para habilitar la Fase U
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <PillCheckbox id="fu_capacitado_para_entrenar" label="Capacitado para Entrenar" checked={localEmpleado.fu_capacitado_para_entrenar || false} disabled={!faseLComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fu_capacitado_para_entrenar: c }))
                                        updatePhase('fase_U', localEmpleado.fu_id!, { capacitado_para_entrenar: c })
                                    }} />
                                    <PillCheckbox id="fu_entrena_solo" label="Entrena Solo" checked={localEmpleado.fu_entrena_solo || false} disabled={!faseLComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fu_entrena_solo: c }))
                                        updatePhase('fase_U', localEmpleado.fu_id!, { entrena_solo: c })
                                    }} />
                                    <PillCheckbox id="fu_acompana_entrenamientos" label="Acompaña Entrenamientos" checked={localEmpleado.fu_acompana_entrenamientos || false} disabled={!faseLComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fu_acompana_entrenamientos: c }))
                                        updatePhase('fase_U', localEmpleado.fu_id!, { acompana_entrenamientos: c })
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase U</h4>
                                {renderToolGrid('U')}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={localEmpleado.fu_comentario || ''} onBlur={(e) => updatePhase('fase_U', localEmpleado.fu_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={localEmpleado.fu_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_U', localEmpleado.fu_id!, { evidencias: evs })} path="fase-u" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fu_firma_empleado ? <VerFirma firmaUrl={localEmpleado.fu_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_U', localEmpleado.fu_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{localEmpleado.fu_firma_supervisor ? <VerFirma firmaUrl={localEmpleado.fu_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_U', localEmpleado.fu_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{localEmpleado.fu_fecha_finalizacion_fase ? new Date(localEmpleado.fu_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }



    return (
        <div className="w-full space-y-6">
            {renderFaseH()}
            {renderFaseI()}
            {renderFaseL()}
            {renderFaseU()}
        </div>
    )
}
