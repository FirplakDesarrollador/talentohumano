'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

interface EmpleadoCardProps {
    empleado: {
        id: number
        nombreCompleto: string
        cargo: string | null
        planta: string | null
        jefe: string | null
        empresa: string | null
        foto: string | null
        fh_completado?: boolean | null
        fi_completado?: boolean | null
        fl_completado?: boolean | null
        fu_completado?: boolean | null
        ultima_auditoria?: boolean | null
    }
    onClick?: () => void
}

export function EmpleadoCardHILU({ empleado, onClick }: EmpleadoCardProps) {
    const defaultPhoto = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/perfil.png'

    const isValidUrl = (urlString: string | null) => {
        if (!urlString) return false
        try {
            return Boolean(new URL(urlString))
        } catch (e) {
            return false
        }
    }

    const photoUrl = isValidUrl(empleado.foto) ? empleado.foto! : defaultPhoto

    const isAllHiluComplete = empleado.fh_completado && empleado.fi_completado && empleado.fl_completado && empleado.fu_completado

    // Check for leadership roles to display S10 instead of HILU
    const cargo = empleado.cargo?.toLowerCase().trim() || ''
    const isLeader = ['jefe', 'director', 'coordinador', 'gerente', 'supervisor'].some(role => cargo.includes(role))

    return (
        <div onClick={onClick} className="cursor-pointer">
            <Card className="hover:shadow-md transition-all border border-gray-100 bg-white">
                <div className="flex flex-col md:flex-row items-center p-3 gap-6">
                    {/* Avatar & Basic Info */}
                    <div className="flex items-center gap-4 w-full md:w-[30%] min-w-[250px]">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                            <Image
                                src={photoUrl}
                                alt={empleado.nombreCompleto}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-bold text-gray-700 truncate max-w-[180px]" title={empleado.nombreCompleto}>
                                {empleado.nombreCompleto}
                            </h3>
                            {isLeader ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        S10 Habilidades
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className={`text-base font-black ${empleado.fh_completado ? 'text-[#a1eebc]' : 'text-gray-300'}`}>H</span>
                                    <span className={`text-base font-black ${empleado.fi_completado ? 'text-[#a1eebc]' : 'text-gray-300'}`}>I</span>
                                    <span className={`text-base font-black ${empleado.fl_completado ? 'text-[#a1eebc]' : 'text-gray-300'}`}>L</span>
                                    <span className={`text-base font-black ${empleado.fu_completado ? 'text-[#a1eebc]' : 'text-gray-300'}`}>U</span>
                                    {isAllHiluComplete && <CheckCircle2 className="h-4 w-4 text-[#a1eebc] ml-1" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columns Info */}
                    <div className="hidden md:grid grid-cols-4 gap-4 w-full text-left">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400">Cedula:</span>
                            <span className="text-xs font-bold text-gray-600 truncate">{empleado.id}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400">Planta:</span>
                            <span className="text-xs font-bold text-gray-600 truncate" title={empleado.planta || ''}>{empleado.planta || 'null'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400">Puesto:</span>
                            <span className="text-xs font-bold text-gray-600 truncate" title={empleado.cargo || ''}>{empleado.cargo || 'null'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400">Jefe:</span>
                            <span className="text-xs font-bold text-gray-600 truncate" title={empleado.jefe || ''}>{empleado.jefe || 'null'}</span>
                        </div>
                    </div>

                    {/* Mobile Only Info */}
                    <div className="grid grid-cols-2 gap-2 w-full md:hidden text-xs">
                        <div><span className="font-bold text-gray-400">Cedula:</span> {empleado.id}</div>
                        <div><span className="font-bold text-gray-400">Planta:</span> {empleado.planta}</div>
                        <div><span className="font-bold text-gray-400">Puesto:</span> {empleado.cargo}</div>
                        <div><span className="font-bold text-gray-400">Jefe:</span> {empleado.jefe}</div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
