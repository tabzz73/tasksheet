import React from 'react';

interface CardNavigationButtonProps {
  label: string;
  onActivate: () => void;
  roundedClassName?: string;
}

export const CardNavigationButton: React.FC<CardNavigationButtonProps> = ({
  label,
  onActivate,
  roundedClassName = 'rounded-xl',
}) => (
  <button
    type="button"
    aria-label={label}
    data-card-navigation="true"
    onClick={onActivate}
    className={`absolute inset-0 z-10 cursor-pointer ${roundedClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2`}
  />
);
