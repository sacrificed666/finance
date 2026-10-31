"use client";

import Button, { type ButtonSize } from "../Button/Button";
import Icon from "../Icon/Icon";

interface AddButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
  size?: ButtonSize;
  disabled?: boolean;
}

// A button with a plus that starts a new record; small in a card's header
const AddButton = ({ label, onClick, variant = "ghost", size = "md", disabled }: AddButtonProps) => (
  <Button variant={variant} size={size} onClick={onClick} disabled={disabled}>
    <Icon name="plus" size={14} strokeWidth={2.2} />
    {label}
  </Button>
);

export default AddButton;
