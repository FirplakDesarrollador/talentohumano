'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const [verifying, setVerifying] = useState(true)
    const hasExchanged = React.useRef(false)

    React.useEffect(() => {
        if (hasExchanged.current) return
        hasExchanged.current = true

        const checkSession = async () => {
            // Primero revisamos si hay un código en la URL (flujo PKCE)
            const urlParams = new URLSearchParams(window.location.search)
            const code = urlParams.get('code')

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                // Si hay error de intercambio, verificamos si ya existe una sesión (pudo ser procesada por el middleware)
                if (exchangeError) {
                    const { data: { session: existingSession } } = await supabase.auth.getSession()
                    if (!existingSession) {
                        setError('El código de recuperación es inválido o ha expirado.')
                        setVerifying(false)
                        return
                    }
                }
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Si no hay sesión, damos un pequeño margen por si se está procesando
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (!retrySession) {
                        setError('No se pudo encontrar una sesión válida. Por favor, solicita un nuevo enlace de recuperación.')
                    }
                    setVerifying(false)
                }, 1000)
            } else {
                setError(null) // Limpiamos cualquier error si la sesión es válida
                setVerifying(false)
            }
        }
        checkSession()
    }, [supabase.auth])
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            })

            if (error) {
                setError(error.message)
            } else {
                router.push('/login?message=Contraseña actualizada correctamente')
            }
        } catch (err) {
            setError('Error al actualizar la contraseña')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-white font-sans">
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-[360px] space-y-8">
                    <div className="text-center space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight text-[#1a365d]">
                            FIRPLAK
                        </h1>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-800 text-center">
                            Restablecer contraseña
                        </h2>
                        <p className="text-sm text-gray-500 text-center">
                            Ingresa tu nueva contraseña a continuación.
                        </p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-12 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
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
                            <Input
                                type="password"
                                placeholder="Confirmar contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-slate-50 border-none h-12 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                            />
                        </div>

                        {error && (
                            <div className="text-destructive text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || verifying}
                            className="w-full bg-[#2d4356] hover:bg-[#1e2d3a] text-white h-12 rounded-lg text-base font-medium transition-colors"
                        >
                            {loading ? 'Actualizando...' : verifying ? 'Verificando sesión...' : 'Actualizar contraseña'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
