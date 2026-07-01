'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Save, Briefcase, User, FileText, ChevronDown, History } from 'lucide-react'
import { toast } from 'sonner'
import { CrearFirma, VerFirma } from './FirmaComponents'
import { EvidenciasComponent } from './EvidenciasComponent'

const AREAS_ADMINISTRATIVAS = [
    'Contabilidad', 'Financiera', 'Legal', 'TI', 'Talento y Cultura',
    'Negociacion y compras', 'Mercadeo', 'Servicios', 'Logistica', 'I+D+I', 'Comercial'
]

const PillCheckbox = ({ checked, onChange, label, disabled }: { checked: boolean, onChange: (c: boolean) => void, label: string, disabled?: boolean }) => (
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
                    typeof value === 'string' ? <VerFirma firmaUrl={value} /> : <div className="text-green-600 font-bold text-center">Firma Electrónica Confirmada</div>
                ) : (
                    <CrearFirma onFirmaGuardada={onSave} />
                )}
            </div>
        </div>
    </div>
)

interface Props {
    empleadoId: string;
    cargo: string;
    canEdit: boolean;
}

interface EmpleadoItem {
    id: number
    nombreCompleto: string
    cargo: string | null
}

export function ReemplazosAdminComponent({ empleadoId, cargo, canEdit }: Props) {
    const supabase = createClient()
    const [empleados, setEmpleados] = useState<EmpleadoItem[]>([])
    const [cargos, setCargos] = useState<string[]>([])
    const [recordId, setRecordId] = useState<number | null>(null)

    // UI State for form
    const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>([])
    const [selectedCargo, setSelectedCargo] = useState<string>('')
    const [empSearch, setEmpSearch] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [archivos, setArchivos] = useState<string[]>([])
    const [isValidado, setIsValidado] = useState<boolean>(false)
    const [firmaQuienEntrega, setFirmaQuienEntrega] = useState<string | null>(null)
    const [firmaQuienRecibe, setFirmaQuienRecibe] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isAsignacionOpen, setIsAsignacionOpen] = useState(true)
    const [isHistorialOpen, setIsHistorialOpen] = useState(false)
    const [historial, setHistorial] = useState<any[]>([])

    // Load existing reemplazo record for this employee
    useEffect(() => {
        const fetchExisting = async () => {
            const { data } = await (supabase as any)
                .from('hilu_admin_reemplazos')
                .select('*')
                .eq('empleado_id', empleadoId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (data) {
                setRecordId(data.id)
                // Support both old single-id and new array column
                const ids = data.reemplazo_empleado_ids?.map(String) ||
                    (data.reemplazo_empleado_id ? [data.reemplazo_empleado_id.toString()] : [])
                setSelectedEmpleados(ids)
                setSelectedCargo(data.cargo_reemplazado || '')
                setArchivos(data.archivos || [])
                setIsValidado(data.validado || false)
                setFirmaQuienEntrega(data.firma_quien_entrega || null)
                setFirmaQuienRecibe(data.firma_quien_recibe || null)
            }
        }
        fetchExisting()
    }, [supabase, empleadoId])

    // Load history of assignments for this employee
    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await (supabase as any)
                .from('hilu_admin_reemplazos')
                .select('*')
                .contains('reemplazo_empleado_ids', [Number(empleadoId)])
                .order('created_at', { ascending: false })

            if (data) {
                setHistorial(data)
            }
        }
        fetchHistory()
    }, [supabase, empleadoId])

    useEffect(() => {
        const fetchDatos = async () => {
            try {
                // Fetch empleados administrativos
                const adminAreas = AREAS_ADMINISTRATIVAS.map(a => `area.eq.${a}`).join(',')
                const { data: rawData } = await supabase
                    .from('query_estado_hilu')
                    .select('id, nombreCompleto, cargo')
                    .eq('activo', true)
                    .or(`${adminAreas},nivelCargo.in.("Jefe","Coordinador","Director","Gerente","Supervisor")`)
                    .order('nombreCompleto')

                const empData = (rawData ?? []) as EmpleadoItem[]
                if (empData.length > 0) {
                    setEmpleados(empData)
                    // Extraer cargos únicos
                    const uniqueCargos = Array.from(new Set(empData.map(e => e.cargo).filter(Boolean))).sort() as string[]
                    setCargos(uniqueCargos)
                }
            } catch (error) {
                console.error("Error fetching data for Reemplazos:", error)
            }
        }
        fetchDatos()
    }, [supabase])

    const upsertRecord = async (extraFields: Record<string, any> = {}) => {
        const payload = {
            empleado_id: Number(empleadoId),
            reemplazo_empleado_ids: selectedEmpleados.map(Number),
            reemplazo_empleado_id: selectedEmpleados.length > 0 ? Number(selectedEmpleados[0]) : null, // backward compat
            cargo_reemplazado: selectedCargo || null,
            archivos,
            validado: isValidado,
            firma_quien_entrega: firmaQuienEntrega,
            firma_quien_recibe: firmaQuienRecibe,
            updated_at: new Date().toISOString(),
            ...extraFields
        }

        if (recordId) {
            const { error } = await (supabase as any)
                .from('hilu_admin_reemplazos')
                .update(payload)
                .eq('id', recordId)
            if (error) throw error
        } else {
            const { data, error } = await (supabase as any)
                .from('hilu_admin_reemplazos')
                .insert(payload)
                .select('id')
                .single()
            if (error) throw error
            if (data?.id) setRecordId(data.id)
        }
    }

    const handleSave = async () => {
        if (selectedEmpleados.length === 0 || !selectedCargo) {
            toast.error("Debes seleccionar al menos un empleado y un cargo.")
            return
        }
        setIsSaving(true)
        try {
            await upsertRecord()
            toast.success("Registro de reemplazo guardado correctamente.")

            // Fire-and-forget email notification (does NOT block or affect save)
            void (async () => {
                try {
                    const response = await fetch('/api/email/reemplazo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ empleadoId, selectedEmpleados, selectedCargo })
                    });
                    if (response.ok) {
                        toast.success("Notificaciones enviadas por correo.");
                    } else {
                        const errText = await response.text().catch(() => 'Sin detalles');
                        console.warn("Email no enviado:", errText);
                    }
                } catch (emailErr) {
                    console.warn("Error enviando correo (no afecta el guardado):", emailErr);
                }
            })();

        } catch (error: any) {
            console.error("Error en upsertRecord:", error)
            const msg = error?.message || JSON.stringify(error) || 'Error desconocido'
            toast.error("Error al guardar: " + msg)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4 mt-4">
            {/* Sección: Asignación de Reemplazos / Polivalencias */}
            <Card className="border-none shadow-none bg-[#f8f9fa] rounded-xl overflow-hidden">
                <div 
                    className="w-full bg-[#374151] text-white px-6 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-[#2a3240]"
                    onClick={() => setIsAsignacionOpen(!isAsignacionOpen)}
                >
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5" />
                        <h3 className="font-medium text-lg">Asignación de Reemplazos / Polivalencias</h3>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isAsignacionOpen ? 'rotate-180' : ''}`} />
                </div>

                {isAsignacionOpen && (
                    <CardContent className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            {/* Dropdown multi-select con búsqueda */}
                            <div className="space-y-2" ref={dropdownRef}>
                                <Label className="text-gray-700 font-bold flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-500" />
                                    Persona(s) encargada(s) en mi ausencia
                                </Label>

                                {/* Trigger button */}
                                <div
                                    className={`relative w-full rounded-lg border border-gray-200 bg-gray-50 cursor-pointer ${!canEdit ? 'opacity-60 pointer-events-none' : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(prev => !prev)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left"
                                    >
                                        {selectedEmpleados.length === 0 ? (
                                            <span className="text-gray-400">Seleccione personas...</span>
                                        ) : (
                                            <span className="text-blue-700 font-semibold">
                                                {selectedEmpleados.length === 1
                                                    ? empleados.find(e => e.id.toString() === selectedEmpleados[0])?.nombreCompleto || '1 persona'
                                                    : `${selectedEmpleados.length} personas seleccionadas`}
                                            </span>
                                        )}
                                        <svg className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    {/* Dropdown panel */}
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                                            {/* Search input */}
                                            <div className="p-2 border-b border-gray-100">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Buscar persona..."
                                                    value={empSearch}
                                                    onChange={e => setEmpSearch(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Options list */}
                                            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                                                {empleados
                                                    .filter(emp =>
                                                        emp.nombreCompleto?.toLowerCase().includes(empSearch.toLowerCase()) ||
                                                        emp.cargo?.toLowerCase().includes(empSearch.toLowerCase())
                                                    )
                                                    .map(emp => {
                                                        const isChecked = selectedEmpleados.includes(emp.id.toString())
                                                        return (
                                                            <div
                                                                key={emp.id}
                                                                onClick={() => {
                                                                    setSelectedEmpleados(prev =>
                                                                        isChecked
                                                                            ? prev.filter(id => id !== emp.id.toString())
                                                                            : [...prev, emp.id.toString()]
                                                                    )
                                                                }}
                                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                                                                    }`}>
                                                                    {isChecked && (
                                                                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-800">{emp.nombreCompleto}</p>
                                                                    <p className="text-xs text-gray-400">{emp.cargo}</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                {empleados.filter(emp =>
                                                    emp.nombreCompleto?.toLowerCase().includes(empSearch.toLowerCase()) ||
                                                    emp.cargo?.toLowerCase().includes(empSearch.toLowerCase())
                                                ).length === 0 && (
                                                        <p className="text-center text-sm text-gray-400 py-6">Sin resultados</p>
                                                    )}
                                            </div>

                                            {/* Footer */}
                                            <div className="p-2 border-t border-gray-100 flex justify-between items-center">
                                                <span className="text-xs text-gray-400">{selectedEmpleados.length} seleccionada(s)</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                                >Listo</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Selected chips */}
                                {selectedEmpleados.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {selectedEmpleados.map(id => {
                                            const emp = empleados.find(e => e.id.toString() === id)
                                            if (!emp) return null
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                                    {emp.nombreCompleto}
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedEmpleados(prev => prev.filter(i => i !== id))}
                                                            className="ml-0.5 hover:text-red-600 transition-colors"
                                                        >&times;</button>
                                                    )}
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Listado de Cargos */}
                            <div className="space-y-3">
                                <Label className="text-gray-700 font-bold flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-blue-500" />
                                    Cargo a Reemplazar
                                </Label>
                                <select
                                    className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    value={selectedCargo}
                                    onChange={(e) => setSelectedCargo(e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="">Seleccione un cargo...</option>
                                    {cargos.map((c, idx) => (
                                        <option key={idx} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Archivos / Evidencias */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                <Label className="text-gray-700 font-bold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    Archivos de Soporte
                                </Label>
                                <p className="text-xs text-gray-500 pb-2">Sube documentos o certificaciones relacionadas con el cargo a reemplazar (manual paso a paso, acta de entrega, pendientes).</p>
                                <EvidenciasComponent
                                    evidencias={archivos}
                                    onEvidenciasChange={(evs) => setArchivos(evs)}
                                    path={`hilu-admin-reemplazos/${empleadoId}`}
                                    readOnly={!canEdit}
                                />
                            </div>

                            {/* Validacion (Checkbutton) */}
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                <Label className="text-gray-700 font-bold mb-4">Validación Requerida</Label>
                                <PillCheckbox
                                    label="Confirmo que el empleado fue capacitado para desempeñar el cargo a reemplazar"
                                    checked={isValidado}
                                    onChange={(c) => setIsValidado(c)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        {/* Firmas */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <Label className="text-gray-700 font-bold block mb-4">Firmas de Aprobación</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SignatureWidget
                                    label="Firma de Quien Entrega el Cargo"
                                    value={firmaQuienEntrega}
                                    onSave={async (firma) => {
                                        setFirmaQuienEntrega(firma)
                                        try {
                                            await upsertRecord({ firma_quien_entrega: firma })
                                        } catch (e) { console.error(e) }
                                    }}
                                />
                                <SignatureWidget
                                    label="Firma de Quien Recibe el Cargo"
                                    value={firmaQuienRecibe}
                                    onSave={async (firma) => {
                                        setFirmaQuienRecibe(firma)
                                        try {
                                            await upsertRecord({ firma_quien_recibe: firma })
                                        } catch (e) { console.error(e) }
                                    }}
                                />
                            </div>
                        </div>

                        {canEdit && (
                            <div className="flex justify-end pt-4">
                                <Button
                                    className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white px-8 h-12 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" />Guardar Registro de Reemplazo</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Sección: Historial de Asignaciones */}
            <Card className="border-none shadow-none bg-[#f8f9fa] rounded-xl overflow-hidden">
                <div 
                    className="w-full bg-[#374151] text-white px-6 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-[#2a3240]"
                    onClick={() => setIsHistorialOpen(!isHistorialOpen)}
                >
                    <div className="flex items-center gap-3">
                        <History className="h-5 w-5" />
                        <h3 className="font-medium text-lg">Historial de Asignaciones de Reemplazos / Polivalencias</h3>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isHistorialOpen ? 'rotate-180' : ''}`} />
                </div>

                {isHistorialOpen && (
                    <CardContent className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        {historial.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <p>No te han asignado como reemplazo de nadie en este momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {historial.map(rec => {
                                    const creador = empleados.find(e => e.id === rec.empleado_id)?.nombreCompleto || `Colaborador ID: ${rec.empleado_id}`
                                    return (
                                        <div key={rec.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5 hover:border-blue-200 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Empleado a Reemplazar</p>
                                                    <p className="font-semibold text-gray-800 text-sm">{creador}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-3">
                                                <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Cargo a Reemplazar</p>
                                                    <p className="text-gray-700 text-sm font-medium">{rec.cargo_reemplazado || 'No especificado'}</p>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5" /> Archivos de Soporte
                                                </p>
                                                <EvidenciasComponent
                                                    evidencias={rec.archivos || []}
                                                    onEvidenciasChange={() => {}}
                                                    path={`hilu-admin-reemplazos/${rec.empleado_id}`}
                                                    readOnly={true}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
