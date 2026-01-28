import * as React from "react"

const SelectContext = React.createContext<any>(null)

export const Select = ({ children, value, onValueChange }: any) => {
    return (
        <SelectContext.Provider value={{ value, onValueChange }}>
            <div className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

export const SelectTrigger = ({ children, className }: any) => {
    return (
        <div className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
            {children}
        </div>
    )
}

export const SelectValue = ({ placeholder }: any) => {
    const { value } = React.useContext(SelectContext)
    return <span>{value || placeholder}</span>
}

export const SelectContent = ({ children }: any) => {
    const { onValueChange } = React.useContext(SelectContext)
    return (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md border shadow-lg">
            <select
                className="w-full h-full p-2 bg-transparent outline-none cursor-pointer"
                onChange={(e) => onValueChange && onValueChange(e.target.value)}
            >
                {children}
            </select>
        </div>
    )
}

export const SelectItem = ({ value, children }: any) => {
    return <option value={value}>{children}</option>
}
