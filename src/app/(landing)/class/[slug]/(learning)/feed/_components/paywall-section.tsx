import Button from '@/components/common/ui/button';
import type { BuilderFeedPaywall } from '@/types/api/course.types';

export function PaywallSection({
  paywall,
  onCtaClick,
}: {
  paywall: BuilderFeedPaywall;
  onCtaClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-450 border-t border-border-subtle pt-800">
      <div className="flex flex-col items-center gap-150">
        <p className="font-designer-24b text-gray-1000">{paywall.title}</p>
        <p className="font-designer-16r text-center text-gray-800">
          {paywall.description}
        </p>
      </div>
      <Button
        type="button"
        color="primary"
        size="large"
        onClick={onCtaClick}
        className="h-700 w-3400 font-designer-18b"
      >
        {paywall.ctaLabel}
      </Button>
    </div>
  );
}
