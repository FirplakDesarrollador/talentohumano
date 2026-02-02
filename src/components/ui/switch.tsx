import * as React from "react"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (onChange) onChange(e)
            if (onCheckedChange) onCheckedChange(e.target.checked)
        }

        return (
            <input
                type="checkbox"
                ref={ref}
                className={`peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-gray-200 transition-colors checked:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                onChange={handleChange}
                {...props}
            />
        )
    }
)
Switch.displayName = "Switch"

export { Switch }
