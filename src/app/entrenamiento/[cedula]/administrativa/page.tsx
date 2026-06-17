'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function HiluAdministrativa() {
    const router = useRouter();
    const params = useParams();
    const cedula = params.cedula as string;

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-black text-[#1e2f3d] uppercase tracking-tight">HILU Administrativa</h1>
                <p className="text-gray-500 font-medium">Esta sección está en desarrollo. Pronto agregaremos las funcionalidades administrativas aquí.</p>
                
                <Button 
                    onClick={() => router.push(`/entrenamiento/${cedula}`)}
                    className="bg-[#1e2f3d] hover:bg-[#2d4356] text-white font-bold rounded-xl px-8 py-6 uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Selección
                </Button>
            </div>
        </div>
    );
}
