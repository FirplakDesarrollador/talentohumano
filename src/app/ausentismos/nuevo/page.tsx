'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserX, Loader2 } from 'lucide-react'
import { FormularioAusentismo } from '@/components/Ausentismos/FormularioAusentismo'
import { createClient } from '@/lib/supabase/client'
import { AUSENTISMOS_SIN_DETALLE } from '@/lib/constants/roles'

function NuevoAusentismoContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('edit')
    const supabase = createClient()
    const [checkingAccess, setCheckingAccess] = useState(!!editId)

    useEffect(() => {
        if (!editId) return
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email && AUSENTISMOS_SIN_DETALLE.includes(user.email)) {
                router.replace('/ausentismos')
                return
            }
            setCheckingAccess(false)
        }
        checkAccess()
    }, [editId, supabase, router])

    if (checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F1F4F8]">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        )
    }

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
