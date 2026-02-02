'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, User, Briefcase, Building2, MapPin } from 'lucide-react'
import Image from 'next/image'
import type { Database } from '@/lib/supabase/types'
import { HiluComponent } from '@/components/HILU/HiluComponent'
import { AuditoriaCard } from '@/components/HILU/AuditoriaCard'
import { ReentrenamientoCard } from '@/components/HILU/ReentrenamientoCard'

type QueryHiluRow = Database['public']['Views']['query_hilu']['Row']
type Auditoria = Database['public']['Tables']['auditorias']['Row']
type Reentrenamiento = Database['public']['Tables']['reentrenamientos']['Row']

export default function EntrenamientoDetailPage() {
    const router = useRouter()
    const params = useParams()
    const cedula = params.cedula as string

    const [empleadoData, setEmpleadoData] = useState<(QueryHiluRow & { foto?: string | null }) | null>(null)
    const [auditorias, setAuditorias] = useState<Auditoria[]>([])
    const [reentrenamientos, setReentrenamientos] = useState<Reentrenamiento[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    const fetchEmpleadoData = useCallback(async () => {
        if (!cedula) return

        // Only show loading on initial fetch or if data is missing
        if (!empleadoData) setLoading(true)

        try {
            // Use limit(1) to avoid errors if multiple records exist (e.g. data inconsistencies)
            const { data: hiluDataList, error: hiluError } = await supabase
                .from('query_hilu')
                .select('*')
                .eq('cedula', parseInt(cedula))
                .limit(1)

            let hiluData = hiluDataList?.[0]

            // Initialization Block: If no HILU data found, check if employee exists and initialize phases
            if (!hiluData) {
                console.log('No HILU data found via view, attempting initialization for cedula:', cedula)
                const { data: emp } = await supabase
                    .from('empleados')
                    .select('id, cargo')
                    .eq('cedula', parseInt(cedula))
                    .maybeSingle()

                if (emp) {
                    console.log('Employee found, initializing phase records...', emp)
                    const phases = ['fase_H', 'fase_I', 'fase_L', 'fase_U'] as const

                    try {
                        await Promise.all(phases.map(async (table) => {
                            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('empleado_id', emp.id)
                            if (count === 0) {
                                await supabase.from(table).insert({
                                    empleado_id: emp.id,
                                    cargo: emp.cargo || 'N/A'
                                })
                            }
                        }))

                        // Add a small delay for trigger/view propagation if necessary, but usually immediate consistency is okay-ish 
                        // or just simple refetch
                        const { data: refetchedList } = await supabase
                            .from('query_hilu')
                            .select('*')
                            .eq('cedula', parseInt(cedula))
                            .limit(1)

                        hiluData = refetchedList?.[0]
                        console.log('Initialization complete. Refetched data:', hiluData)
                    } catch (initError) {
                        console.error('Error initializing HILU phases:', initError)
                    }
                }
            }

            if (hiluData) {
                // Fetch photo separately since it's not in query_hilu
                const { data: empData } = await supabase
                    .from('empleados')
                    .select('foto')
                    .eq('cedula', parseInt(cedula))
                    .maybeSingle() as { data: { foto: string | null } | null, error: any }

                // Explicitly cast or construct the object to appease TS
                // Ensure hiluData is treated as an object
                const dataObj = hiluData as QueryHiluRow
                const fullData: QueryHiluRow & { foto?: string | null } = {
                    ...dataObj,
                    foto: empData?.foto || null
                }
                setEmpleadoData(fullData)
            } else {
                console.warn('Still no HILU data found for cedula:', cedula)
            }

            // Fetch Auditorias
            const { data: auditoriasData, error: auditError } = await supabase
                .from('auditorias')
                .select('*')
                .eq('empleado_id', parseInt(cedula))
                .order('created_at', { ascending: false })

            if (auditError) console.error('Error fetching auditorias:', JSON.stringify(auditError, null, 2))
            setAuditorias(auditoriasData || [])

            // Fetch Reentrenamientos
            const { data: reentrenamientosData, error: reentrenError } = await supabase
                .from('reentrenamientos')
                .select('*')
                .eq('empleado_id', parseInt(cedula))
                .order('created_at', { ascending: false })

            if (reentrenError) console.error('Error fetching reentrenamientos:', JSON.stringify(reentrenError, null, 2))
            setReentrenamientos(reentrenamientosData || [])

            if (hiluError) {
                console.error('Supabase HILU fetch error details:', JSON.stringify(hiluError, null, 2))
                throw hiluError
            }
        } catch (error: any) {
            console.error('Error fetching employee data:', error)
            console.error('Error details (stringified):', JSON.stringify(error, null, 2))
        } finally {
            setLoading(false)
        }
    }, [cedula, supabase])

    useEffect(() => {
        fetchEmpleadoData()
    }, [fetchEmpleadoData])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                    <div className="text-center">
                        <Loader2 className="inline-block animate-spin h-12 w-12 text-blue-600 mb-4" />
                        <p className="text-gray-600">Cargando información del empleado...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!empleadoData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Card className="p-12 text-center">
                        <p className="text-gray-600 mb-4">No se encontró información del empleado</p>
                        <Button onClick={() => router.push('/buscador-hilu')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver al buscador
                        </Button>
                    </Card>
                </div>
            </div>
        )
    }

    const defaultPhoto = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/perfil.png'

    const isValidUrl = (urlString: string | null | undefined) => {
        if (!urlString) return false
        try {
            return Boolean(new URL(urlString))
        } catch (e) {
            return false
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with Back Button */}
                <div className="mb-6">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/buscador-hilu')}
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al buscador
                    </Button>

                    <h1 className="text-3xl font-bold text-gray-900">
                        Entrenamiento HILU
                    </h1>
                </div>

                {/* Employee Header Card */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap gap-6 items-start">
                            {/* Photo */}
                            <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600">
                                <Image
                                    src={isValidUrl(empleadoData.foto) ? empleadoData.foto! : defaultPhoto}
                                    alt={empleadoData.nombreCompleto}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Employee Info */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {empleadoData.nombreCompleto}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                            <User className="h-4 w-4" />
                                            <span className="font-medium">Cédula</span>
                                        </div>
                                        <p className="text-gray-900">{empleadoData.cedula}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                            <Briefcase className="h-4 w-4" />
                                            <span className="font-medium">Cargo</span>
                                        </div>
                                        <p className="text-gray-900">{empleadoData.cargo || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                            <MapPin className="h-4 w-4" />
                                            <span className="font-medium">Planta</span>
                                        </div>
                                        <p className="text-gray-900">{empleadoData.planta || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                            <User className="h-4 w-4" />
                                            <span className="font-medium">Jefe</span>
                                        </div>
                                        <p className="text-gray-900">{empleadoData.jefe || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Training Progress Summary */}
                                <div className="mt-4 flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-700">Progreso HILU:</span>
                                    <div className="flex gap-2">
                                        <div className={`px-3 py-1 rounded-md text-sm font-medium ${empleadoData.fh_completado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            H {empleadoData.fh_completado && '✓'}
                                        </div>
                                        <div className={`px-3 py-1 rounded-md text-sm font-medium ${empleadoData.fi_completado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            I {empleadoData.fi_completado && '✓'}
                                        </div>
                                        <div className={`px-3 py-1 rounded-md text-sm font-medium ${empleadoData.fl_completado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            L {empleadoData.fl_completado && '✓'}
                                        </div>
                                        <div className={`px-3 py-1 rounded-md text-sm font-medium ${empleadoData.fu_completado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            U {empleadoData.fu_completado && '✓'}
                                        </div>
                                    </div>
                                    {empleadoData.total_dias_entrenamiento !== null && (
                                        <span className="text-sm text-gray-600 ml-auto">
                                            Total: <span className="font-semibold">{empleadoData.total_dias_entrenamiento}</span> días
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* HILU Phases Component */}
                <div className="mt-8 space-y-8">
                    <HiluComponent
                        empleado={empleadoData}
                        onUpdate={fetchEmpleadoData}
                        currentUser={{ id: 1 }} // TODO: value from auth context
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <AuditoriaCard
                            empleadoId={empleadoData.cedula} // Note: database uses cedula as empleado_id in some places, checking types
                            cargo={empleadoData.cargo || 'N/A'}
                            auditorias={auditorias}
                            onUpdate={fetchEmpleadoData}
                        />

                        <ReentrenamientoCard
                            empleadoId={empleadoData.cedula}
                            cargo={empleadoData.cargo || 'N/A'}
                            reentrenamientos={reentrenamientos}
                            onUpdate={fetchEmpleadoData}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
