import React, { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from './button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
    onEnd?: (signatureData: string) => void;
    placeholder?: string;
    width?: number | string;
    height?: number | string;
    className?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
    onEnd,
    placeholder = "Firme aquí",
    width = "100%",
    height = 200,
    className = ""
}) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    const clear = () => {
        sigCanvas.current?.clear();
        if (onEnd) onEnd('');
    };

    const handleEnd = () => {
        if (onEnd && sigCanvas.current) {
            onEnd(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div
                className="relative bg-white border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden"
                style={{ height }}
            >
                <SignatureCanvas
                    ref={sigCanvas}
                    onEnd={handleEnd}
                    penColor="black"
                    canvasProps={{
                        className: 'signature-canvas w-full h-full cursor-crosshair',
                        style: { width: '100%', height: '100%' }
                    }}
                />

                {(!sigCanvas.current || sigCanvas.current.isEmpty()) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 font-medium uppercase tracking-widest text-xs">
                        {placeholder}
                    </div>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clear}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8"
                    title="Borrar firma"
                >
                    <Eraser className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-tighter">
                Certifico que la firma capturada es válida y legal
            </p>
        </div>
    );
};
