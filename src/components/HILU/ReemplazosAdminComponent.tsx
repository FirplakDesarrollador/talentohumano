'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Save, Briefcase, User, FileText } from 'lucide-react'
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
                    typeof value === 'string' && value.startsWith('http') ? <VerFirma firmaUrl={value} /> : <div className="text-green-600 font-bold text-center">Firma Electrónica Confirmada</div>
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

    // UI State for form
    const [selectedEmpleado, setSelectedEmpleado] = useState<string>('')
    const [selectedCargo, setSelectedCargo] = useState<string>('')
    const [archivos, setArchivos] = useState<string[]>([])
    const [isValidado, setIsValidado] = useState<boolean>(false)
    const [firmaQuienEntrega, setFirmaQuienEntrega] = useState<string | null>(null)
    const [firmaQuienRecibe, setFirmaQuienRecibe] = useState<string | null>(null)

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

    const handleSave = () => {
        if (!selectedEmpleado || !selectedCargo) {
            toast.error("Debes seleccionar un empleado y un cargo.")
            return
        }
        // TODO: Save to database when a table is defined for this.
        toast.success("Datos guardados temporalmente en la interfaz.")
        console.log({
            empleadoId,
            reemplazoSeleccionado: selectedEmpleado,
            cargoSeleccionado: selectedCargo,
            archivos,
            isValidado,
            firmaQuienEntrega,
            firmaQuienRecibe
        })
    }

    return (
        <Card className="border-none shadow-none bg-[#f8f9fa] mt-4 rounded-xl overflow-hidden">
            <div className="w-full bg-[#374151] text-white px-6 py-4 flex items-center gap-3">
                <Briefcase className="h-5 w-5" />
                <h3 className="font-medium text-lg">Asignación de Reemplazos / Polivalencias</h3>
            </div>

            <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    {/* Listado de Empleados */}
                    <div className="space-y-3">
                        <Label className="text-gray-700 font-bold flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            Persona a Reemplazar
                        </Label>
                        <select
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            value={selectedEmpleado}
                            onChange={(e) => setSelectedEmpleado(e.target.value)}
                            disabled={!canEdit}
                        >
                            <option value="">Seleccione un empleado...</option>
                            {empleados.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nombreCompleto} - {emp.id}
                                </option>
                            ))}
                        </select>
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
                            onSave={(firma) => setFirmaQuienEntrega(firma)}
                        />
                        <SignatureWidget
                            label="Firma de Quien Recibe el Cargo"
                            value={firmaQuienRecibe}
                            onSave={(firma) => setFirmaQuienRecibe(firma)}
                        />
                    </div>
                </div>

                {canEdit && (
                    <div className="flex justify-end pt-4">
                        <Button
                            className="bg-[#1e2f3d] hover:bg-[#2a4054] text-white px-8 h-12 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                            onClick={handleSave}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Registro de Reemplazo
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
