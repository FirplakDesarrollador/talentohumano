'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Settings } from 'lucide-react';

export default function SeleccionHiluPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            <div className="w-full bg-[#1e2f3d] text-white p-4 flex items-center gap-4 shadow-md sticky top-0 z-50">
                <Button onClick={() => router.push('/menu')} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-black uppercase tracking-widest flex-1">SELECCIÓN DE HILU</h1>
            </div>

            <main className="max-w-4xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500 mt-10">
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-4xl font-black text-[#1e2f3d] uppercase tracking-tight">Tipo de Formación</h2>
                    <p className="text-gray-500 font-medium text-lg">Selecciona el módulo HILU al que deseas ingresar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* HILU Operativa */}
                    <Card 
                        onClick={() => router.push(`/buscador-hilu`)}
                        className="group cursor-pointer border-none shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white rounded-3xl overflow-hidden relative"
                    >
                        <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                            <div className="h-24 w-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Briefcase className="h-12 w-12" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-[#1e2f3d] uppercase tracking-widest">HILU Operativa</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">
                                    Accede al módulo de entrenamiento operativo existente, donde encontrarás polivalencias y matriz de fases.
                                </p>
                            </div>
                            <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-blue-600 w-0 group-hover:w-full transition-all duration-700 ease-out" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* HILU Administrativa */}
                    <Card 
                        onClick={() => router.push(`/hilu-administrativa`)}
                        className="group cursor-pointer border-none shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white rounded-3xl overflow-hidden relative"
                    >
                        <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                            <div className="h-24 w-24 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Settings className="h-12 w-12" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-[#1e2f3d] uppercase tracking-widest">HILU Administrativa</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">
                                    Nuevo módulo de gestión y entrenamiento para personal administrativo.
                                </p>
                            </div>
                            <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-amber-500 w-0 group-hover:w-full transition-all duration-700 ease-out" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
