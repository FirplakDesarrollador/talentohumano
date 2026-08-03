'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS } from '@/lib/constants/roles'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShieldAlert, UserPlus, Loader2, Construction } from 'lucide-react'

export default function ContratacionPage() {
    const router = useRouter()
    const supabase = createClient()

    const [userEmail, setUserEmail] = useState<string>('')
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUserEmail((user?.email || '').toLowerCase().trim())
            setAuthLoading(false)
        }
        fetchUser()
    }, [supabase])

    const isAdmin = userEmail && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(userEmail)

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-20" />
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-gray-600 mb-6">
                        No tienes permisos para acceder al módulo de Contratación. Solo los administradores pueden ingresar.
                    </p>
                    <Button onClick={() => router.push('/menu')} className="w-full">
                        Volver al inicio
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Contratación
                </div>
                <div className="w-8" />
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Módulo en construcción</h2>
                    <p className="text-gray-500 max-w-md mx-auto flex items-center justify-center gap-2">
                        <Construction className="h-4 w-4" />
                        Próximamente aquí se gestionará el proceso de contratación.
                    </p>
                </div>
            </main>
        </div>
    )
}
