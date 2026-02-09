'use client'

import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Briefcase, FileText, User, MessageCircle, AlertTriangle } from 'lucide-react'

interface ProcesoCardProps {
    proceso: {
        id: number | string
        created_at: string
        cargo: string
        tipo: string
        motivo: string
        created_by: string
        comentario: string
    }
}

export function ProcesoCard({ proceso }: ProcesoCardProps) {
    const formatDate = (dateString: string) => {
        try {
            const date = parseISO(dateString)
            if (!isValid(date)) return 'Fecha inválida'
            return format(date, "d 'de' MMMM, yyyy", { locale: es })
        } catch (error) {
            return 'Fecha inválida'
        }
    }

    return (
        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
            <div className={`h-1 w-full ${proceso.tipo === 'Descargos' ? 'bg-red-500' :
                    proceso.tipo === 'Llamado de atencion' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Fecha */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Calendar className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{formatDate(proceso.created_at)}</p>
                        </div>
                    </div>

                    {/* Cargo */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Briefcase className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.cargo || 'No especificado'}</p>
                        </div>
                    </div>

                    {/* Tipo de Proceso */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de proceso</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.tipo}</p>
                        </div>
                    </div>

                    {/* Motivo de sanción */}
                    <div className="flex items-start gap-3 lg:col-span-2">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo de sanción</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.motivo}</p>
                        </div>
                    </div>

                    {/* Creado por */}
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <User className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Creado por</p>
                            <p className="text-sm font-semibold text-[#1D3557]">{proceso.created_by}</p>
                        </div>
                    </div>

                    {/* Comentario */}
                    <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-[#1D3557]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comentario</p>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                {proceso.comentario || 'Sin comentarios adicionales.'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
