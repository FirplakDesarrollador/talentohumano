'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CalendarRange, Info, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function PlannerView() {
    // Nota: El porcentaje de planner suele venir de una integración con Microsoft Planner o un sistema interno.
    // Por ahora mostramos una visualización premium con un placeholder informativo.
   const plannerPercentage = 75; // Valor simulado según el requisito del usuario

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600 p-2 rounded-xl text-white shadow-sm">
                        <CalendarRange className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#2d4356]">Seguimiento Planner</h2>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 rounded-lg px-3 py-1">
                    Meta Trimestral
                </Badge>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative h-48 w-48 flex items-center justify-center">
                            {/* Larger Circular Progress */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="text-gray-100"
                                />
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={552}
                                    strokeDashoffset={552 - (552 * plannerPercentage) / 100}
                                    className="text-orange-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-5xl font-black text-[#2d4356]">
                                    {plannerPercentage}%
                                </span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Completado</span>
                            </div>
                        </div>

                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="bg-green-100 p-2 rounded-lg">
                                    <CheckCircle className="text-green-600 h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actividades Finalizadas</p>
                                    <p className="text-lg font-bold text-[#2d4356]">12 / 16</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Clock className="text-blue-600 h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actividades en Proceso</p>
                                    <p className="text-lg font-bold text-[#2d4356]">4</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-orange-50/50 rounded-2xl p-4 flex gap-3 items-start border border-orange-100">
                <Info className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-orange-700 leading-relaxed">
                    <strong>Próxima integración:</strong> Estamos trabajando para conectar directamente sus cubos de datos de Planner. 
                    Por el momento, el porcentaje visualizado refleja el avance manual registrado por su supervisor.
                </p>
            </div>
        </div>
    )
}
