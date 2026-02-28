import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ElderlyButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  icon?: LucideIcon;
  fullWidth?: boolean;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  shadow?: boolean;
}

const ElderlyButton: React.FC<ElderlyButtonProps> = ({ 
  text, 
  onClick, 
  variant = 'primary', 
  icon: Icon, 
  fullWidth = true,
  size = 'lg',
  disabled = false,
  shadow = false
}) => {
  
  const baseStyles = "relative overflow-hidden rounded-2xl font-black flex items-center justify-center transition-all active:scale-[0.98] duration-200 select-none touch-manipulation";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1",
    secondary: "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-b-4 border-orange-600 active:border-b-0 active:translate-y-1",
    success: "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-b-4 border-green-600 active:border-b-0 active:translate-y-1",
    danger: "bg-gradient-to-r from-red-600 to-rose-500 text-white border-b-4 border-red-700 active:border-b-0 active:translate-y-1",
    outline: "bg-white border-2 border-gray-200 text-gray-600 active:bg-gray-50 active:border-gray-300",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100"
  };

  const sizes = {
    md: "py-3 px-6 text-lg",
    lg: "py-4 px-8 text-xl",
    xl: "py-5 px-10 text-2xl"
  };
  
  const shadowClass = shadow && variant !== 'outline' && variant !== 'ghost' 
    ? "shadow-[0_10px_20px_-5px_rgba(0,0,0,0.25)]" 
    : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''}
        ${shadowClass}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed active:translate-y-0 active:border-b-4' : ''}
      `}
    >
      {Icon && <Icon size={size === 'xl' ? 32 : 24} strokeWidth={3} className="mr-3" />}
      <span className="relative z-10">{text}</span>
      {/* Glossy overlay effect */}
      {variant !== 'outline' && variant !== 'ghost' && (
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white opacity-10 pointer-events-none"></div>
      )}
    </button>
  );
};

export default ElderlyButton;