import * as React from "react"
import { ChevronDown, Check } from "lucide-react"

const SelectContext = React.createContext<any>(null)

export const Select = ({ children, value, onValueChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
            <div ref={containerRef} className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

export const SelectTrigger = ({ children, className }: any) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
        >
            {children}
            <ChevronDown className={`h-4 w-4 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    )
}

export const SelectValue = ({ placeholder }: any) => {
    const { value } = React.useContext(SelectContext)
    return <span className="truncate">{value && value !== 'all' ? value : placeholder}</span>
}

export const SelectContent = ({ children, className }: any) => {
    const { isOpen } = React.useContext(SelectContext)
    
    if (!isOpen) return null

    return (
        <div className={`absolute z-[100] mt-2 w-full bg-white rounded-xl border border-gray-100 shadow-2xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200 ${className}`}>
            <div className="p-1.5 flex flex-col gap-1">
                {children}
            </div>
        </div>
    )
}

export const SelectItem = ({ value, children }: any) => {
    const { onValueChange, setIsOpen, value: currentValue } = React.useContext(SelectContext)
    const isSelected = currentValue === value
    
    return (
        <div
            className={`cursor-pointer px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors
                ${isSelected 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            onClick={() => {
                onValueChange && onValueChange(value)
                setIsOpen(false)
            }}
        >
            <span className="truncate">{children}</span>
            {isSelected && <Check className="h-4 w-4 shrink-0" />}
        </div>
    )
}
