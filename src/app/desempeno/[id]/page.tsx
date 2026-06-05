'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
    ArrowLeft, 
    Loader2, 
    User, 
    Briefcase, 
    Building2,
    AlertCircle,
    Award,
    TrendingUp,
    CalendarRange,
    Lightbulb
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

// Tab components
import { CompetenciasTab } from '@/components/Desempeno/CompetenciasTab'
import { KPIView } from '@/components/Desempeno/KPIView'
import { PlannerView } from '@/components/Desempeno/PlannerView'
import { PotencialTab } from '@/components/Desempeno/PotencialTab'

const TABS = [
    { id: 'competencias', label: 'Competencias', icon: Award, color: 'blue' },
    { id: 'kpis', label: 'KPIs', icon: TrendingUp, color: 'green' },
    { id: 'planner', label: 'Planner', icon: CalendarRange, color: 'orange' },
    { id: 'potencial', label: 'Potencial', icon: Lightbulb, color: 'purple' },
] as const

type TabId = typeof TABS[number]['id']

export default function DesempenoDetailPage() {
    const { id: empId } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [empleado, setEmpleado] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabId>('competencias')

    const fetchData = useCallback(async () => {
        if (!empId) return
        
        setLoading(true)
        try {
            const numericId = Number(empId)
            if (isNaN(numericId)) {
                throw new Error('ID de empleado inválido')
            }
            
            // Fetch employee info
            const { data, error: empError } = await supabase
                .from('empleados')
                .select('*')
                .eq('id', numericId)
                .single()

            if (empError) {
                console.error('Employee fetch error:', empError)
                throw empError
            }
            
            if (!data) throw new Error('Empleado no encontrado')
            setEmpleado(data as any)

        } catch (error: any) {
            console.error('Error fetching details:', error?.message || error)
        } finally {
            setLoading(false)
        }
    }, [empId, supabase])

    useEffect(() => {
        if (empId) fetchData()
    }, [empId, fetchData])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F1F4F8] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin opacity-20" />
                    <p className="text-gray-400 font-medium animate-pulse">Cargando expediente...</p>
                </div>
            </div>
        )
    }

    if (!empleado) {
        return (
            <div className="min-h-screen bg-[#F1F4F8] flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-[#2d4356] mb-2">Empleado no encontrado</h2>
                <p className="text-gray-500 mb-6">No pudimos encontrar la información para el ID: {empId}</p>
                <Button onClick={() => router.push('/desempeno')} variant="default" className="rounded-xl">
                    Volver al Buscador
                </Button>
            </div>
        )
    }

    const cedula = empleado.cedula || empleado.id
    const cargo = empleado.cargo || ''
    const nombreEmpleado = empleado.nombreCompleto || ''

    const renderTabContent = () => {
        switch (activeTab) {
            case 'competencias':
                return <CompetenciasTab cedula={cedula} nombre={nombreEmpleado} cargo={cargo} />
            case 'kpis':
                return <KPIView cedula={cedula} nombre={nombreEmpleado} />
            case 'planner':
                return <PlannerView empleadoEmail={empleado.correo_electronico} nombre={nombreEmpleado} />
            case 'potencial':
                return <PotencialTab cedula={cedula} nombre={nombreEmpleado} cargo={cargo} />
            default:
                return null
        }
    }

    const getTabColorClasses = (tabId: string, isActive: boolean) => {
        const colors: Record<string, { active: string; inactive: string }> = {
            blue: { active: 'bg-blue-600 text-white shadow-lg shadow-blue-200', inactive: 'text-gray-500 hover:bg-blue-50 hover:text-blue-600' },
            green: { active: 'bg-green-600 text-white shadow-lg shadow-green-200', inactive: 'text-gray-500 hover:bg-green-50 hover:text-green-600' },
            orange: { active: 'bg-orange-500 text-white shadow-lg shadow-orange-200', inactive: 'text-gray-500 hover:bg-orange-50 hover:text-orange-600' },
            purple: { active: 'bg-purple-600 text-white shadow-lg shadow-purple-200', inactive: 'text-gray-500 hover:bg-purple-50 hover:text-purple-600' },
        }
        const tab = TABS.find(t => t.id === tabId)
        const color = tab?.color || 'blue'
        return isActive ? colors[color].active : colors[color].inactive
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
            {/* AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/desempeno')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Expediente de Desempeño
                </div>
                <div className="w-8" />
            </div>

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Employee Header Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center md:items-start animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative h-24 w-24 md:h-32 md:w-32 flex-shrink-0">
                        {empleado?.foto && (empleado.foto.startsWith('http') || empleado.foto.startsWith('/')) ? (
                            <Image
                                src={empleado.foto}
                                alt={empleado.nombreCompleto}
                                fill
                                className="rounded-full object-cover border-4 border-blue-50 shadow-sm"
                            />
                        ) : (
                            <div className="w-24 h-24 md:h-32 md:w-32 rounded-full bg-gradient-to-br from-[#2d4356] to-[#1a2b38] flex items-center justify-center text-white border-4 border-white shadow-sm">
                                <User size={48} className="opacity-50" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#2d4356] mb-1">
                                {empleado.nombreCompleto}
                            </h1>
                            <p className="text-gray-500 font-medium">C.C. {empleado.id}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <Briefcase className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cargo</p>
                                    <p className="text-[#2d4356] font-semibold">{empleado.cargo || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <Building2 className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Área / Planta</p>
                                    <p className="text-[#2d4356] font-semibold">{empleado.planta || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-[24px] p-2 shadow-sm border border-gray-100 flex gap-2 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-[18px] text-sm font-bold transition-all duration-300 ${getTabColorClasses(tab.id, isActive)}`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in duration-300">
                    {renderTabContent()}
                </div>
            </main>
        </div>
    )
}
