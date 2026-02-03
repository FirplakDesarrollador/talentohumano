'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { FormularioGestorPersonal } from '@/components/Gestor/FormularioGestorPersonal'

export default function NuevoEmpleadoPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/gestor-de-personal')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Registrar Nuevo Empleado
                </div>
                <div className="w-8" />
            </div>

            <div className="max-w-5xl mx-auto px-4 py-10">
                <FormularioGestorPersonal />
            </div>
        </div>
    )
}
