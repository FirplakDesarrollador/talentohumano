'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SolicitudesPersonalTab } from '@/components/Seleccion/SolicitudesPersonalTab'

export default function SolicitudesPersonalPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/seleccion')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Solicitudes de Personal</h1>
                <div className="w-8" />
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                <SolicitudesPersonalTab />
            </div>
        </div>
    )
}
