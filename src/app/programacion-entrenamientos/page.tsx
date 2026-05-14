'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, History, ArrowLeft, PlusCircle, ClipboardList } from 'lucide-react'

export default function ProgramacionEntrenamientosPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Entrenamiento
                </div>
                <div className="w-8" />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Programar Entrenamiento */}
                    <Card 
                        className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none ring-1 ring-gray-200 hover:ring-blue-500 bg-white overflow-hidden"
                        onClick={() => router.push('/programar-entrenamiento')}
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                        <CardContent className="p-10 flex flex-col items-center text-center relative">
                            <div className="w-24 h-24 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6 shadow-sm">
                                <Calendar className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Programar entrenamientos</h2>
                            <p className="text-gray-500 text-base leading-relaxed">
                                Organiza y programa nuevas sesiones de entrenamiento técnico y administrativo para el personal.
                            </p>
                            <div className="mt-8 flex items-center text-blue-600 font-bold group-hover:gap-2 transition-all">
                                <span>COMENZAR AHORA</span>
                                <PlusCircle className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Historial de Entrenamientos */}
                    <Card 
                        className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none ring-1 ring-gray-200 hover:ring-orange-500 bg-white overflow-hidden"
                        onClick={() => router.push('/historial-entrenamientos')}
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                        <CardContent className="p-10 flex flex-col items-center text-center relative">
                            <div className="w-24 h-24 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mb-8 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 transform group-hover:-rotate-6 shadow-sm">
                                <History className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Consolidado de entrenamientos</h2>
                            <p className="text-gray-500 text-base leading-relaxed">
                                Revisa el registro histórico de capacitaciones y seguimientos realizados anteriormente.
                            </p>
                            <div className="mt-8 flex items-center text-orange-600 font-bold group-hover:gap-2 transition-all">
                                <span>VER REGISTROS</span>
                                <ClipboardList className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
