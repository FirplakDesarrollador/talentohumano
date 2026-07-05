'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserX } from 'lucide-react'
import { FormularioAusentismo } from '@/components/Ausentismos/FormularioAusentismo'

function NuevoAusentismoContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('edit')

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Header */}
            <header className="bg-[#1D3557] text-white px-8 py-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <UserX className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight uppercase">{editId ? 'Editar Ausentismo' : 'Nuevo Ausentismo'}</h1>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">{editId ? 'Modificar registro existente' : 'Registro individual'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <FormularioAusentismo editId={editId} />
            </main>
        </div>
    )
}

export default function NuevoAusentismoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F1F4F8]"><UserX className="h-8 w-8 text-blue-500 animate-pulse" /></div>}>
            <NuevoAusentismoContent />
        </Suspense>
    )
}
