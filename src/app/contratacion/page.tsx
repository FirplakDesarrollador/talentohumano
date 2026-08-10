'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS } from '@/lib/constants/roles'
import { Button } from '@/components/ui/button'
import { CandidatosKanban } from '@/components/Contratacion/CandidatosKanban'
import { EmpleadosLista } from '@/components/Contratacion/EmpleadosLista'
import { ArchivoDigitalTab } from '@/components/Contratacion/ArchivoDigitalTab'
import { SolicitudesPersonalTab } from '@/components/Contratacion/SolicitudesPersonalTab'
import { AlertasContratoTab } from '@/components/Contratacion/AlertasContratoTab'
import { ArrowLeft, ShieldAlert, Loader2, Link2, Check, Users, UserSquare2, HardDrive, ClipboardList, BellRing } from 'lucide-react'
import { toast } from 'sonner'

export default function ContratacionPage() {
    const router = useRouter()
    const supabase = createClient()

    const [userEmail, setUserEmail] = useState<string>('')
    const [authLoading, setAuthLoading] = useState(true)
    const [copiedLink, setCopiedLink] = useState<'postulacion' | 'solicitar-personal' | null>(null)
    const [activeTab, setActiveTab] = useState<'candidatos' | 'empleados' | 'archivo' | 'solicitudes' | 'alertas'>('candidatos')
    const [archivoBusqueda, setArchivoBusqueda] = useState('')
    const [archivoCategoria, setArchivoCategoria] = useState<string | null>(null)

    const handleVerArchivo = (nombreEmpleado: string, activo: boolean) => {
        setArchivoBusqueda(nombreEmpleado)
        setArchivoCategoria(activo ? 'ACTIVOS' : 'RETIRADOS')
        setActiveTab('archivo')
    }

    const handleCopyLink = async (path: 'postulacion' | 'solicitar-personal') => {
        const link = `${window.location.origin}/${path}`
        try {
            await navigator.clipboard.writeText(link)
            setCopiedLink(path)
            toast.success('Link copiado al portapapeles')
            setTimeout(() => setCopiedLink(null), 2000)
        } catch (error) {
            toast.error('No se pudo copiar el link')
        }
    }

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
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => handleCopyLink('postulacion')}
                        className="bg-white/10 hover:bg-white/20 text-white h-9 px-4 rounded-full font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 border border-white/20 shadow-none"
                    >
                        {copiedLink === 'postulacion' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                        <span className="hidden sm:inline">{copiedLink === 'postulacion' ? 'Copiado' : 'Copiar link de postulación'}</span>
                    </Button>
                    <Button
                        onClick={() => handleCopyLink('solicitar-personal')}
                        className="bg-white/10 hover:bg-white/20 text-white h-9 px-4 rounded-full font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 border border-white/20 shadow-none"
                    >
                        {copiedLink === 'solicitar-personal' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                        <span className="hidden sm:inline">{copiedLink === 'solicitar-personal' ? 'Copiado' : 'Copiar link solicitar personal'}</span>
                    </Button>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('candidatos')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'candidatos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <UserSquare2 className="h-4 w-4" />
                        Candidatos
                    </button>
                    <button
                        onClick={() => setActiveTab('empleados')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'empleados' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Empleados
                    </button>
                    <button
                        onClick={() => setActiveTab('archivo')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'archivo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <HardDrive className="h-4 w-4" />
                        Archivo Digital
                    </button>
                    <button
                        onClick={() => setActiveTab('solicitudes')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'solicitudes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        Solicitudes de Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('alertas')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'alertas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <BellRing className="h-4 w-4" />
                        Alertas de Contrato
                    </button>
                </div>

                {activeTab === 'candidatos' && <CandidatosKanban />}
                {activeTab === 'empleados' && <EmpleadosLista onVerArchivo={handleVerArchivo} />}
                {activeTab === 'archivo' && (
                    <ArchivoDigitalTab
                        initialBusqueda={archivoBusqueda}
                        initialCategoria={archivoCategoria}
                    />
                )}
                {activeTab === 'solicitudes' && <SolicitudesPersonalTab />}
                {activeTab === 'alertas' && <AlertasContratoTab />}
            </main>
        </div>
    )
}
