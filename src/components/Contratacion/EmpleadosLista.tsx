'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    Search,
    UserCheck,
    UserX,
    ChevronRight,
    Loader2,
    X,
    Briefcase,
    Building2,
    Mail,
    FolderOpen,
} from 'lucide-react'

interface EmpleadosListaProps {
    onVerArchivo?: (nombreEmpleado: string, activo: boolean) => void
}

interface Empleado {
    id: number
    nombreCompleto: string
    cargo: string | null
    area: string | null
    planta: string | null
    activo: boolean
    correo_electronico: string | null
    jefe: string | null
}

export function EmpleadosLista({ onVerArchivo }: EmpleadosListaProps) {
    const supabase = createClient()
    const [employees, setEmployees] = useState<Empleado[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null)

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('empleados')
                .select('id, nombreCompleto, cargo, area, planta, activo, correo_electronico, jefe')
                .order('nombreCompleto', { ascending: true })

            if (error) throw error
            setEmployees((data as any) || [])
        } catch (error: any) {
            console.error('Error fetching employees:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredEmployees = employees.filter(emp => {
        const matchesTab = activeTab === 'active' ? emp.activo : !emp.activo
        const matchesSearch = emp.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesTab && matchesSearch
    })

    const stats = {
        active: employees.filter(e => e.activo).length,
        inactive: employees.filter(e => !e.activo).length,
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Activos</p>
                        <p className="text-2xl font-black text-slate-800">{stats.active}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                        <UserX size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Inactivos</p>
                        <p className="text-2xl font-black text-slate-800">{stats.inactive}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => setActiveTab('inactive')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'inactive' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Inactivos
                        </button>
                    </div>

                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sincronizando nómina...</p>
                        </div>
                    ) : filteredEmployees.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="flex items-center justify-between p-5 rounded-3xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${emp.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                            {emp.nombreCompleto?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                                                {emp.nombreCompleto}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-2 h-2 rounded-full ${emp.activo ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    {emp.cargo || (emp.activo ? 'Colaborador Activo' : 'Retirado / Inactivo')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                            <Users size={48} className="text-slate-300" />
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No se encontraron empleados</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedEmployee && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in slide-in-from-right duration-300">
                    <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden rounded-l-[3rem]">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-2xl ${selectedEmployee.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                    {selectedEmployee.nombreCompleto?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">{selectedEmployee.nombreCompleto}</h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Expediente de Empleado</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center justify-center font-bold"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-10 space-y-8">
                            <div className="grid grid-cols-1 gap-4 bg-slate-50/50 p-8 rounded-[2rem]">
                                <DetailItem icon={Briefcase} label="Cargo" value={selectedEmployee.cargo || 'N/A'} />
                                <DetailItem icon={Building2} label="Área / Planta" value={selectedEmployee.area || selectedEmployee.planta || 'N/A'} />
                                <DetailItem icon={Mail} label="Correo" value={selectedEmployee.correo_electronico || 'N/A'} />
                                <DetailItem icon={Users} label="Jefe" value={selectedEmployee.jefe || 'N/A'} />
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado en TH</p>
                                <p className={`font-bold ${selectedEmployee.activo ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedEmployee.activo ? 'ACTIVO' : 'INACTIVO'}
                                </p>
                            </div>

                            {onVerArchivo && (
                                <button
                                    onClick={() => onVerArchivo(selectedEmployee.nombreCompleto, selectedEmployee.activo)}
                                    className="w-full flex items-center justify-center gap-2 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95"
                                >
                                    <FolderOpen className="h-4 w-4" />
                                    Ver en Archivo Digital
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
