import { type HTMLAttributes, type ReactNode } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}
export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {}
export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}
