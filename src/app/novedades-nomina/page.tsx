'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { NovedadesForm } from '@/components/Novedades/NovedadesForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Table as TableIcon } from 'lucide-react'

export default function NovedadesNominaPage() {
    const router = useRouter()
    const params = useParams()
    const cedula = params?.cedula as string | undefined

    return (
        <div className="min-h-screen bg-[#F1F4F8]">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Novedades de Nómina
                </div>
                <div className="w-8" /> {/* Spacer for balance */}
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                <div className="flex justify-end mb-6">
                    <Button
                        onClick={() => router.push('/reporte-novedades')}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                        <TableIcon className="h-5 w-5" />
                        Ver Reporte
                    </Button>
                </div>

                <NovedadesForm
                    cedulaViene={cedula}
                    onSuccess={() => {
                        // Optional: extra logic after success
                    }}
                />
            </div>
        </div>
    )
}
