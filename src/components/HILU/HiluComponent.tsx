'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ROLES, ADMIN_EMAILS, ADMIN_LEVELS, SUPERVISORES_MARMOL, SUPERVISORES_CALIDAD, SUPERVISORES_ALMACEN_CEDI, SUPERVISORES_MUEBLES_CEFI, HILU_OPERATIVA_RESTRINGIDA_MOLDES } from '@/lib/constants/roles'
import type { Database } from '@/lib/supabase/types'
import { EvidenciasComponent } from './EvidenciasComponent'
import { CrearFirma, VerFirma } from './FirmaComponents'
import { ChevronDown, Calendar, CheckCircle2, Circle, Save, Star, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type QueryHiluRow = Database['public']['Views']['query_hilu']['Row'] & {
    fi_promedio?: number | null;
}

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

    // Grupo 10 Herramientas: Jefes, Gerentes, Directores y Coordinadores
    const highLevel = ['jefe', 'gerente', 'director', 'coordinador']
    if (highLevel.some(kw => cargoLower.includes(kw))) return 'JEFE_ALTO'

    // Grupo 8 Herramientas: Supervisores, Líderes, Facilitadores e Implementadores
    const midLevel = ['supervisor', 'lider', 'líder', 'facilitador', 'implementador']
    if (midLevel.some(kw => cargoLower.includes(kw))) return 'SUPERVISOR_MEDIO'

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

const StarRating = ({ value, onChange, label, disabled }: { value: number, onChange?: (v: number) => void, label: string, disabled?: boolean }) => {
    const stars = [1, 2, 3]
    return (
        <div className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-gray-100 shadow-sm h-full">
            <span className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                {label}
                <span className="text-blue-600 font-bold">{value === 1 ? 'Bajo' : value === 2 ? 'Regular' : value === 3 ? 'Bueno' : ''}</span>
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
    value?: string | null,
    onSave: (firma: string) => void,
    date?: string | null
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [pendingEdit, setPendingEdit] = useState(false)
    const showForm = !value || isEditing

    return (
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[220px] transition-all hover:border-blue-200 hover:shadow-md">
            <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-blue-400 animate-pulse'}`}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                </div>
                {value && !isEditing && (
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
                    </div>
                )}
            </div>
            <div className="flex-grow p-4 flex flex-col justify-center items-center bg-white relative">
                <div className="w-full">
                    {showForm ? (
                        <CrearFirma
                            onFirmaGuardada={(firma) => { onSave(firma); setIsEditing(false) }}
                            onCancel={value ? () => setIsEditing(false) : undefined}
                        />
                    ) : (
                        <VerFirma firmaUrl={value} />
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

export function HiluComponent({ empleado, onUpdate, currentUser }: HiluComponentProps) {
    const supabase = createClient()
    const [openPhase, setOpenPhase] = useState<'H' | 'I' | 'L' | 'U' | null>('H')

    const processEmpleado = (emp: QueryHiluRow) => {
        const base = { ...emp }
        if (base.fi_detalles && typeof base.fi_detalles === 'object') {
            base.fi_mantenimiento_autonomo = (base.fi_detalles as any).mantenimiento_autonomo
        }
        return base
    }

    // localEmpleado allows for optimistic UI updates without waiting for DB/Parent re-fetch
    const [localEmpleado, setLocalEmpleado] = useState<QueryHiluRow>(processEmpleado(empleado))

    const canEditPhase = (phase: 'H' | 'I' | 'L' | 'U') => {
        if (!currentUser) return false
        const email = currentUser.email || ''

        // Full access (all phases including U)
        if (
            email === 'estiven.londono@firplak.com' ||
            email === 'coordinacioncalidad@firplak.com' ||
            email === 'hector.chinchilla@firplak.com' ||
            email === 'juliana.ramirez@firplak.com' ||
            email === 'analistaabastecimiento@firplak.com'
        ) return true

        const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_LEVELS as any).includes(currentUser.nivelCargo || '')
        if (isAdmin) return true

        if (
            email === 'david.ramirez@firplak.com' ||
            SUPERVISORES_MARMOL.includes(email) ||
            SUPERVISORES_CALIDAD.includes(email) ||
            SUPERVISORES_ALMACEN_CEDI.includes(email) ||
            SUPERVISORES_MUEBLES_CEFI.includes(email) ||
            email === 'jakeline.chaverra@firplak.com' ||
            email === 'maria.perez@firplak.com' ||
            email === 'sara.aguilar@firplak.com' ||
            HILU_OPERATIVA_RESTRINGIDA_MOLDES.includes(email)
        ) {
            if (phase === 'U') return false
            return true
        }

        return true
    }

    // Sync local state ONLY when switching to a different employee
    // Preserves local optimistic updates for the same employee
    useEffect(() => {
        setLocalEmpleado(prev => {
            if (prev.cedula !== empleado.cedula) {
                return processEmpleado(empleado)  // Different employee → full reset
            }
            // Same employee: merge server data but keep local detalles (unsaved or just saved)
            const processed = processEmpleado(empleado)
            return {
                ...processed,
                fi_detalles: prev.fi_detalles,
                fl_detalles: prev.fl_detalles,
                fu_detalles: prev.fu_detalles,
                fi_mantenimiento_autonomo: prev.fi_mantenimiento_autonomo !== undefined ? prev.fi_mantenimiento_autonomo : processed.fi_mantenimiento_autonomo
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empleado])

    // Generic update function (Internal sync)
    const updatePhase = async (table: 'fase_H' | 'fase_I' | 'fase_L' | 'fase_U', id: number, data: any) => {
        try {
            const { error } = await (supabase
                .from(table) as any)
                .update({
                    ...data,
                    modified_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            if (onUpdate) {
                await (onUpdate as any)()
            }

            toast.success('Cambios guardados')
        } catch (error: any) {
            console.error('Error updating phase:', JSON.stringify(error, null, 2))
            alert(`Error al guardar cambios: ${error.message || 'Consulte la consola'}`)
        }
    }

    const handleSaveToolPhase = async (phase: 'I' | 'L' | 'U', tool: string) => {
        const tableMap = { 'I': 'fase_I', 'L': 'fase_L', 'U': 'fase_U' } as const
        const idMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_id', 'L': 'fl_id', 'U': 'fu_id' }
        const fieldMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_detalles', 'L': 'fl_detalles', 'U': 'fu_detalles' }

        const id = localEmpleado[idMap[phase]] as number
        if (!id) {
            toast.error('No se encontró el ID de la fase')
            return
        }

        const currentDetails = (localEmpleado[fieldMap[phase]] as unknown as ToolDetails) || {}
        const toolState = currentDetails[tool] || {}

        const payload = {
            detalles: currentDetails,
            modified_at: new Date().toISOString()
        }

        console.log(`[HILU → Guardar Herramienta] "${tool}" - Fase ${phase}`, {
            tabla: tableMap[phase],
            id,
            empleado: localEmpleado.nombreCompleto,
            cedula: localEmpleado.cedula,
            estadoHerramienta: toolState,
            payload,
            timestamp: new Date().toISOString()
        })

        const { error } = await (supabase
            .from(tableMap[phase]) as any)
            .update(payload)
            .eq('id', id)

        if (error) {
            console.error(`[HILU ERROR] "${tool}" - Fase ${phase}`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                full: JSON.stringify(error)
            })
            toast.error(`Error al guardar "${tool}"`, { description: error.message || JSON.stringify(error) })
            return
        }

        console.log(`[HILU ✔] "${tool}" Fase ${phase} guardado correctamente`)
        toast.success(`Herramienta "${tool}" guardada`, {
            description: `Fase ${phase} — Los cambios fueron sincronizados correctamente.`
        })
        if (onUpdate) {
            await (onUpdate as any)()
        }
        await checkPhaseCompletion(phase, localEmpleado)
    }

    const handleSavePhase = async (phase: 'I' | 'L' | 'U', customState?: QueryHiluRow, additionalData: any = {}) => {
        const stateToUse = customState || localEmpleado;
        const tableMap = { 'I': 'fase_I', 'L': 'fase_L', 'U': 'fase_U' } as const
        const idMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_id', 'L': 'fl_id', 'U': 'fu_id' }
        const fieldMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_detalles', 'L': 'fl_detalles', 'U': 'fu_detalles' }

        const id = stateToUse[idMap[phase]] as number
        if (!id) {
            toast.error('No se encontró el ID de la fase')
            return
        }

        const dataToSave: any = {
            detalles: {
                ...(stateToUse[fieldMap[phase]] as object || {}),
                ...(phase === 'I' ? { mantenimiento_autonomo: stateToUse.fi_mantenimiento_autonomo } : {})
            },
            ...additionalData
        }

        if (phase === 'I') {
            dataToSave.estandar_hdt = stateToUse.fi_estandar_hdt
            dataToSave.entrenamiento_calidad = stateToUse.fi_entrenamiento_calidad
            dataToSave.hace_acompanado = stateToUse.fi_hace_acompanado
            dataToSave.hace_solo = stateToUse.fi_hace_solo
            dataToSave.curso_5s = stateToUse.fi_curso_5s
            dataToSave.actitud = stateToUse.fi_actitud
            dataToSave.aprendizaje = stateToUse.fi_aprendizaje
            dataToSave.destreza = stateToUse.fi_destreza
            dataToSave.conocimiento = stateToUse.fi_conocimiento
            dataToSave.comentario = stateToUse.fi_comentario
        } else if (phase === 'L') {
            dataToSave.cumple_calidad = stateToUse.fl_cumple_calidad
            dataToSave.cumple_estandar = stateToUse.fl_cumple_estandar
            dataToSave.cumple_mantenimiento_autonomo = stateToUse.fl_cumple_mantenimiento_autonomo
            dataToSave.cumple_tiempo = stateToUse.fl_cumple_tiempo
            dataToSave.comentario = stateToUse.fl_comentario
        } else if (phase === 'U') {
            dataToSave.capacitado_para_entrenar = stateToUse.fu_capacitado_para_entrenar
            dataToSave.entrena_solo = stateToUse.fu_entrena_solo
            dataToSave.acompana_entrenamientos = stateToUse.fu_acompana_entrenamientos
            dataToSave.comentario = stateToUse.fu_comentario
        }

        await updatePhase(tableMap[phase], id, dataToSave)
        await checkPhaseCompletion(phase, stateToUse)
    }

    // Tool Logic Helpers
    const handleToolCheck = (phase: 'I' | 'L' | 'U', tool: string, checkInfo: string, currentVal: boolean) => {
        const fieldMap: Record<string, keyof QueryHiluRow> = { 'I': 'fi_detalles', 'L': 'fl_detalles', 'U': 'fu_detalles' }

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
    }

    const checkPhaseCompletion = async (phase: 'H' | 'I' | 'L' | 'U', currentData: QueryHiluRow) => {
        const role = getRoleType(currentData.cargo)
        let isDone = false

        if (phase === 'H') {
            isDone = !!(currentData.fh_induccion_th &&
                currentData.fh_aros_seguridad &&
                currentData.fh_induccion_planta &&
                currentData.fh_puesto_piloto &&
                currentData.fh_observacion_puesto &&
                currentData.fh_explicacion_puesto &&
                currentData.fh_firma_empleado &&
                currentData.fh_firma_supervisor)
        } else if (role === 'OPERARIO') {
            if (phase === 'I') {
                isDone = !!(currentData.fi_estandar_hdt &&
                    currentData.fi_entrenamiento_calidad &&
                    currentData.fi_mantenimiento_autonomo &&
                    currentData.fi_hace_acompanado &&
                    currentData.fi_hace_solo &&
                    currentData.fi_curso_5s &&
                    currentData.fi_actitud &&
                    currentData.fi_aprendizaje &&
                    currentData.fi_destreza &&
                    currentData.fi_conocimiento &&
                    currentData.fi_firma_empleado &&
                    currentData.fi_firma_supervisor)
            } else if (phase === 'L') {
                isDone = !!(currentData.fl_cumple_calidad && currentData.fl_cumple_estandar && currentData.fl_cumple_mantenimiento_autonomo && currentData.fl_cumple_tiempo && currentData.fl_firma_empleado && currentData.fl_firma_supervisor)
            } else if (phase === 'U') {
                isDone = !!(currentData.fu_capacitado_para_entrenar && currentData.fu_entrena_solo && currentData.fu_acompana_entrenamientos && currentData.fu_firma_empleado && currentData.fu_firma_supervisor)
            }
        } else {
            // For non-operarios, check if all tools are complete
            const availableTools = role === 'SUPERVISOR_MEDIO'
                ? (phase === 'U' ? ['TE-EE'] : TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t)))
                : TOOLS_LIST

            const allToolsDone = availableTools.every(t => isToolComplete(phase as 'I' | 'L' | 'U', t))
            const fieldPrefix = `f${phase.toLowerCase()}`
            // @ts-ignore
            const hasSignatures = !!(currentData[`${fieldPrefix}_firma_empleado`] && currentData[`${fieldPrefix}_firma_supervisor`])
            isDone = allToolsDone && hasSignatures
        }

        const fieldPrefix = `f${phase.toLowerCase()}`
        // @ts-ignore
        const hasComment = !!(currentData[`${fieldPrefix}_comentario`]?.trim())
        // @ts-ignore
        const currentStatus = currentData[`${fieldPrefix}_completado`]
        // @ts-ignore
        const tableId = currentData[`${fieldPrefix}_id`]

        if (isDone && !hasComment && !currentStatus) {
            toast.error(`La fase ${phase} tiene todos los requisitos pero falta el comentario obligatorio.`)
            return
        }

        if (isDone && hasComment && !currentStatus) {
            const tableMap = { 'H': 'fase_H', 'I': 'fase_I', 'L': 'fase_L', 'U': 'fase_U' } as const
            await updatePhase(tableMap[phase], tableId as number, {
                completado: true,
                fecha_finalizacion_fase: new Date().toISOString()
            })
            // Extra toast for confirmation of completion
            alert(`¡Fase ${phase} completada satisfactoriamente!`)
        }
    }

    const isToolComplete = (phase: 'I' | 'L' | 'U', tool: string) => {
        const fieldName: keyof QueryHiluRow = phase === 'I' ? 'fi_detalles' : phase === 'L' ? 'fl_detalles' : 'fu_detalles'
        const details = (localEmpleado[fieldName] as unknown as ToolDetails) || {}
        const checks = phase === 'I' ? PHASE_I_CHECKS : phase === 'L' ? PHASE_L_CHECKS : PHASE_U_CHECKS
        return checks.every(chk => details[tool]?.[chk])
    }

    const renderToolGrid = (phase: 'I' | 'L' | 'U') => {
        const role = getRoleType(localEmpleado.cargo)
        const availableTools = role === 'SUPERVISOR_MEDIO'
            ? (phase === 'U' ? ['TE-EE'] : TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t)))
            : role === 'OPERARIO'
                ? TOOLS_LIST
                : TOOLS_LIST.filter(t => ![''].includes(t))
        const checks = phase === 'I' ? PHASE_I_CHECKS : phase === 'L' ? PHASE_L_CHECKS : PHASE_U_CHECKS
        const fieldName: keyof QueryHiluRow = phase === 'I' ? 'fi_detalles' : phase === 'L' ? 'fl_detalles' : 'fu_detalles'
        const details = (localEmpleado[fieldName] as unknown as ToolDetails) || {}
        const faseHComplete = !!localEmpleado.fh_completado;

        return (
            <div className="space-y-4">
                {availableTools.map(tool => {
                    // Per-tool conditional: L requires same tool complete in I, U requires same tool complete in L
                    const toolDisabled = !faseHComplete || (phase === 'L'
                        ? !isToolComplete('I', tool)
                        : phase === 'U'
                            ? !isToolComplete('L', tool)
                            : false)

                    const toolDetails = (details[tool] as Record<string, boolean>) || {}
                    const completedChecks = checks.filter(chk => toolDetails[chk]).length
                    const toolProgress = Math.round((completedChecks / checks.length) * 100)

                    return (
                        <div key={tool} className="flex items-center gap-4 border-b border-gray-100 pb-3 last:border-0">
                            {/* Col 1: Tool name + progress */}
                            <div className="flex flex-col w-[140px] shrink-0">
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
                            {/* Col 2: Checkboxes */}
                            <div className="flex-1 flex gap-1">
                                {checks.map(chk => (
                                    <div key={chk} className="flex-1">
                                        <PillCheckbox
                                            id={`${phase}-${tool}-${chk}`}
                                            label={chk}
                                            checked={toolDetails[chk] || false}
                                            disabled={toolDisabled}
                                            onChange={() => handleToolCheck(phase, tool, chk, toolDetails[chk] || false)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* Col 3: Save button */}
                            <div className="shrink-0 w-[130px] flex items-center justify-end">
                                {!toolDisabled && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleSaveToolPhase(phase, tool)}
                                        className="bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-1.5 h-[44px] w-full px-3 text-xs rounded-lg shadow-sm"
                                    >
                                        <Save className="h-3.5 w-3.5 shrink-0" />
                                        Guardar {tool}
                                    </Button>
                                )}
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
                    <CardContent className={`p-6 space-y-6 bg-[#f8f9fa] ${!canEditPhase('H') ? 'opacity-70 pointer-events-none' : ''}`}>
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
                                    const next = { ...localEmpleado, fh_induccion_th: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, {
                                        induccion_th: c,
                                        induccion_th_fecha: c ? new Date().toISOString() : null,
                                        induccion_th_responsable_id: c ? currentUser?.id : null
                                    }).then(() => checkPhaseCompletion('H', next))
                                }}
                            />

                            <PillCheckbox
                                id="fh_aros_seguridad"
                                label="Normas de seguridad"
                                checked={localEmpleado.fh_aros_seguridad || false}
                                onChange={(c) => {
                                    const next = { ...localEmpleado, fh_aros_seguridad: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, { aros_seguridad: c })
                                        .then(() => checkPhaseCompletion('H', next))
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
                                    const next = { ...localEmpleado, fh_induccion_planta: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, { induccion_planta: c })
                                        .then(() => checkPhaseCompletion('H', next))
                                }}
                            />
                            <PillCheckbox
                                id="fh_puesto_piloto"
                                label="Entrenamiento puesto piloto"
                                checked={localEmpleado.fh_puesto_piloto || false}
                                onChange={(c) => {
                                    const next = { ...localEmpleado, fh_puesto_piloto: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, { puesto_piloto: c })
                                        .then(() => checkPhaseCompletion('H', next))
                                }}
                            />
                            <PillCheckbox
                                id="fh_observacion_puesto"
                                label="Observación puesto de trabajo"
                                checked={localEmpleado.fh_observacion_puesto || false}
                                onChange={(c) => {
                                    const next = { ...localEmpleado, fh_observacion_puesto: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, { observacion_puesto: c })
                                        .then(() => checkPhaseCompletion('H', next))
                                }}
                            />
                            <PillCheckbox
                                id="fh_explicacion_puesto"
                                label="Explicación puesto de trabajo"
                                checked={localEmpleado.fh_explicacion_puesto || false}
                                onChange={(c) => {
                                    const next = { ...localEmpleado, fh_explicacion_puesto: c }
                                    setLocalEmpleado(next)
                                    updatePhase('fase_H', localEmpleado.fh_id!, { explicacion_puesto: c })
                                        .then(() => checkPhaseCompletion('H', next))
                                }}
                            />
                        </div>

                        {/* Bottom Section: Details & Signatures */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            {/* Comments */}
                            <div className="lg:col-span-3 space-y-2">
                                <Label className="text-gray-500 font-normal flex items-center gap-1">Comentarios <span className="text-red-500 font-bold">*</span></Label>
                                <textarea
                                    className="w-full h-[140px] p-3 rounded-md border border-gray-200 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Ingrese los comentarios de la fase..."
                                    defaultValue={localEmpleado.fh_comentario || ''}
                                    onBlur={(e) => {
                                        const next = { ...localEmpleado, fh_comentario: e.target.value }
                                        setLocalEmpleado(next)
                                        updatePhase('fase_H', localEmpleado.fh_id!, { comentario: e.target.value })
                                            .then(() => checkPhaseCompletion('H', next))
                                    }}
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

                            {/* Signatures & Save */}
                            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-4 border-t border-gray-100">
                                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <SignatureWidget
                                        label="Firma Empleado"
                                        value={localEmpleado.fh_firma_empleado}
                                        date={localEmpleado.fh_fecha_finalizacion_fase}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fh_firma_empleado: firma }
                                            setLocalEmpleado(next)
                                            updatePhase('fase_H', localEmpleado.fh_id!, { firma_empleado: firma })
                                                .then(() => checkPhaseCompletion('H', next))
                                        }}
                                    />
                                    <SignatureWidget
                                        label="Firma Supervisor"
                                        value={localEmpleado.fh_firma_supervisor}
                                        date={localEmpleado.fh_fecha_finalizacion_fase}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fh_firma_supervisor: firma }
                                            setLocalEmpleado(next)
                                            updatePhase('fase_H', localEmpleado.fh_id!, { firma_supervisor: firma })
                                                .then(() => checkPhaseCompletion('H', next))
                                        }}
                                    />
                                </div>

                                <div className="md:col-span-4 flex flex-col justify-end gap-6 h-full min-h-[220px]">
                                    <Button
                                        className="w-full bg-[#1e2f3d] hover:bg-[#2c4255] text-white flex items-center gap-2 h-12 shadow-lg"
                                        onClick={async () => {
                                            await checkPhaseCompletion('H', localEmpleado);
                                            alert('Información sincronizada correctamente');
                                        }}
                                    >
                                        <Save className="h-5 w-5" />
                                        Sincronizar Estatus
                                    </Button>

                                    <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                                        <Label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-widest text-center">Fecha de finalización</Label>
                                        <div className="h-10 flex items-center justify-center text-gray-600 font-bold text-sm bg-white rounded-lg border border-gray-200">
                                            {localEmpleado.fh_fecha_finalizacion_fase ? new Date(localEmpleado.fh_fecha_finalizacion_fase).toLocaleDateString() : 'Pendiente'}
                                        </div>
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
                localEmpleado.fi_estandar_hdt,
                localEmpleado.fi_entrenamiento_calidad,
                localEmpleado.fi_mantenimiento_autonomo,
                localEmpleado.fi_hace_acompanado,
                localEmpleado.fi_hace_solo,
                localEmpleado.fi_curso_5s,
                (localEmpleado.fi_actitud || 0) > 0,
                (localEmpleado.fi_aprendizaje || 0) > 0,
                (localEmpleado.fi_destreza || 0) > 0,
                (localEmpleado.fi_conocimiento || 0) > 0
            ]
            const completed = checks.filter(Boolean).length
            progress = Math.round((completed / 10) * 100)
        } else {
            const availableTools = role === 'SUPERVISOR_MEDIO'
                ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
                : TOOLS_LIST
            const completedTools = availableTools.filter(t => isToolComplete('I', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }

        const faseHComplete = !!localEmpleado.fh_completado;

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa I" progress={progress} isOpen={openPhase === 'I'} onClick={() => setOpenPhase(openPhase === 'I' ? null : 'I')} />
                {openPhase === 'I' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className={(!faseHComplete || !canEditPhase('I')) ? "opacity-60 pointer-events-none" : ""}>
                            {role === 'OPERARIO' ? (
                                <>
                                    {/* Row 1: Primary Checks */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                                            <Calendar className="h-5 w-5" />
                                            <span>{localEmpleado.fi_dias_transcurridos || 0} días en esta fase</span>
                                        </div>
                                        <div className="relative">
                                            <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                            <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                                {localEmpleado.fi_created_at ? new Date(localEmpleado.fi_created_at).toLocaleDateString() : 'Null'}
                                            </div>
                                        </div>
                                        <PillCheckbox id="fi_estandar_hdt" label="Estándar del puesto (HDT)" checked={localEmpleado.fi_estandar_hdt || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_estandar_hdt: c }))
                                        }} />
                                        <PillCheckbox id="fi_entrenamiento_calidad" label="Entrenamiento de calidad" checked={localEmpleado.fi_entrenamiento_calidad || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_entrenamiento_calidad: c }))
                                        }} />
                                    </div>

                                    {/* Row 2: Performance Checks */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <PillCheckbox id="fi_mantenimiento_autonomo" label="Entrenamiento en mantenimiento autónomo del puesto" checked={localEmpleado.fi_mantenimiento_autonomo || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_mantenimiento_autonomo: c }))
                                        }} />
                                        <PillCheckbox id="fi_hace_acompanado" label="Hace acompañado" checked={localEmpleado.fi_hace_acompanado || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_hace_acompanado: c }))
                                        }} />
                                        <PillCheckbox id="fi_hace_solo" label="Hace solo" checked={localEmpleado.fi_hace_solo || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_hace_solo: c }))
                                        }} />
                                        <PillCheckbox id="fi_curso_5s" label="5S" checked={localEmpleado.fi_curso_5s || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fi_curso_5s: c }))
                                        }} />
                                    </div>

                                    {/* Row 3: Ratings */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100">
                                        <StarRating
                                            label="Actitud"
                                            value={localEmpleado.fi_actitud || 0}
                                            onChange={(v) => {
                                                setLocalEmpleado(prev => ({ ...prev, fi_actitud: v }))
                                            }}
                                        />
                                        <StarRating
                                            label="Aprendizaje"
                                            value={localEmpleado.fi_aprendizaje || 0}
                                            onChange={(v) => {
                                                setLocalEmpleado(prev => ({ ...prev, fi_aprendizaje: v }))
                                            }}
                                        />
                                        <StarRating
                                            label="Destreza"
                                            value={localEmpleado.fi_destreza || 0}
                                            onChange={(v) => {
                                                setLocalEmpleado(prev => ({ ...prev, fi_destreza: v }))
                                            }}
                                        />
                                        <StarRating
                                            label="Conocimiento"
                                            value={localEmpleado.fi_conocimiento || 0}
                                            onChange={(v) => {
                                                setLocalEmpleado(prev => ({ ...prev, fi_conocimiento: v }))
                                            }}
                                        />
                                        <StarRating
                                            label="Promedio"
                                            value={localEmpleado.fi_promedio || Math.round(((localEmpleado.fi_actitud || 0) + (localEmpleado.fi_aprendizaje || 0) + (localEmpleado.fi_destreza || 0) + (localEmpleado.fi_conocimiento || 0)) / 4) || 0}
                                            disabled
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                                    <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase I</h4>
                                    {renderToolGrid('I')}
                                </div>
                            )}
                        </div>

                        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4 border-t border-gray-100 ${!faseHComplete ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="lg:col-span-3 space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1">Comentarios <span className="text-red-500 font-bold">*</span></Label>
                                    <textarea className="w-full h-[120px] p-4 rounded-lg bg-gray-50/50 border border-gray-100 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" defaultValue={localEmpleado.fi_comentario || ''} onBlur={(e) => {
                                        const next = { ...localEmpleado, fi_comentario: e.target.value }
                                        setLocalEmpleado(next)
                                    }} />
                                </div>
                            </div>

                            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Empleado"
                                        value={localEmpleado.fi_firma_empleado}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fi_firma_empleado: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('I', next, { firma_empleado: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Supervisor"
                                        value={localEmpleado.fi_firma_supervisor}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fi_firma_supervisor: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('I', next, { firma_supervisor: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4 flex flex-col justify-between gap-4 h-full min-h-[220px]">
                                    <div className="bg-white rounded-xl border border-gray-200 p-2 h-full">
                                        <Label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Evidencias Adjuntas</Label>
                                        <EvidenciasComponent evidencias={localEmpleado.fi_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_I', localEmpleado.fi_id!, { evidencias: evs })} path="fase-i" />
                                    </div>
                                    <Button className={`w-full text-white flex items-center gap-2 h-12 shadow-lg rounded-xl ${progress < 100 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1e2f3d] hover:bg-[#2c4255]'}`} onClick={() => handleSavePhase('I')} disabled={progress < 100}><Save className="h-5 w-5" /> Guardar Fase I</Button>
                                </div>
                            </div>
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
                localEmpleado.fl_cumple_tiempo,
                localEmpleado.fl_cumple_mantenimiento_autonomo
            ]
            const completed = checks.filter(Boolean).length
            progress = Math.round((completed / 4) * 100)
        } else {
            const availableTools = role === 'SUPERVISOR_MEDIO'
                ? TOOLS_LIST.filter(t => !['OPT SIS', 'QRQC'].includes(t))
                : TOOLS_LIST
            const completedTools = availableTools.filter(t => isToolComplete('L', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }
        // Phase L is disabled until ALL phase I checks are complete (OPERARIO only)
        const faseHComplete = !!localEmpleado.fh_completado;
        const faseIComplete = !!(localEmpleado.fi_estandar_hdt && localEmpleado.fi_entrenamiento_calidad && localEmpleado.fi_mantenimiento_autonomo && localEmpleado.fi_hace_acompanado && localEmpleado.fi_hace_solo)
        const canEditL = faseHComplete && faseIComplete;

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa L" progress={progress} isOpen={openPhase === 'L'} onClick={() => setOpenPhase(openPhase === 'L' ? null : 'L')} />
                {openPhase === 'L' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        {role === 'OPERARIO' ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                                    <Calendar className="h-5 w-5" />
                                    <span>{localEmpleado.fl_dias_transcurridos || 0} días en esta fase</span>
                                </div>
                                <div className="relative">
                                    <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                    <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                        {localEmpleado.fl_created_at ? new Date(localEmpleado.fl_created_at).toLocaleDateString() : 'Null'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                                    <Calendar className="h-5 w-5" />
                                    <span>{localEmpleado.fl_dias_transcurridos || 0} días en esta fase</span>
                                </div>
                                <div className="relative">
                                    <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                    <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                        {localEmpleado.fl_created_at ? new Date(localEmpleado.fl_created_at).toLocaleDateString() : 'Null'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!faseHComplete && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
                                ⚠️ Complete la Fase H para habilitar las herramientas de la Fase L
                            </div>
                        )}

                        {role === 'OPERARIO' ? (
                            <div className="space-y-2">
                                {(faseHComplete && !faseIComplete) && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg">
                                        ⚠️ Complete todas las habilidades de la Fase I para habilitar la Fase L
                                    </div>
                                )}
                                <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${(!faseIComplete || !canEditPhase('L')) ? 'opacity-60 pointer-events-none' : ''}`}>
                                    <PillCheckbox id="fl_cumple_calidad" label="Cumple Calidad" checked={localEmpleado.fl_cumple_calidad || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_calidad: c }))
                                    }} />
                                    <PillCheckbox id="fl_cumple_estandar" label="Cumple Estándar" checked={localEmpleado.fl_cumple_estandar || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_estandar: c }))
                                    }} />
                                    <PillCheckbox id="fl_cumple_mantenimiento_autonomo" label="Cumple con el mantenimiento autónomo de su puesto" checked={localEmpleado.fl_cumple_mantenimiento_autonomo || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_mantenimiento_autonomo: c }))
                                    }} />
                                    <PillCheckbox id="fl_cumple_tiempo" label="Cumple Tiempo" checked={localEmpleado.fl_cumple_tiempo || false} disabled={!faseIComplete} onChange={(c) => {
                                        setLocalEmpleado(prev => ({ ...prev, fl_cumple_tiempo: c }))
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase L</h4>
                                {renderToolGrid('L')}
                            </div>
                        )}

                        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4 border-t border-gray-100 ${(!faseHComplete || !canEditPhase('L')) ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="lg:col-span-3">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm h-full">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1">Comentarios de Entrenamiento <span className="text-red-500 font-bold">*</span></Label>
                                    <textarea className="w-full h-[154px] p-4 rounded-lg bg-gray-50/10 border border-gray-100 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium" defaultValue={localEmpleado.fl_comentario || ''} onBlur={(e) => {
                                        const next = { ...localEmpleado, fl_comentario: e.target.value }
                                        setLocalEmpleado(next)
                                    }} />
                                </div>
                            </div>

                            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Empleado"
                                        value={localEmpleado.fl_firma_empleado}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fl_firma_empleado: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('L', next, { firma_empleado: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Supervisor"
                                        value={localEmpleado.fl_firma_supervisor}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fl_firma_supervisor: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('L', next, { firma_supervisor: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4 flex flex-col justify-between gap-4 h-full min-h-[220px]">
                                    <div className="bg-white rounded-xl border border-gray-200 p-2 h-full">
                                        <Label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Evidencias de L</Label>
                                        <EvidenciasComponent evidencias={localEmpleado.fl_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_L', localEmpleado.fl_id!, { evidencias: evs })} path="fase-l" />
                                    </div>
                                    <Button className={`w-full text-white flex items-center gap-2 h-12 shadow-lg rounded-xl ${progress < 100 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1e2f3d] hover:bg-[#2c4255]'}`} onClick={() => handleSavePhase('L')} disabled={progress < 100}><Save className="h-5 w-5" /> Guardar Fase L</Button>
                                </div>
                            </div>
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
            const availableTools = role === 'SUPERVISOR_MEDIO'
                ? ['TE-EE']
                : TOOLS_LIST
            const completedTools = availableTools.filter(t => isToolComplete('U', t)).length
            progress = availableTools.length > 0 ? Math.round((completedTools / availableTools.length) * 100) : 0
        }
        // Phase U is disabled until ALL phase L checks are complete (OPERARIO only)
        const faseHComplete = !!localEmpleado.fh_completado;
        const faseLComplete = !!(localEmpleado.fl_cumple_calidad && localEmpleado.fl_cumple_estandar && localEmpleado.fl_cumple_tiempo)
        const canEditU = faseHComplete && faseLComplete && canEditPhase('U');

        return (
            <Card className="border-none shadow-none bg-[#f8f9fa] mt-4">
                <PhaseHeader title="Etapa U" progress={progress} isOpen={openPhase === 'U'} onClick={() => setOpenPhase(openPhase === 'U' ? null : 'U')} />
                {openPhase === 'U' && (
                    <CardContent className="p-6 space-y-6 bg-[#f8f9fa]">
                        <div className={!canEditU ? "opacity-60 pointer-events-none" : ""}>
                            {role === 'OPERARIO' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap overflow-hidden">
                                            <Calendar className="h-5 w-5 flex-shrink-0" />
                                            <span className="text-sm truncate">{localEmpleado.fu_dias_transcurridos || 0} dias en esta fase</span>
                                        </div>
                                        <div className="relative">
                                            <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                            <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                                {localEmpleado.fu_created_at ? new Date(localEmpleado.fu_created_at).toLocaleDateString() : 'Null'}
                                            </div>
                                        </div>
                                        <PillCheckbox id="fu_capacitado_para_entrenar" label="Capacitado para entrenar" checked={localEmpleado.fu_capacitado_para_entrenar || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fu_capacitado_para_entrenar: c }))
                                        }} />
                                        <PillCheckbox id="fu_acompana_entrenamientos" label="Acompaña entrenamientos" checked={localEmpleado.fu_acompana_entrenamientos || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fu_acompana_entrenamientos: c }))
                                        }} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <PillCheckbox id="fu_entrena_solo" label="Sabe entrenar solo" checked={localEmpleado.fu_entrena_solo || false} onChange={(c) => {
                                            setLocalEmpleado(prev => ({ ...prev, fu_entrena_solo: c }))
                                        }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap overflow-hidden">
                                            <Calendar className="h-5 w-5 flex-shrink-0" />
                                            <span className="text-sm truncate">{localEmpleado.fu_dias_transcurridos || 0} dias en esta fase</span>
                                        </div>
                                        <div className="relative">
                                            <Label className="absolute -top-2 left-2 bg-[#f8f9fa] px-1 text-xs text-gray-500">Fecha de inicio</Label>
                                            <div className="bg-gray-200 rounded-md h-10 flex items-center px-3 text-gray-600 text-sm">
                                                {localEmpleado.fu_created_at ? new Date(localEmpleado.fu_created_at).toLocaleDateString() : 'Null'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                                        <h4 className="font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">Evaluación por Herramienta - Fase U</h4>
                                        {renderToolGrid('U')}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4 border-t border-gray-100`}>
                            <div className="lg:col-span-3 space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1">Comentarios <span className="text-red-500 font-bold">*</span></Label>
                                    <textarea
                                        className="w-full h-[120px] p-4 rounded-lg bg-gray-50/50 border border-gray-100 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                        defaultValue={localEmpleado.fu_comentario || ''}
                                        onBlur={(e) => {
                                            const next = { ...localEmpleado, fu_comentario: e.target.value }
                                            setLocalEmpleado(next)
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Firma Empleado"
                                        value={localEmpleado.fu_firma_empleado}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fu_firma_empleado: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('U', next, { firma_empleado: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <SignatureWidget
                                        label="Firma Supervisor"
                                        value={localEmpleado.fu_firma_supervisor}
                                        onSave={(firma) => {
                                            const next = { ...localEmpleado, fu_firma_supervisor: firma }
                                            setLocalEmpleado(next)
                                            handleSavePhase('U', next, { firma_supervisor: firma })
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-4 flex flex-col justify-between gap-4 h-full min-h-[220px]">
                                    <div className="bg-white rounded-xl border border-gray-200 p-2 h-full">
                                        <Label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Evidencias Adjuntas</Label>
                                        <EvidenciasComponent evidencias={localEmpleado.fu_evidencias || []} onEvidenciasChange={(evs) => updatePhase('fase_U', localEmpleado.fu_id!, { evidencias: evs })} path="fase-u" />
                                    </div>
                                    <Button className={`w-full text-white flex items-center gap-2 h-12 shadow-lg rounded-xl ${progress < 100 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1e2f3d] hover:bg-[#2c4255]'}`} onClick={() => handleSavePhase('U')} disabled={progress < 100}><Save className="h-5 w-5" /> Guardar Fase U</Button>
                                </div>
                            </div>
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
