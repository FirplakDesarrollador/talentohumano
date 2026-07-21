'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'

const BI_URL = process.env.NEXT_PUBLIC_BI_ENTRENAMIENTOS_URL

export default function IndicadoresEntrenamientosPage() {
    const router = useRouter()

    if (!BI_URL) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                    <button
                        onClick={() => router.back()}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="flex-1 text-center font-medium text-lg">
                        Indicadores de Entrenamiento
                    </div>
                    <div className="w-8" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <p className="text-gray-600 font-medium max-w-md">
                        El tablero de indicadores no está configurado. Falta la variable de entorno
                        <code className="mx-1 px-2 py-0.5 bg-gray-100 rounded text-sm">NEXT_PUBLIC_BI_ENTRENAMIENTOS_URL</code>.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Indicadores de Entrenamiento
                </div>
                <div className="w-8" />
            </div>

            {/* BI Container */}
            <div style={{ flex: 1 }}>
                <iframe
                    title="Indicadores de Entrenamiento"
                    width="100%"
                    height="100%"
                    src={BI_URL}
                    frameBorder="0"
                    allowFullScreen
                    style={{ display: 'block', border: 'none', minHeight: 'calc(100vh - 56px)' }}
                />
            </div>
        </div>
    )
}
