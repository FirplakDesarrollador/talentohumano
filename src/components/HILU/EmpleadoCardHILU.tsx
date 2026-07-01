'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface EmpleadoCardProps {
    empleado: {
        id: number
        nombreCompleto: string
        cargo: string | null
        nivelCargo?: string | null
        planta: string | null
        jefe: string | null
        empresa: string | null
        foto: string | null
        fh_completado?: boolean | null
        fi_completado?: boolean | null
        fl_completado?: boolean | null
        fu_completado?: boolean | null
        ultima_auditoria?: boolean | null
        adminData?: {
            fh_completado?: boolean | null
            fi_completado?: boolean | null
            fl_completado?: boolean | null
        } | null
    }
    onClick?: () => void
    isAdminContext?: boolean
}

export function EmpleadoCardHILU({ empleado, onClick, isAdminContext = false }: EmpleadoCardProps) {
    const router = useRouter()

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
    
    // Checks for operative completion (H I L U)
    const isOperativeComplete = empleado.fh_completado && empleado.fi_completado && empleado.fl_completado && empleado.fu_completado
    // Checks for administrative completion (H I L)
    const isAdminComplete = empleado.adminData && empleado.adminData.fh_completado && empleado.adminData.fi_completado && empleado.adminData.fl_completado

    // Normalize name to lowercase, remove accents, and collapse multiple spaces into one
    const normalizedName = empleado.nombreCompleto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const empArea = (empleado as any).area || empleado.planta || '';
    const empNivel = (empleado.nivelCargo || '').toLowerCase();
    
    const isSupervisorOrSpecific = 
        empNivel.includes('supervisor') || 
        normalizedName.includes('hector jose chinchilla') || 
        normalizedName.includes('hector chinchilla') ||
        normalizedName.includes('jakeline chaverra') ||
        normalizedName.includes('sara maria aguilar') ||
        normalizedName.includes('carlos jose mier') ||
        normalizedName.includes('ederson estiven') ||
        normalizedName.includes('juliana ramirez') ||
        normalizedName.includes('maria isabel escobar');

    const isAdministrativo = 
        ['Contabilidad', 'Financiera', 'Legal', 'TI', 'Talento y Cultura', 'Negociacion y compras', 'Mercadeo', 'Servicios', 'Logistica', 'I+D+I', 'Comercial', 'Administrativa'].includes(empArea) ||
        ['analista', 'jefe', 'gerente', 'director', 'coordinador', 'administrador', 'desarrollador'].includes(empNivel) ||
        normalizedName.includes('alejo') || normalizedName.includes('alejandro fernandez');

    const showAdminHilu = isAdministrativo || isSupervisorOrSpecific;
    const showOperativeHilu = !isAdministrativo || isSupervisorOrSpecific;

    return (
        <div onClick={onClick} className="cursor-pointer">
            <Card className="hover:shadow-md transition-all border border-gray-100 bg-white">
                <div className="flex flex-col md:flex-row items-center p-3 gap-6">
                    {/* Avatar & Basic Info */}
                    <div className="flex items-center gap-4 w-full md:w-[40%] min-w-[250px]">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                            <Image
                                src={photoUrl}
                                alt={empleado.nombreCompleto}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                            <h3 className="text-sm font-bold text-gray-700 truncate max-w-[220px]" title={empleado.nombreCompleto}>
                                {empleado.nombreCompleto}
                            </h3>
                            
                            <div className="flex flex-col gap-1 mt-1">
                                {/* HILU Administrativa */}
                                {showAdminHilu && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded leading-none">Admin</span>
                                        <div className="flex items-center gap-1.5">
                                            {['H', 'I', 'L'].map((letter) => {
                                                const fieldPrefix = letter.toLowerCase();
                                                const isDone = empleado.adminData ? !!(empleado.adminData as any)[`f${fieldPrefix}_completado`] : false;
                                                
                                                return (
                                                    <span 
                                                        key={`admin-${letter}`}
                                                        className={`text-sm font-black transition-all ${
                                                            isDone 
                                                            ? 'text-[#22c55e] drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' 
                                                            : 'text-gray-300'
                                                        }`}
                                                    >
                                                        {letter}
                                                    </span>
                                                );
                                            })}
                                            {isAdminComplete && <CheckCircle2 className="h-3 w-3 text-[#22c55e] ml-1" />}
                                        </div>
                                    </div>
                                )}

                                {/* HILU Sistema / Operativa */}
                                {showOperativeHilu && (
                                    <div className="flex items-center gap-2">
                                        {showAdminHilu && <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded leading-none">Sist.</span>}
                                        <div className="flex items-center gap-1.5">
                                            {['H', 'I', 'L', 'U'].map((letter) => {
                                                const fieldPrefix = letter.toLowerCase();
                                                const isDone = !!(empleado as any)[`f${fieldPrefix}_completado`];
                                                
                                                return (
                                                    <span 
                                                        key={`op-${letter}`}
                                                        className={`text-sm font-black transition-all ${
                                                            isDone 
                                                            ? 'text-[#22c55e] drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' 
                                                            : 'text-gray-300'
                                                        }`}
                                                    >
                                                        {letter}
                                                    </span>
                                                );
                                            })}
                                            {isOperativeComplete && <CheckCircle2 className="h-3 w-3 text-[#22c55e] ml-1" />}
                                        </div>
                                    </div>
                                )}
                            </div>
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
