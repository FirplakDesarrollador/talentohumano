'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

function LoginForm() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(searchParams.get('error'))
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
            } else if (data.user) {
                router.push('/menu')
                router.refresh()
            }
        } catch (err) {
            setError('Error al iniciar sesión')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Left Side: Form Section */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-[360px] space-y-8">
                    {/* Logo and Subtitle */}
                    <div className="text-center space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight text-[#1a365d]">
                            FIRPLAK
                        </h1>
                        <p className="text-gray-500 font-light italic">
                            Inspirando hogares
                        </p>
                        <p className="text-sm text-gray-500 mt-4">
                            App talento humano
                        </p>
                    </div>

                    {/* Welcome Text */}
                    <div className="text-center pt-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                            ¡Bienvenido!
                        </h2>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-12 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-12 px-4 pr-12 focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-destructive text-xs text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2d4356] hover:bg-[#1e2d3a] text-white h-12 rounded-lg text-base font-medium transition-colors"
                        >
                            {loading ? 'Cargando...' : 'Ingresar'}
                        </Button>

                        <div className="text-center space-y-2">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-gray-500 hover:text-gray-800 transition-colors block"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                            <Link
                                href="/register"
                                className="text-sm font-medium text-[#1a365d] hover:text-[#2d4356] transition-colors block"
                            >
                                Crear usuario
                            </Link>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">O continuar con</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true)
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'azure',
                                    options: {
                                        scopes: 'email Calendars.ReadWrite OnlineMeetings.ReadWrite',
                                        redirectTo: `${window.location.origin}/auth/callback`,
                                    },
                                })
                                if (error) {
                                    setError(error.message)
                                    setLoading(false)
                                }
                            }}
                            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 h-12 rounded-lg text-base font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                                <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                                <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                                <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                            </svg>
                            Microsoft
                        </Button>
                    </form>
                </div>
            </div>

            {/* Right Side: Image Section */}
            <div className="hidden lg:flex flex-1 p-6">
                <div className="relative w-full h-full rounded-[40px] overflow-hidden shadow-2xl">
                    <Image
                        src="/login-bg.jpg"
                        alt="Team collaboration"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex bg-white" />}>
            <LoginForm />
        </Suspense>
    )
}
