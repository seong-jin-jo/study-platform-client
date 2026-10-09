import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const List = ({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return <ul className={className}>{children}</ul>;
};

const ListItem = ({
  actions,
  className = '',
  children,
  disabled = false,
  onClick,
  selected = false,
}: {
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) => {
  const itemClassName = cn(
    'flex h-600 w-full items-center space-x-75 rounded-50 bg-fill-neutral-subtle-default px-150 font-designer-14m text-text-subtle outline-none hover:bg-fill-neutral-subtle-hover active:bg-fill-neutral-subtle-pressed focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:text-text-disabled',
    selected && 'border-l-2 border-border-brand bg-fill-brand-subtle-default',
    className,
  );

  return (
    <li className="flex items-center gap-100">
      {onClick ? (
        <button
          aria-current={selected || undefined}
          className={itemClassName}
          disabled={disabled}
          onClick={onClick}
          type="button"
        >
          {children}
        </button>
      ) : (
        <div className={itemClassName}>{children}</div>
      )}
      {actions}
    </li>
  );
};

List.Item = ListItem;

export default List;
