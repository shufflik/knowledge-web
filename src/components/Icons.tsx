import React from 'react';

type IconProps = { size?: number; color?: string; } & React.SVGProps<SVGSVGElement>;

export function SearchIcon({ size = 20, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke={color} strokeWidth="2"/>
      <path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function TopicIcon({ size = 20, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function LinkIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M10 14a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 10a5 5 0 0 1 0 7L12.5 18.5a5 5 0 1 1-7-7L7 10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function FileIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="2"/>
      <path d="M13 3v5h5" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function TextDocIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function NoImageIcon({ size = 36, color = '#888', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
      <path d="M7 15l3-3 3 3 4-4 2 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="9" cy="8" r="1.5" fill={color}/>
    </svg>
  );
}

export function CloseIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function EditIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M4 20h4l10-10a2.828 2.828 0 1 0-4-4L4 16v4Z" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function TrashIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 6h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 6l1-2h6l1 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function StarIcon({ size = 18, color = '#ffd166', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
    </svg>
  );
}

export function FolderIcon({ size = 20, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

export function ChevronDownIcon({ size = 18, color = '#ffffff', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


