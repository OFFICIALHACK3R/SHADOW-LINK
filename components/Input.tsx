import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs uppercase tracking-widest text-terminal-greenDim font-bold mb-1">[ {label} ]</label>}
      <div className="relative flex items-center group">
        <span className="absolute left-3 text-terminal-green font-bold select-none">{'>'}</span>
        <input
          className={`w-full bg-black border ${error ? 'border-terminal-alert' : 'border-terminal-greenDim'} px-4 pl-8 py-3 text-terminal-green placeholder-terminal-greenDim/50 focus:border-terminal-green focus:ring-0 focus:outline-none transition-colors font-mono ${className}`}
          spellCheck={false}
          autoComplete="off"
          {...props}
        />
        {/* Blinking cursor simulation if focused could go here, but default caret is colored by css */}
      </div>
      {error && <p className="text-xs text-terminal-alert mt-1 font-mono">! ERROR: {error}</p>}
    </div>
  );
};