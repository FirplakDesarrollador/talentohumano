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

    useEffect(() => {
        if (searchParams.get('error') === 'inactivo') {
            setError('Tu usuario se encuentra inactivo. Por favor, contacta a Talento Humano.')
        }
    }, [searchParams])

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
                // Verificar si el usuario está activo antes de dejarlo pasar
                const { data: emp } = await supabase
                    .from('empleados')
                    .select('activo')
                    .eq('correo_electronico', data.user.email || '')
                    .maybeSingle()

                if (emp && (emp as any).activo === false) {
                    await supabase.auth.signOut()
                    setError('Tu usuario se encuentra inactivo. Por favor, contacta a Talento Humano.')
                    setLoading(false)
                    return
                }

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

                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-xs text-gray-500 mt-8">
                            © 2024 Firplak. Todos los derechos reservados.
                        </p>
                    </div>
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
