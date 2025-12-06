import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading,
  disabled,
  ...props 
}) => {
  // Base: uppercase, sharp corners, mono font
  const baseStyles = "px-6 py-2 uppercase tracking-wider text-sm font-bold transition-all duration-75 flex items-center justify-center gap-2 focus:outline-none focus:ring-1 focus:ring-terminal-green disabled:opacity-50 disabled:cursor-not-allowed border";
  
  const variants = {
    // Green border, green text -> Green bg, black text on hover
    primary: "border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black bg-black",
    // Dim border -> Green border on hover
    secondary: "border-terminal-border text-gray-500 hover:text-terminal-green hover:border-terminal-green bg-transparent",
    // Red border
    danger: "border-terminal-alert text-terminal-alert hover:bg-terminal-alert hover:text-black bg-transparent",
    ghost: "border-transparent text-gray-500 hover:text-terminal-green hover:bg-terminal-dim"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="animate-spin mr-2 font-mono">/</span>
      )}
      {children}
    </button>
  );
};