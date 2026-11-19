'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Database, Users, GraduationCap } from 'lucide-react'
import { VacantesTab } from '@/components/Seleccion/VacantesTab'
import { CandidatosInscritosTab } from '@/components/Seleccion/CandidatosInscritosTab'
import { PracticantesTab } from '@/components/Seleccion/PracticantesTab'

type TabKey = 'vacantes' | 'candidatos' | 'practicantes'

export default function SeleccionPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabKey>('vacantes')

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

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('vacantes')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'vacantes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Database className="h-4 w-4" />
                        Vacantes
                    </button>
                    <button
                        onClick={() => setActiveTab('candidatos')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'candidatos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Candidatos Inscritos
                    </button>
                    <button
                        onClick={() => setActiveTab('practicantes')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'practicantes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <GraduationCap className="h-4 w-4" />
                        Practicantes
                    </button>
                </div>

                {activeTab === 'vacantes' && <VacantesTab />}
                {activeTab === 'candidatos' && <CandidatosInscritosTab />}
                {activeTab === 'practicantes' && <PracticantesTab />}
            </div>
        </div>
    )
}
