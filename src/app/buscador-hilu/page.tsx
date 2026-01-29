'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Search, User, Briefcase, MapPin, Building2, Filter, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

type Empleado = Database['public']['Tables']['empleados']['Row']

export default function BuscadorHiluPage() {
    const [empleados, setEmpleados] = useState<Empleado[]>([])
    const [busqueda, setBusqueda] = useState('')
    const [loading, setLoading] = useState(true)

    // Filters
    const [jefes, setJefes] = useState<string[]>([])
    const [plantas, setPlantas] = useState<string[]>([])
    const [selectedJefe, setSelectedJefe] = useState<string>('all')
    const [selectedPlanta, setSelectedPlanta] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all') // 'all', 'active', 'inactive'
    const [sortByDate, setSortByDate] = useState(false)

    const supabase = createClient()

    const fetchFilters = useCallback(async () => {
        try {
            // Fetch unique Jefes
            const { data: jefesData } = await supabase
                .from('empleados')
                .select('jefe')
                .not('jefe', 'is', null)

            if (jefesData) {
                const uniqueJefes = Array.from(new Set(
                    (jefesData as any[])
                        .map(j => j.jefe)
                        .filter((j): j is string => typeof j === 'string' && j.length > 0)
                ))
                setJefes(uniqueJefes.sort())
            }

            // Fetch unique Plantas
            const { data: plantasData } = await supabase
                .from('empleados')
                .select('planta')
                .not('planta', 'is', null)

            if (plantasData) {
                const uniquePlantas = Array.from(new Set(
                    (plantasData as any[])
                        .map(p => p.planta)
                        .filter((p): p is string => typeof p === 'string' && p.length > 0)
                ))
                setPlantas(uniquePlantas.sort())
            }
        } catch (error) {
            console.error('Error fetching filters:', error)
        }
    }, [supabase])

    const fetchEmpleados = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('empleados')
                .select('*')

            // Search
            if (busqueda) {
                query = query.or(`nombreCompleto.ilike.%${busqueda}%,cedula.eq.${busqueda}`)
            }

            // Filter by Jefe
            if (selectedJefe && selectedJefe !== 'all') {
                query = query.eq('jefe', selectedJefe)
            }

            // Filter by Planta
            if (selectedPlanta && selectedPlanta !== 'all') {
                query = query.eq('planta', selectedPlanta)
            }

            // Filter by Status
            if (selectedStatus !== 'all') {
                query = query.eq('activo', selectedStatus === 'active')
            }

            // Sorting
            // Assuming 'ordenarfecha' refers to created_at or updated_at. Using created_at for now.
            if (sortByDate) {
                query = query.order('created_at', { ascending: false })
            } else {
                query = query.order('nombreCompleto', { ascending: true })
            }

            const { data, error } = await query.limit(50)

            if (error) throw error
            setEmpleados(data || [])
        } catch (error) {
            console.error('Error fetching empleados:', error)
        } finally {
            setLoading(false)
        }
    }, [busqueda, selectedJefe, selectedPlanta, selectedStatus, sortByDate, supabase])

    useEffect(() => {
        fetchFilters()
    }, [fetchFilters])

    useEffect(() => {
        fetchEmpleados()
    }, [fetchEmpleados])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Gestor de Personal
                    </h1>
                    <p className="text-gray-600">
                        Gestiona y visualiza la información de los empleados
                    </p>
                </div>

                {/* Filters Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filtros de Búsqueda
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                            <Label htmlFor="search" className="mb-2 block">Búsqueda</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="search"
                                    type="text"
                                    placeholder="Nombre o Cédula..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Jefe Inmediato</Label>
                            <Select value={selectedJefe} onValueChange={setSelectedJefe}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los jefes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los jefes</SelectItem>
                                    {jefes.map((jefe) => (
                                        <SelectItem key={jefe} value={jefe}>{jefe}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Planta</Label>
                            <Select value={selectedPlanta} onValueChange={setSelectedPlanta}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas las plantas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las plantas</SelectItem>
                                    {plantas.map((planta) => (
                                        <SelectItem key={planta} value={planta}>{planta}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Estado</Label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Activos</SelectItem>
                                    <SelectItem value="inactive">Inactivos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 lg:col-span-4 justify-end">
                            <Switch
                                id="sort-date"
                                checked={sortByDate}
                                onChange={(e) => setSortByDate(e.target.checked)}
                            />
                            <Label htmlFor="sort-date" className="cursor-pointer flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4" />
                                Ordenar por fecha reciente
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Cargando empleados...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {empleados.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                                <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-600">No se encontraron empleados con los filtros seleccionados</p>
                            </div>
                        ) : (
                            // Using a List view style to match Gestor de Personal better than Cards
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {empleados.map((empleado, index) => (
                                    <div
                                        key={empleado.id}
                                        className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${index !== empleados.length - 1 ? 'border-b border-gray-100' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {empleado.nombreCompleto.charAt(0)}
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{empleado.nombreCompleto}</h3>
                                                <p className="text-sm text-gray-500">C.C. {empleado.cedula}</p>
                                            </div>

                                            <div className="hidden md:block">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                                    <span className="truncate">{empleado.cargo || 'Sin cargo'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-4 w-4 text-gray-400" />
                                                    <span className="truncate">{empleado.planta || 'Sin planta'}</span>
                                                </div>
                                            </div>

                                            <div className="hidden md:flex flex-col justify-center items-end">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${empleado.activo
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {empleado.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
