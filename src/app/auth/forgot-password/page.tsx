'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const supabase = createClient()

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setMessage(null)
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login/newPassword`,
            })

            if (error) {
                if (error.status === 504) {
                    setError('El servidor de Supabase está tardando demasiado en responder (Error 504). Esto suele deberse a un problema de configuración del correo (SMTP) en el dashboard de Supabase.')
                } else {
                    setError(error.message)
                }
            } else {
                setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.')
            }
        } catch (err) {
            setError('Error al enviar el enlace de recuperación')
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
                        <p className="text-gray-500 font-light italic">
                            Inspirando hogares
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-800 text-center">
                            ¿Olvidaste tu contraseña?
                        </h2>
                        <p className="text-sm text-gray-500 text-center">
                            Ingresa tu correo para recibir un enlace de recuperación.
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-6">
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="bg-slate-50 border-none h-12 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                        />

                        {error && (
                            <div className="text-destructive text-sm text-center">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="text-green-600 text-sm text-center">
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2d4356] hover:bg-[#1e2d3a] text-white h-12 rounded-lg text-base font-medium transition-colors"
                        >
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </Button>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="text-sm text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
