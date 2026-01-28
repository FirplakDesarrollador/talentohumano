import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap } from 'lucide-react'

export default function EntrenamientoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Entrenamiento y Capacitación
                    </h1>
                    <p className="text-gray-600">
                        Gestiona los programas de entrenamiento de empleados
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                                <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle>Módulo de Entrenamiento</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">
                            Este módulo permite gestionar los entrenamientos, capacitaciones y procesos
                            de onboarding de los empleados, incluyendo seguimiento de auditorías y certificaciones.
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                <strong>Funcionalidad disponible:</strong> Sistema de seguimiento de entrenamientos
                                con registro de fechas de completado y certificaciones.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
