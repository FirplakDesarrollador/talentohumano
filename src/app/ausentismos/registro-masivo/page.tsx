'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
    Plus,
    ArrowLeft,
    Users,
    Loader2,
    Calendar,
    Save,
    CheckSquare,
    Square,
    UserCircle,
    FileUp
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const MOTIVOS = [
    'Pendiente',
    'Ausencia Injustificada',
    'incapacidad Enfermedad General',
    'Incapacidad Accidente de Trabajo',
    'Licencia de Maternidad',
    'Licencia de Paternidad',
    'Licencia por Luto',
    'Permiso Remunerado',
    'Permiso No Remunerado',
    'Suspension',
    'Calamidad Domestica',
    'Otro'
].sort();

export default function RegistroMasivoPage() {
    const router = useRouter()
    const supabase = createClient()

    // Data State
    const [jefes, setJefes] = useState<string[]>([])
    const [selectedJefe, setSelectedJefe] = useState('')
    const [employees, setEmployees] = useState<any[]>([])
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])

    // UI State
    const [loading, setLoading] = useState(false)
    const [fetchingJefes, setFetchingJefes] = useState(true)
    const [fetchingEmployees, setFetchingEmployees] = useState(false)

    // Form State (Shared for all selected)
    const [formData, setFormData] = useState({
        motivo: 'Pendiente',
        codigoIncapacidad: '',
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        fechaFinal: format(new Date(), 'yyyy-MM-dd'),
        observaciones: '',
        descontarNomina: false
    });

    // 1. Fetch Jefes
    useEffect(() => {
        const fetchJefes = async () => {
            setFetchingJefes(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    console.log('No user session found, skipping fetch')
                    return
                }

                const { data, error } = await supabase
                    .from('empleados')
                    .select('jefe')
                    .not('jefe', 'is', null)
                    .eq('activo', true)

                if (error) throw error
                const uniqueJefes = Array.from(new Set((data as any[]).map(e => e.jefe).filter(Boolean))) as string[]
                setJefes(uniqueJefes.sort())
            } catch (err) {
                console.error('Error fetching jefes:', err)
                toast.error('Error al cargar la lista de jefes')
            } finally {
                setFetchingJefes(false)
            }
        }
        fetchJefes()
    }, [supabase])

    // 2. Fetch Employees when Jefe changes
    useEffect(() => {
        const fetchEmployees = async () => {
            if (!selectedJefe) {
                setEmployees([])
                setSelectedEmployees([])
                return
            }

            setFetchingEmployees(true)
            try {
                const { data, error } = await supabase
                    .from('empleados')
                    .select('*')
                    .eq('jefe', selectedJefe)
                    .eq('activo', true)
                    .order('nombreCompleto', { ascending: true })

                if (error) throw error
                setEmployees(data || [])
                setSelectedEmployees([]) // Reset selection
            } catch (err) {
                console.error('Error fetching employees:', err)
                toast.error('Error al cargar empleados del jefe seleccionado')
            } finally {
                setFetchingEmployees(false)
            }
        }
        fetchEmployees()
    }, [selectedJefe, supabase])

    const toggleEmployee = (id: number) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        )
    }

    const toggleAll = () => {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([])
        } else {
            setSelectedEmployees(employees.map(e => e.id))
        }
    }

    const handleSave = async () => {
        if (selectedEmployees.length === 0) {
            toast.error('Debe seleccionar al menos un empleado')
            return
        }

        setLoading(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const creator = userData.user?.email || 'Sistema'
            const timestamp = new Date().toISOString()

            const recordsToInsert = selectedEmployees.map(id => {
                const emp = employees.find(e => e.id === id)
                return {
                    'Título': emp.cedula,
                    'Nombre Completo': emp.nombreCompleto,
                    'Motivo Ausentismo': formData.motivo,
                    'Codigo Incapacidad': formData.codigoIncapacidad,
                    'FechaInicio': formData.fechaInicio,
                    'FechaFinal': formData.fechaFinal,
                    'Observaciones': formData.observaciones,
                    'Planta': emp.planta,
                    'Jefe': emp.jefe,
                    'Contrato': emp.empresa,
                    'Cargo': emp.cargo,
                    'Descontar nomina': formData.descontarNomina ? 'Si' : 'No',
                    'Creado por': creator,
                    'Creado': timestamp
                }
            })

            // Attempt upper case first
            const { error } = await supabase.from('Ausentismos' as any).insert(recordsToInsert as any)

            if (error) {
                // Try lower case
                const { error: errorLow } = await supabase.from('ausentismos' as any).insert(recordsToInsert as any)
                if (errorLow) throw errorLow
            }

            toast.success(`${selectedEmployees.length} ausentismos registrados con éxito`)
            router.push('/ausentismos')
        } catch (err: any) {
            console.error('Error in bulk insert:', err)
            toast.error('Error al guardar: ' + (err.message || 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Header */}
            <header className="bg-[#1D3557] text-white px-8 py-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <FileUp className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight uppercase">Registro Masivo</h1>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Múltiples empleados por jefe</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Selector & List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Seleccionar Jefe / Supervisor</Label>
                            <select
                                value={selectedJefe}
                                onChange={(e) => setSelectedJefe(e.target.value)}
                                disabled={fetchingJefes}
                                className="flex h-14 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-base font-bold text-[#1D3557] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                            >
                                <option value="">{fetchingJefes ? 'Cargando jefes...' : 'Elija un jefe...'}</option>
                                {jefes.map(jefe => <option key={jefe} value={jefe}>{jefe}</option>)}
                            </select>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Personal a Cargo
                                </h3>
                                {employees.length > 0 && (
                                    <button
                                        onClick={toggleAll}
                                        className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 p-2 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        {selectedEmployees.length === employees.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                        {selectedEmployees.length === employees.length ? 'DESELECCIONAR TODOS' : 'SELECCIONAR TODOS'}
                                    </button>
                                )}
                            </div>

                            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {fetchingEmployees ? (
                                    <div className="py-20 flex flex-col items-center gap-3">
                                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                        <p className="text-sm font-medium text-gray-500 italic">Buscando empleados...</p>
                                    </div>
                                ) : employees.length > 0 ? (
                                    employees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            onClick={() => toggleEmployee(emp.id)}
                                            className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="shrink-0">
                                                {selectedEmployees.includes(emp.id) ? (
                                                    <div className="bg-blue-600 text-white p-1 rounded-md shadow-sm">
                                                        <CheckSquare className="h-5 w-5" />
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-300 p-1">
                                                        <Square className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                <UserCircle className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate uppercase">{emp.nombreCompleto}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{emp.cargo} • {emp.cedula}</p>
                                            </div>
                                            <div className="shrink-0 bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                {emp.planta}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center gap-3 text-center px-10">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                            <Users className="h-8 w-8 text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 font-medium text-sm">
                                            {selectedJefe ? 'Este jefe no tiene personal activo asignado.' : 'Seleccione un jefe para ver el personal.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedEmployees.length > 0 && (
                                <div className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center animate-in slide-in-from-bottom-full duration-300">
                                    <span className="text-xs font-black uppercase tracking-widest">Seleccionados</span>
                                    <span className="text-lg font-black">{selectedEmployees.length} Empleados</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Shared Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 space-y-6 sticky top-28">
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                                <Calendar className="h-4 w-4" /> Datos de la Ausencia
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Motivo Común</Label>
                                    <select
                                        value={formData.motivo}
                                        onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                        className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-bold text-[#1D3557] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    >
                                        {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Fecha Inicio</Label>
                                        <Input
                                            type="date"
                                            value={formData.fechaInicio}
                                            onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                            className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Fecha Final</Label>
                                        <Input
                                            type="date"
                                            value={formData.fechaFinal}
                                            onChange={(e) => setFormData({ ...formData, fechaFinal: e.target.value })}
                                            className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:bg-white text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-800">Descontar Nómina</span>
                                    <Switch
                                        checked={formData.descontarNomina}
                                        onCheckedChange={(val) => setFormData({ ...formData, descontarNomina: val })}
                                    />
                                </div>

                                <div>
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Observaciones Generales</Label>
                                    <Textarea
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        className="bg-gray-50 border-gray-100 rounded-xl min-h-[100px] text-xs font-medium"
                                        placeholder="Se aplicará a todos los seleccionados..."
                                    />
                                </div>
                            </div>

                            <Button
                                disabled={loading || selectedEmployees.length === 0}
                                onClick={handleSave}
                                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            >
                                {loading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-6 w-6 mr-2" />
                                        Registrar Masivo
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
