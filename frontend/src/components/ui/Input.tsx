import { forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconRight, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={clsx(
              "input-base",
              icon && "pl-10",
              iconRight && "pr-10",
              error && "border-danger focus:border-danger focus:shadow-[0_0_0_2px_rgba(255,71,87,0.15)]",
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-danger animate-fade-in">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
