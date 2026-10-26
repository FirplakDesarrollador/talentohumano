'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, UserSearch, Sparkles } from 'lucide-react'

export default function SeleccionPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Selección</h1>
                <div className="w-8" />
            </div>

            <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-200/40 blur-2xl rounded-full" />
                    <div className="relative bg-white rounded-full p-7 shadow-[0_8px_30px_rgba(29,53,87,0.12)] border border-blue-50">
                        <UserSearch className="h-14 w-14 text-[#1D3557]" />
                    </div>
                </div>

                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Próximamente
                </span>

                <h2 className="text-3xl font-black text-[#1D3557] mb-3 tracking-tight">Módulo en desarrollo</h2>
                <p className="text-gray-500 max-w-sm leading-relaxed">
                    Estamos construyendo el proceso de Selección. Muy pronto vas a poder gestionarlo desde acá.
                </p>
            </div>
        </div>
    )
}
