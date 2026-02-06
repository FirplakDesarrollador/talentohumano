'use client'

import React from 'react';
import { Briefcase, MapPin, User, Building2, Edit, ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmpleadoCardGestorProps {
    empleado: {
        id: number;
        cedula: number;
        nombreCompleto: string;
        cargo: string | null;
        planta: string | null;
        jefe: string | null;
        foto: string | null;
        empresa: string | null;
        activo: boolean | null;
    };
    onEdit?: () => void;
    canEdit?: boolean;
}

export const EmpleadoCardGestor: React.FC<EmpleadoCardGestorProps> = ({ empleado, onEdit, canEdit = true }) => {
    const defaultPhoto = 'https://jdtjtkncptwqdhlxmzds.supabase.co/storage/v1/object/public/publico/assets/perfil.png';

    return (
        <Card className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300 border border-gray-100 group">
            <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 p-4">
                    {/* Photo and Status */}
                    <div className="relative flex-shrink-0">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-sm border-2 border-white group-hover:scale-105 transition-transform duration-300">
                            {empleado.foto && (empleado.foto.startsWith('http') || empleado.foto.startsWith('/')) ? (
                                <Image
                                    src={empleado.foto}
                                    alt={empleado.nombreCompleto}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <Image
                                    src={defaultPhoto}
                                    alt={empleado.nombreCompleto}
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                        <Badge
                            className={`absolute -bottom-2 -right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-white shadow-sm ${empleado.activo ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            {empleado.activo ? 'Activo' : 'Retirado'}
                        </Badge>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-bold text-[#1e2f3d] leading-tight truncate">
                                    {empleado.nombreCompleto}
                                </h3>
                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit?.();
                                        }}
                                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 shrink-0"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs font-bold text-gray-400 mt-0.5 tracking-wide">
                                C.C. {empleado.cedula || empleado.id}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                                <span className="font-bold uppercase tracking-tighter text-gray-400 w-12">Cargo</span>
                                <span className="text-gray-700 font-semibold truncate">{empleado.cargo || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <MapPin className="h-3.5 w-3.5 text-red-400" />
                                <span className="font-bold uppercase tracking-tighter text-gray-400 w-12">Planta</span>
                                <span className="text-gray-700 font-semibold truncate">{empleado.planta || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <User className="h-3.5 w-3.5 text-orange-400" />
                                <span className="font-bold uppercase tracking-tighter text-gray-400 w-12">Jefe</span>
                                <span className="text-gray-700 font-semibold truncate">{empleado.jefe || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Building2 className="h-3.5 w-3.5 text-green-400" />
                                <span className="font-bold uppercase tracking-tighter text-gray-400 w-12">Empresa</span>
                                <span className="text-gray-700 font-semibold truncate">{empleado.empresa || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Right Action Overlay (Hidden on Mobile) */}
                    <div className="hidden sm:flex items-center justify-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-6 w-6 text-gray-300" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
