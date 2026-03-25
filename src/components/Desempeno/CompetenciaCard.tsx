'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface CompetenciaCardProps {
    empleado: {
        id: number
        nombreCompleto: string
        cargo: string | null
        planta: string | null
        foto: string | null
    }
}

export function CompetenciaCard({ empleado }: CompetenciaCardProps) {
    const router = useRouter()
    const fallbackImage = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/perfil.png'

    return (
        <Card className="hover:shadow-lg transition-all duration-300 border-none bg-white rounded-2xl overflow-hidden group">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    {/* Photo */}
                    <div className="relative h-16 w-16 flex-shrink-0">
                        {empleado.foto && (empleado.foto.startsWith('http') || empleado.foto.startsWith('/')) ? (
                            <Image
                                src={empleado.foto}
                                alt={empleado.nombreCompleto}
                                fill
                                className="rounded-full object-cover border-2 border-gray-100 group-hover:border-blue-200 transition-colors"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2d4356] to-[#1a2b38] flex items-center justify-center text-white">
                                <span className="text-xl font-bold uppercase">{empleado.nombreCompleto.charAt(0)}</span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-[#2d4356] truncate mb-1">
                            {empleado.nombreCompleto}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="font-semibold text-gray-400 uppercase tracking-tight">Cédula:</span> 
                                <span className="text-gray-700">{empleado.id}</span>
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="font-semibold text-gray-400 uppercase tracking-tight">Cargo:</span> 
                                <span className="text-gray-700 truncate">{empleado.cargo || 'No asignado'}</span>
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-2 sm:col-span-2">
                                <span className="font-semibold text-gray-400 uppercase tracking-tight">Área:</span> 
                                <span className="text-gray-700 truncate">{empleado.planta || 'No asignada'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Action */}
                    <Button
                        onClick={() => router.push(`/desempeno/${empleado.id}`)}
                        size="icon"
                        variant="ghost"
                        className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all transform group-hover:scale-110"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
