import React from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  helperText,
  className = "",
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <textarea
        className={`w-full p-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm resize-none text-gray-800 placeholder-gray-400 ${className}`}
        {...props}
      />
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
};
