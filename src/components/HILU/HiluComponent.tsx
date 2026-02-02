'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
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
const PHASE_I_CHECKS = ['Explicación de la herramienta', 'Hace acompañado', 'Hace solo'] as const
const PHASE_LU_CHECKS = ['Entrena en la metodología', 'Acompaña metodología', 'Sabe entrenar solo metodología'] as const

type ToolDetails = Record<string, Record<string, boolean>>

const getRoleType = (cargo: string | null) => {
    if (!cargo) return 'OPERARIO'
    const c = cargo.toLowerCase()
    if (c.includes('jefe') || c.includes('director') || c.includes('gerente') || c.includes('lider')) return 'LIDER'
    if (c.includes('supervisor')) return 'SUPERVISOR'
    return 'OPERARIO'
}

// Custom Components
const PillCheckbox = ({ id, checked, onChange, label }: { id: string, checked: boolean, onChange: (c: boolean) => void, label: string }) => (
    <div
        onClick={() => onChange(!checked)}
        className={`
            cursor-pointer flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all
            ${checked ? 'bg-white border-blue-200' : 'bg-white border-gray-200 hover:border-blue-300'}
        `}
    >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {checked ? (
            <CheckCircle2 className="h-6 w-6 text-[#1e2f3d]" fill="#1e2f3d" color="white" />
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
    const [loading, setLoading] = useState(false)
    const [openPhase, setOpenPhase] = useState<'H' | 'I' | 'L' | 'U' | null>('H')

    // Generic update function
    const updatePhase = async (table: 'fase_H' | 'fase_I' | 'fase_L' | 'fase_U', id: number, data: any) => {
        setLoading(true)
        try {
            const { error } = await (supabase
                .from(table) as any)
                .update({
                    ...data,
                    modified_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
            onUpdate()
        } catch (error: any) {
            console.error('Error updating phase:', JSON.stringify(error, null, 2))
            alert(`Error al guardar cambios: ${error.message || 'Consulte la consola'}`)
        } finally {
            setLoading(false)
        }
    }

    // Tool Logic Helpers
    const handleToolCheck = (phase: 'I' | 'L' | 'U', tool: string, checkInfo: string, currentVal: boolean) => {
        const fieldMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_detalles', 'L': 'fl_detalles', 'U': 'fu_detalles' }
        const idMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_id', 'L': 'fl_id', 'U': 'fu_id' }
        const tableMap = { 'I': 'fase_I', 'L': 'fase_L', 'U': 'fase_U' } as const

        // Cast to unknown first to avoid TS issues with View types vs Table types if mismatch persists
        const currentDetails = (empleado[fieldMap[phase]] as unknown as ToolDetails) || {}

        // Deep clone to avoid mutating state directly
        const newDetails = JSON.parse(JSON.stringify(currentDetails))

        if (!newDetails[tool]) newDetails[tool] = {}
        newDetails[tool][checkInfo] = !currentVal

        // @ts-ignore - Supabase type mismatch workaround for JSONB updates
        updatePhase(tableMap[phase], empleado[idMap[phase]] as number, { detalles: newDetails })
    }

    const renderToolGrid = (phase: 'I' | 'L' | 'U') => {
        const role = getRoleType(empleado.cargo)
        const availableTools = role === 'SUPERVISOR' ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t)) : TOOLS_LIST
        const checks = phase === 'I' ? PHASE_I_CHECKS : PHASE_LU_CHECKS
        const fieldName: keyof QueryHiluRow = phase === 'I' ? 'fi_detalles' : phase === 'L' ? 'fl_detalles' : 'fu_detalles'
        const details = (empleado[fieldName] as unknown as ToolDetails) || {}

        return (
            <div className="space-y-4">
                {availableTools.map(tool => (
                    <div key={tool} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-gray-100 pb-2 last:border-0">
                        <span className="font-medium text-sm flex items-center text-gray-700">{tool}</span>
                        {checks.map(chk => (
                            <PillCheckbox
                                key={chk}
                                id={`${phase}-${tool}-${chk}`}
                                label={chk}
                                checked={details[tool]?.[chk] || false}
                                onChange={() => handleToolCheck(phase, tool, chk, details[tool]?.[chk] || false)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    // PHASE H RENDER
    const renderFaseH = () => {
        if (!empleado.fh_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const progress = parseFloat(((empleado.fh_avance || 0) * 100).toFixed(0))

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
                                <span>{empleado.fh_dias_transcurridos || 0} días en esta fase</span>
                            </div>

                            <div className="relative">
                                <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                    {empleado.fh_created_at ? new Date(empleado.fh_created_at).toLocaleDateString() : 'Null'}
                                </div>
                            </div>

                            <PillCheckbox
                                id="fh_induccion_th"
                                label="Inducción de Talento humano"
                                checked={empleado.fh_induccion_th || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, {
                                    induccion_th: c,
                                    induccion_th_fecha: c ? new Date().toISOString() : null,
                                    induccion_th_responsable_id: c ? currentUser?.id : null
                                })}
                            />

                            <PillCheckbox
                                id="fh_aros_seguridad"
                                label="Normas de seguridad"
                                checked={empleado.fh_aros_seguridad || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, { aros_seguridad: c })}
                            />
                        </div>

                        {/* Middle Row: Operational Checks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PillCheckbox
                                id="fh_induccion_planta"
                                label="Inducción inicial en Planta"
                                checked={empleado.fh_induccion_planta || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, { induccion_planta: c })}
                            />
                            <PillCheckbox
                                id="fh_puesto_piloto"
                                label="Entrenamiento puesto piloto"
                                checked={empleado.fh_puesto_piloto || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, { puesto_piloto: c })}
                            />
                            <PillCheckbox
                                id="fh_observacion_puesto"
                                label="Observación puesto de trabajo"
                                checked={empleado.fh_observacion_puesto || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, { observacion_puesto: c })}
                            />
                            <PillCheckbox
                                id="fh_explicacion_puesto"
                                label="Explicación puesto de trabajo"
                                checked={empleado.fh_explicacion_puesto || false}
                                onChange={(c) => updatePhase('fase_H', empleado.fh_id!, { explicacion_puesto: c })}
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
                                    defaultValue={empleado.fh_comentario || ''}
                                    onBlur={(e) => updatePhase('fase_H', empleado.fh_id!, { comentario: e.target.value })}
                                />
                            </div>

                            {/* Evidences */}
                            <div className="lg:col-span-3 space-y-2">
                                <Label className="text-gray-500 font-normal text-center block">Evidencias</Label>
                                <EvidenciasComponent
                                    evidencias={empleado.fh_evidencias || []}
                                    onEvidenciasChange={(evs) => updatePhase('fase_H', empleado.fh_id!, { evidencias: evs })}
                                    path="fase-h"
                                />
                            </div>

                            {/* Signatures */}
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label>
                                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50">
                                        {empleado.fh_firma_empleado ? (
                                            <VerFirma firmaUrl={empleado.fh_firma_empleado} />
                                        ) : (
                                            <CrearFirma onFirmaGuardada={(firma) => updatePhase('fase_H', empleado.fh_id!, { firma_empleado: firma })} />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label>
                                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50">
                                        {empleado.fh_firma_supervisor ? (
                                            <VerFirma firmaUrl={empleado.fh_firma_supervisor} />
                                        ) : (
                                            <CrearFirma onFirmaGuardada={(firma) => updatePhase('fase_H', empleado.fh_id!, { firma_supervisor: firma })} />
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
                                        {empleado.fh_fecha_finalizacion_fase ? new Date(empleado.fh_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}
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
        if (!empleado.fi_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const progress = parseFloat(((empleado.fi_avance || 0) * 100).toFixed(0))
        const role = getRoleType(empleado.cargo)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa I" progress={progress} isOpen={openPhase === 'I'} onClick={() => setOpenPhase(openPhase === 'I' ? null : 'I')} />
                {openPhase === 'I' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{empleado.fi_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{empleado.fi_created_at ? new Date(empleado.fi_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <PillCheckbox id="fi_titular" label="Es el Titular del Puesto" checked={empleado.fi_titular || false} onChange={(c) => updatePhase('fase_I', empleado.fi_id!, { titular: c })} />
                                    <PillCheckbox id="fi_estandar_hdt" label="Estándar HDT" checked={empleado.fi_estandar_hdt || false} onChange={(c) => updatePhase('fase_I', empleado.fi_id!, { estandar_hdt: c })} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PillCheckbox id="fi_entrenamiento_calidad" label="Entrenamiento Calidad" checked={empleado.fi_entrenamiento_calidad || false} onChange={(c) => updatePhase('fase_I', empleado.fi_id!, { entrenamiento_calidad: c })} />
                                    <PillCheckbox id="fi_hace_acompanado" label="Hace Acompañado" checked={empleado.fi_hace_acompanado || false} onChange={(c) => updatePhase('fase_I', empleado.fi_id!, { hace_acompanado: c })} />
                                    <PillCheckbox id="fi_hace_solo" label="Hace Solo" checked={empleado.fi_hace_solo || false} onChange={(c) => updatePhase('fase_I', empleado.fi_id!, { hace_solo: c })} />
                                    <div className="relative">
                                        <Label className="absolute -top-2 left-2 px-1 text-xs text-gray-500 z-10">Entrenado por</Label>
                                        <Input className="h-full pt-4" defaultValue={empleado.fi_entrenado_por || ''} onBlur={(e) => updatePhase('fase_I', empleado.fi_id!, { entrenado_por: e.target.value })} />
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
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={empleado.fi_comentario || ''} onBlur={(e) => updatePhase('fase_I', empleado.fi_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={empleado.fi_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_I', empleado.fi_id!, { evidencias: evs })} path="fase-i" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fi_firma_empleado ? <VerFirma firmaUrl={empleado.fi_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_I', empleado.fi_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fi_firma_supervisor ? <VerFirma firmaUrl={empleado.fi_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_I', empleado.fi_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{empleado.fi_fecha_finalizacion_fase ? new Date(empleado.fi_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseL = () => {
        if (!empleado.fl_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const progress = parseFloat(((empleado.fl_avance || 0) * 100).toFixed(0))
        const role = getRoleType(empleado.cargo)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa L" progress={progress} isOpen={openPhase === 'L'} onClick={() => setOpenPhase(openPhase === 'L' ? null : 'L')} />
                {openPhase === 'L' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{empleado.fl_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{empleado.fl_created_at ? new Date(empleado.fl_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <PillCheckbox id="fl_cumple_calidad" label="Cumple Calidad" checked={empleado.fl_cumple_calidad || false} onChange={(c) => updatePhase('fase_L', empleado.fl_id!, { cumple_calidad: c })} />
                                <PillCheckbox id="fl_cumple_estandar" label="Cumple Estándar" checked={empleado.fl_cumple_estandar || false} onChange={(c) => updatePhase('fase_L', empleado.fl_id!, { cumple_estandar: c })} />
                                <PillCheckbox id="fl_cumple_tiempo" label="Cumple Tiempo" checked={empleado.fl_cumple_tiempo || false} onChange={(c) => updatePhase('fase_L', empleado.fl_id!, { cumple_tiempo: c })} />
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase L</h4>
                                {renderToolGrid('L')}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={empleado.fl_comentario || ''} onBlur={(e) => updatePhase('fase_L', empleado.fl_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={empleado.fl_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_L', empleado.fl_id!, { evidencias: evs })} path="fase-l" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fl_firma_empleado ? <VerFirma firmaUrl={empleado.fl_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_L', empleado.fl_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fl_firma_supervisor ? <VerFirma firmaUrl={empleado.fl_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_L', empleado.fl_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{empleado.fl_fecha_finalizacion_fase ? new Date(empleado.fl_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
                        </div>
                    </CardContent>
                )}
            </Card>
        )
    }

    const renderFaseU = () => {
        if (!empleado.fu_id) return <div className="p-8 text-center text-gray-500">Fase no iniciada</div>
        const progress = parseFloat(((empleado.fu_avance || 0) * 100).toFixed(0))
        const role = getRoleType(empleado.cargo)

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa U" progress={progress} isOpen={openPhase === 'U'} onClick={() => setOpenPhase(openPhase === 'U' ? null : 'U')} />
                {openPhase === 'U' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap"><Calendar className="h-5 w-5" /><span>{empleado.fu_dias_transcurridos || 0} días en esta fase</span></div>
                            <div className="relative"><Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">{empleado.fu_created_at ? new Date(empleado.fu_created_at).toLocaleDateString() : 'Null'}</div></div>
                        </div>

                        {role === 'OPERARIO' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <PillCheckbox id="fu_capacitado_para_entrenar" label="Capacitado para Entrenar" checked={empleado.fu_capacitado_para_entrenar || false} onChange={(c) => updatePhase('fase_U', empleado.fu_id!, { capacitado_para_entrenar: c })} />
                                <PillCheckbox id="fu_entrena_solo" label="Entrena Solo" checked={empleado.fu_entrena_solo || false} onChange={(c) => updatePhase('fase_U', empleado.fu_id!, { entrena_solo: c })} />
                                <PillCheckbox id="fu_acompana_entrenamientos" label="Acompaña Entrenamientos" checked={empleado.fu_acompana_entrenamientos || false} onChange={(c) => updatePhase('fase_U', empleado.fu_id!, { acompana_entrenamientos: c })} />
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase U</h4>
                                {renderToolGrid('U')}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal">Comentarios</Label><textarea className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue={empleado.fu_comentario || ''} onBlur={(e) => updatePhase('fase_U', empleado.fu_id!, { comentario: e.target.value })} /></div>
                            <div className="lg:col-span-3 space-y-2"><Label className="text-gray-500 font-normal text-center block">Evidencias</Label><EvidenciasComponent evidencias={empleado.fu_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_U', empleado.fu_id!, { evidencias: evs })} path="fase-u" /></div>
                            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Empleado</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fu_firma_empleado ? <VerFirma firmaUrl={empleado.fu_firma_empleado} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_U', empleado.fu_id!, { firma_empleado: f })} />}</div></div>
                                <div><Label className="text-gray-500 font-normal mb-2 block text-center">Firma Supervisor</Label><div className="border-2 border-dashed border-blue-300 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center relative bg-blue-50/50 text-center">{empleado.fu_firma_supervisor ? <VerFirma firmaUrl={empleado.fu_firma_supervisor} /> : <CrearFirma onFirmaGuardada={(f) => updatePhase('fase_U', empleado.fu_id!, { firma_supervisor: f })} />}</div></div>
                            </div>
                            <div className="lg:col-span-2 flex flex-col justify-between h-full py-2"><Button className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2"><Save className="h-4 w-4" /> Guardar</Button><div className="mt-auto pt-4"><Label className="text-xs text-gray-500 block mb-1">Fecha de finalización</Label><div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm w-full">{empleado.fu_fecha_finalizacion_fase ? new Date(empleado.fu_fecha_finalizacion_fase).toLocaleDateString() : 'Null'}</div></div></div>
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
