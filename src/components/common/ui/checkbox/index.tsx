import Image from 'next/image';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const TOKEN_THEME_CLASSES: Record<string, string> = {
  'fill-success-default-default':
    'border-fill-success-default-default bg-fill-success-default-default',
  'fill-warning-default-default':
    'border-fill-warning-default-default bg-fill-warning-default-default',
  'rose-500': 'border-rose-500 bg-rose-500',
};

const Checkbox = ({
  id,
  defaultChecked = false,
  checked,
  onToggle,
  themeColor = 'fill-success-default-default',
  label,
  ariaLabel,
  className,
}: {
  id: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onToggle: () => void;
  themeColor?: string;
  label?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) => {
  // Check if themeColor is a hex color (starts with #)
  const isHexColor = themeColor.startsWith('#');

  // Get the appropriate className or style
  const getThemeStyles = () => {
    if (isHexColor) {
      return {
        style: checked
          ? { borderColor: themeColor, backgroundColor: themeColor }
          : undefined,
        className: checked
          ? 'border-2'
          : 'border-border-default bg-fill-neutral-subtle-default border-2',
      };
    } else {
      return {
        style: undefined,
        className: checked
          ? cn(
              'border-2',
              TOKEN_THEME_CLASSES[themeColor] ??
                TOKEN_THEME_CLASSES['fill-success-default-default'],
            )
          : 'border-border-default bg-fill-neutral-subtle-default border-2',
      };
    }
  };

  const { style, className: themeClassName } = getThemeStyles();

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex cursor-pointer items-center gap-125',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        aria-label={ariaLabel}
        className="peer sr-only"
        {...(checked !== undefined
          ? { checked, onChange: onToggle }
          : { defaultChecked, onChange: onToggle })}
      />
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-50 transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring',
          themeClassName,
        )}
        style={style}
      >
        <Image
          src="/icons/shape.svg"
          alt="checkbox"
          width={20}
          height={20}
          className={checked ? 'brightness-0 invert filter' : ''}
        />
      </div>
      {label}
    </label>
  );
};

export default Checkbox;
