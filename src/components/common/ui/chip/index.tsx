import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import IconButton from '@/components/common/ui/icon-button';

interface Props {
  text: string;
  isActive?: boolean;
  className?: string;
  onClose?: () => void;
}

const chipVariants = cva(
  'flex min-h-500 items-center justify-center rounded-full border border-border-subtle p-100 font-designer-14m text-text-default',
  {
    variants: {
      color: {
        default:
          'border-border-default bg-background-default text-text-subtlest',
        isActive: 'border-none bg-fill-brand-default-default text-text-inverse',
      },
    },
    defaultVariants: {
      color: 'default',
    },
  },
);

function Chip({ text, isActive = false, className, onClose }: Props) {
  return (
    <div
      className={cn(
        chipVariants({ color: isActive ? 'isActive' : 'default' }),
        className,
        'flex items-center gap-50',
      )}
    >
      {text}
      {onClose && (
        <IconButton
          label={`${text} 삭제`}
          size="xs"
          onClick={onClose}
          className="size-250 p-0 hover:bg-transparent"
        >
          <X size={20} />
        </IconButton>
      )}
    </div>
  );
}

export default Chip;
