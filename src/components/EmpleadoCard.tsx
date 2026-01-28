import React from 'react';
import { Briefcase, MapPin, User, Building2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface EmpleadoProps {
    empleado: {
        id: number;
        cedula: number;
        nombreCompleto: string;
        cargo: string | null;
        planta: string | null;
        jefe: string | null;
        foto: string | null;
        empresa: string | null;
    };
}

export const EmpleadoCard: React.FC<EmpleadoProps> = ({ empleado }) => {
    return (
        <Card className="overflow-hidden bg-white shadow-md border-none">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6">
                    {/* Avatar Section */}
                    <div className="relative">
                        {empleado.foto ? (
                            <img
                                src={empleado.foto}
                                alt={empleado.nombreCompleto}
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 shadow-sm"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#716E6A] to-[#45433F] flex items-center justify-center text-white shadow-sm">
                                <User size={40} />
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div>
                            <h2 className="text-xl font-bold text-[#45433F] mb-1">
                                {empleado.nombreCompleto}
                            </h2>
                            <p className="text-sm font-medium text-gray-500">
                                C.C. {empleado.cedula}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm text-[#716E6A]">
                                <Briefcase size={16} className="text-[#3b82f6]" />
                                <span className="font-semibold mr-1 text-[#45433F]">Cargo:</span>
                                {empleado.cargo || 'No asignado'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#716E6A]">
                                <MapPin size={16} className="text-[#ef4444]" />
                                <span className="font-semibold mr-1 text-[#45433F]">Planta:</span>
                                {empleado.planta || 'No asignada'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#716E6A]">
                                <Building2 size={16} className="text-[#10b981]" />
                                <span className="font-semibold mr-1 text-[#45433F]">Empresa:</span>
                                {empleado.empresa || 'No asignada'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#716E6A]">
                                <User size={16} className="text-[#f59e0b]" />
                                <span className="font-semibold mr-1 text-[#45433F]">Jefe:</span>
                                {empleado.jefe || 'No asignado'}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
