'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Database, GraduationCap, Sparkles, ChevronRight } from 'lucide-react'

const APARTADOS = [
    {
        title: 'Base de Datos General',
        description: 'Histórico de vacantes y solicitudes de personal, con seguimiento de cumplimiento de ANS.',
        href: '/seleccion/base-datos-general',
        icon: Database,
        activo: true,
    },
    {
        title: 'Practicantes',
        description: 'Seguimiento de los cupos de practicantes y aprendices: perfiles, fechas y estado.',
        href: '/seleccion/practicantes',
        icon: GraduationCap,
        activo: true,
    },
]

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

            <div className="max-w-2xl mx-auto px-4 py-10">
                <h2 className="text-2xl font-black text-[#1D3557] mb-1 tracking-tight">Apartados</h2>
                <p className="text-gray-500 text-sm mb-8">Elige qué parte del proceso de Selección quieres gestionar.</p>

                <div className="space-y-4">
                    {APARTADOS.map((a) => {
                        const Icon = a.icon
                        return (
                            <button
                                key={a.href}
                                onClick={() => a.activo && router.push(a.href)}
                                disabled={!a.activo}
                                className="w-full text-left bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 flex items-center gap-5 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <div className="bg-blue-50 text-[#1D3557] rounded-2xl p-4 shrink-0">
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-800 text-lg">{a.title}</h3>
                                        {!a.activo && (
                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                                <Sparkles className="h-3 w-3" />
                                                Próximamente
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                                </div>
                                {a.activo && <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />}
                            </button>
                        )
                    })}
                </div>

                <p className="text-center text-xs text-gray-400 mt-10">Más apartados del proceso de Selección próximamente.</p>
            </div>
        </div>
    )
}
