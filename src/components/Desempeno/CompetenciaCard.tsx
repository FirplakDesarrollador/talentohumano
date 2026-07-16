'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useDesempenoScore } from '@/lib/hooks/useDesempenoScore'

interface CompetenciaCardProps {
    empleado: {
        id: number
        nombreCompleto: string
        cargo: string | null
        planta: string | null
        foto: string | null
        correo_electronico?: string | null
    }
    onScoreLoaded?: (id: number, scoreFinal: number | null) => void
}

export function CompetenciaCard({ empleado, onScoreLoaded }: CompetenciaCardProps) {
    const router = useRouter()
    const { scoreFinal, loading } = useDesempenoScore(
        empleado.id,
        empleado.cargo || '',
        empleado.correo_electronico || undefined
    )

    // Reporta el score ya calculado hacia el buscador, para que pueda
    // promediarlo por área sin recalcularlo de nuevo.
    const lastReported = useRef<number | null | undefined>(undefined)
    useEffect(() => {
        if (!loading && onScoreLoaded && lastReported.current !== scoreFinal) {
            lastReported.current = scoreFinal
            onScoreLoaded(empleado.id, scoreFinal)
        }
    }, [loading, scoreFinal, empleado.id, onScoreLoaded])

    const scoreColor =
        scoreFinal === null ? 'text-gray-400'
        : scoreFinal >= 80  ? 'text-green-600'
        : scoreFinal >= 60  ? 'text-yellow-600'
        : 'text-red-500'

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
                        <h3 className="text-base font-bold text-[#2d4356] truncate mb-1">
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

                    {/* Score */}
                    <div className="flex flex-col items-center flex-shrink-0 min-w-[44px]">
                        {loading ? (
                            <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
                        ) : (
                            <>
                                <span className={`text-base font-black leading-none ${scoreColor}`}>
                                    {scoreFinal !== null ? `${scoreFinal}%` : '—'}
                                </span>
                                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Score</span>
                            </>
                        )}
                    </div>

                    {/* Action */}
                    <Button
                        onClick={() => router.push(`/desempeno/${empleado.id}`)}
                        size="icon"
                        variant="ghost"
                        className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all transform group-hover:scale-110 flex-shrink-0"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
