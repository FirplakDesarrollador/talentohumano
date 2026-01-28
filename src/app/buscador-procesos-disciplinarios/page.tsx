import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function BuscadorProcesosDisciplinariosPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Procesos Disciplinarios
                    </h1>
                    <p className="text-gray-600">
                        Busca y gestiona los procesos disciplinarios
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle>Módulo de Procesos Disciplinarios</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">
                            Este módulo permite buscar, registrar y dar seguimiento a los procesos
                            disciplinarios de los empleados, manteniendo un historial completo.
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                <strong>Funcionalidad disponible:</strong> Registro detallado de incidentes,
                                acciones tomadas y resoluciones con trazabilidad completa.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
