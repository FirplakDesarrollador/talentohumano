'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
    Loader2
} from 'lucide-react'

export default function MenuPage() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        getUser()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const menuItems = [
        {
            title: 'Aumentos salariales',
            href: '/aumentossalariales',
            icon: TrendingUp,
        },
        {
            title: 'Comisiones',
            href: '/comisiones',
            icon: TrendingUp, // Analogous to original
        },
        {
            title: 'Cesantias',
            href: '/cesantias',
            icon: PiggyBank,
        },
        {
            title: 'Vacaciones',
            href: '/vacaciones',
            icon: Umbrella,
        },
        {
            title: 'NOVEDADES NÓMINA',
            href: '/novedades-nomina',
            icon: Newspaper,
        },
        {
            title: 'Gestor de personal',
            href: '/gestor-de-personal',
            icon: Users,
        },
        {
            title: 'Ausentismos',
            href: '/ausentismos',
            icon: UserX,
        },
        {
            title: 'Procesos disciplinarios',
            href: '/buscador-procesos-disciplinarios',
            icon: Handshake,
        },
        {
            title: 'HILU',
            href: '/buscador-hilu',
            icon: Monitor,
        },
        {
            title: 'Desempeño',
            href: '/competencias',
            icon: Component,
        },
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
                    <span className="text-xs text-gray-600">
                        Usuario: <span className="font-semibold">{user?.user_metadata?.full_name || user?.email || 'Usuario'}</span>
                    </span>
                </div>

                {/* Logout Button */}
                <Button
                    onClick={handleLogout}
                    className="bg-[#FF5F5F] hover:bg-[#FF4F4F] text-white text-xs px-4 h-8 flex items-center gap-2 rounded-md transition-all shadow-sm"
                >
                    <LogOut className="h-4 w-4" />
                    Salir
                </Button>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-wrap justify-center gap-6">
                    {menuItems.map((item) => {
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
