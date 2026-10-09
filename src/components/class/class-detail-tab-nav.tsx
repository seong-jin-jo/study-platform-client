import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import ToggleButton from '@/components/common/ui/toggle/button';
import { TABS, type Tab } from './class-detail-constants';

interface ClassDetailTabNavProps {
  activeTab: Tab;
  onTabClick: (tab: Tab) => void;
}

export function ClassDetailTabNav({
  activeTab,
  onTabClick,
}: ClassDetailTabNavProps) {
  return (
    <div className="sticky top-0 z-10 mt-325 border-b border-border-default bg-background-default">
      <div className="mx-auto max-w-page px-600">
        <div className="relative">
          <nav className="flex gap-125 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <ToggleButton
                key={tab.id}
                pressed={activeTab === tab.id}
                onPressedChange={() => onTabClick(tab.id)}
                size="sm"
                variant="square"
                className={cn(
                  'shrink-0 flex flex-col gap-100 rounded-none border-0 bg-transparent px-100 pb-0 pt-100',
                  activeTab === tab.id
                    ? 'font-designer-16b data-[state=on]:bg-transparent data-[state=on]:text-text-brand'
                    : 'font-designer-16r data-[state=off]:bg-transparent data-[state=off]:text-gray-800',
                )}
              >
                {tab.label}
                <div
                  className={cn(
                    'h-px w-full transition-colors',
                    activeTab === tab.id
                      ? 'bg-background-brand-default'
                      : 'bg-transparent',
                  )}
                />
              </ToggleButton>
            ))}
          </nav>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-400 bg-gradient-to-l from-background-default to-transparent" />
        </div>
      </div>
    </div>
  );
}
