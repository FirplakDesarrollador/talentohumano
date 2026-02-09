'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Eraser, Check } from 'lucide-react'
import Image from 'next/image'

interface CrearFirmaProps {
    onFirmaGuardada: (firmaBase64: string) => void
    onCancel?: () => void
}

export function CrearFirma({ onFirmaGuardada, onCancel }: CrearFirmaProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000000'

        // Handle resizing
        const parent = canvas.parentElement
        if (parent) {
            canvas.width = parent.clientWidth
            canvas.height = 150
        }
    }, [])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        setIsDrawing(true)
        setHasSignature(true)

        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.beginPath()
        ctx.moveTo(offsetX, offsetY)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.lineTo(offsetX, offsetY)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY

        if ('touches' in e) {
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }

        const rect = canvas.getBoundingClientRect()
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        }
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const saveSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dataUrl = canvas.toDataURL('image/png')
        onFirmaGuardada(dataUrl)
    }

    return (
        <div className="w-full space-y-2">
            <div className="border border-gray-200 rounded-md bg-white overflow-hidden touch-none shadow-sm">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[150px] cursor-crosshair block"
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={!hasSignature} className="h-8 text-xs text-gray-500 hover:text-red-500">
                    <Eraser className="h-3 w-3 mr-1" />
                    Limpiar
                </Button>
                {onCancel && (
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button size="sm" onClick={saveSignature} disabled={!hasSignature} className="h-8 text-xs bg-[#1e2f3d] hover:bg-[#2c4255]">
                    <Check className="h-3 w-3 mr-1" />
                    Guardar
                </Button>
            </div>
        </div>
    )
}

interface VerFirmaProps {
    firmaUrl?: string | null
    label?: string
    fecha?: string | null
}

export function VerFirma({ firmaUrl, label = 'Firma', fecha }: VerFirmaProps) {
    const isValidSignature = (url?: string | null) => {
        if (!url) return false
        return true // Trust that if it's a string, it's a path or URL. next/image will handle the 404 if it's wrong.
    }

    // Helper to format the source correctly for next/image
    const getSafeSrc = (url: string) => {
        // Check if it's a raw base64 string (starts with iVBOR for PNG, or generally looks like base64 structure without prefix)
        // A simple check is if it doesn't start with 'http', '/', or 'data:'
        if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')) {
            // Assume it's a base64 PNG if it starts with the common PNG header, or just try prepending generic png base64
            return `data:image/png;base64,${url}`
        }
        return url
    }

    if (!isValidSignature(firmaUrl)) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-[80px] border-b border-gray-300 mb-1 bg-gray-50 text-gray-400">
                <span className="text-xs italic">
                    {!firmaUrl ? 'Pendiente de firma' : 'Firma no válida'}
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full h-[80px] border-b border-gray-300 mb-1">
                <Image
                    src={getSafeSrc(firmaUrl!)}
                    alt="Firma"
                    fill
                    className="object-contain"
                />
            </div>
            <div className="text-xs text-gray-500 font-medium">{label}</div>
            {fecha && <div className="text-[10px] text-gray-400">{new Date(fecha).toLocaleDateString()}</div>}
        </div>
    )
}
