'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NIVELES_CARGO, ADMIN_LEVELS, APPROVER_LEVELS, ADMIN_EMAILS, GESTOR_LEVELS, GESTOR_EXCLUDED_EMAILS, AUMENTOS_SALARIALES_LEVELS, AUSENTISMOS_LEVELS, PROCESOS_DISCIPLINARIOS_LEVELS } from '@/lib/constants/roles'
import { Button } from '@/components/ui/button'
import {
    TrendingUp,
    PiggyBank,
    Umbrella,
    Newspaper,
    Users,
    UserX,
    Handshake,
    Monitor,
    Component,
    LogOut,
    Loader2,
    BookOpen,
    UserPlus,
    Gavel,
    ExternalLink,
    Wallet,
    Stethoscope,
    UserCircle
} from 'lucide-react'

export default function MenuPage() {
    const [user, setUser] = useState<any>(null)
    const [userLevel, setUserLevel] = useState<string>('')
    const [userName, setUserName] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                
                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('nivelCargo, nombreCompleto')
                    .eq('correo_electronico', user.email!)
                    .maybeSingle()

                if ((empleado as any)?.nivelCargo) {
                    setUserLevel((empleado as any).nivelCargo)
                    setUserName((empleado as any).nombreCompleto || '')
                } else {
                    const { data: usuario } = await supabase
                        .from('usuarios')
                        .select('rol, nombre')
                        .eq('correo', user.email!)
                        .maybeSingle()
                    
                    if ((usuario as any)?.rol) {
                        setUserName((usuario as any).nombre || '')
                        const dbRole = (usuario as any).rol.toLowerCase()
                        const roleMap: Record<string, string> = {
                            'admin': 'Jefe',
                            'desarrollador': 'Jefe',
                            'jefe': 'Jefe',
                            'gerente': 'Gerente',
                            'director': 'Director',
                            'coordinador': 'Coordinador',
                            'analista': 'Analista',
                            'supervisor': 'Supervisor',
                            'visitante': 'Operario'
                        }
                        setUserLevel(roleMap[dbRole] || (usuario as any).rol)
                    }
                }
            }
            setLoading(false)
        }
        fetchUserData()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const isSystemAdmin = (user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(userLevel as any)

    const menuItems = [
        {
            title: 'Aumentos salariales',
            href: '/aumentossalariales',
            icon: TrendingUp,
            visible: isSystemAdmin || AUMENTOS_SALARIALES_LEVELS.includes(userLevel as any)
        },
        {
            title: 'Cesantías',
            href: '/cesantias',
            icon: PiggyBank,
            visible: true
        },
        {
            title: 'Vacaciones',
            href: '/vacaciones',
            icon: Umbrella,
            visible: isSystemAdmin || userLevel !== 'Operario'
        },
        {
            title: 'Gestor de personal',
            href: '/gestor-de-personal',
            icon: Users,
            visible: !GESTOR_EXCLUDED_EMAILS.includes(user?.email) && (isSystemAdmin || GESTOR_LEVELS.includes(userLevel as any))
        },
        {
            title: 'Ausentismos',
            href: '/ausentismos',
            icon: UserX,
            visible: isSystemAdmin || AUSENTISMOS_LEVELS.includes(userLevel as any)
        },
        {
            title: 'Procesos Disciplinarios',
            href: '/procesos-disciplinarios',
            icon: Gavel,
            visible: isSystemAdmin || PROCESOS_DISCIPLINARIOS_LEVELS.includes(userLevel as any)
        },
        {
            title: 'HILU',
            href: '/buscador-hilu',
            icon: Monitor,
            visible: isSystemAdmin || ['Jefe', 'Coordinador', 'Director', 'Gerente', 'Analista', 'Supervisor'].includes(userLevel)
        },
        {
            title: 'Desempeño',
            href: '/desempeno',
            icon: Component,
            visible: user?.email && ADMIN_EMAILS.includes(user.email)
        }
    ]

    const externalLinks = [
        {
            title: 'Anticipos de nómina FIRPLAK Y JIRO',
            href: 'https://vilulatam.com/',
            icon: Wallet
        },
        {
            title: 'Reporte de incapacidades FIRPLAK Y JIRO',
            href: 'https://incapacidades.azurewebsites.net/',
            icon: Stethoscope
        },
        {
            title: 'Portal personal Firplak (Sigha)',
            href: 'https://Sigha.com.co/se_ogh/control_usuario',
            icon: UserCircle
        },
        {
            title: 'Portal personal Jiro (Sigha)',
            href: 'https://sigha.com.co/se_temporal/control_usuario/',
            icon: UserCircle
        },
        {
            title: 'Portal personal Vinculamos',
            href: 'https://portalempleados.vinculamos.com.co/',
            icon: UserCircle
        }
    ]

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Custom Top Bar */}
            <header className="bg-white px-8 py-2 flex items-center justify-between shadow-sm sticky top-0 z-50 h-16">
                {/* Logo Section */}
                <div className="flex flex-col">
                    <span className="text-xl font-black text-[#1D3557] tracking-tight">FIRPLAK</span>
                    <span className="text-[10px] text-gray-500 font-medium">App talento humano</span>
                </div>

                {/* Welcome Message */}
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-[#1D3557]">¡Bienvenido!</span>
                    <span className="text-[14px] text-blue-600 font-bold mt-1">
                        {userName || user?.user_metadata?.full_name || 'Usuario'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Microsoft Connect Button - only for authorized roles */}
                    {(isSystemAdmin || ['Coordinador', 'Jefe', 'Supervisor', 'Director'].includes(userLevel)) && (
                        <Button
                            onClick={async () => {
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'azure',
                                    options: {
                                        scopes: 'email Calendars.ReadWrite OnlineMeetings.ReadWrite',
                                        redirectTo: `${window.location.origin}/auth/callback`,
                                    },
                                })
                                if (error) {
                                    console.error('Error connecting to Microsoft:', error)
                                }
                            }}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs px-4 h-8 flex items-center gap-2 rounded-md transition-all shadow-sm"
                        >
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                                <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                                <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                                <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                            </svg>
                            <span className="hidden sm:inline">Conectar Teams</span>
                        </Button>
                    )}

                    {/* Logout Button */}
                    <Button
                        onClick={handleLogout}
                        className="bg-[#FF5F5F] hover:bg-[#FF4F4F] text-white text-xs px-4 h-8 flex items-center gap-2 rounded-md transition-all shadow-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Salir</span>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-wrap justify-center gap-6">
                    {menuItems.filter(item => item.visible).map((item) => {
                        const Icon = item.icon
                        return (
                            <Link key={item.title} href={item.href}>
                                <div className="w-[150px] h-[100px] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-3 group border border-transparent hover:border-gray-200">
                                    <Icon className="h-10 w-10 text-[#1D3557] group-hover:scale-110 transition-transform duration-300" />
                                    <span className="text-[11px] font-bold text-[#457B9D] uppercase text-center px-2">
                                        {item.title}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* External Links Section */}
                <div className="mt-16 pt-8 border-t border-gray-100">
                    <h3 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">
                        Servicios y Enlaces Externos
                    </h3>
                    <div className="flex flex-wrap justify-center gap-6">
                        {externalLinks.map((item) => {
                            const Icon = item.icon
                            return (
                                <a 
                                    key={item.title} 
                                    href={item.href} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group"
                                >
                                    <div className="w-[180px] h-[90px] bg-[#f8fafc] rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all duration-300 flex items-center p-4 gap-4">
                                        <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                            <Icon className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#1D3557] leading-tight">
                                                {item.title}
                                            </span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-[8px] text-gray-400 font-medium">Ir al sitio</span>
                                                <ExternalLink className="h-2 w-2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            )
                        })}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap');
                body {
                    font-family: 'Montserrat', sans-serif;
                }
            `}</style>
        </div>
    )
}
