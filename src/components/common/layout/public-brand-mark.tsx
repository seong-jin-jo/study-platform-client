import Image from 'next/image';
import Link from 'next/link';

export default function PublicBrandMark() {
  return (
    <div className="flex shrink-0 items-center gap-100 md:h-full md:px-0 md:py-0 xl:h-auto xl:px-100 xl:py-125">
      <Image src="/icons/logo.svg" alt="Logo" width={18} height={18} />
      <Link
        href="/"
        className="inline-flex min-h-550 items-center"
        aria-label="홈"
      >
        <Image
          src="/icons/logo_title.svg"
          alt="Logo-title"
          width={106}
          height={11}
        />
      </Link>
      <span className="rounded-full border-[0.5px] border-border-default px-75 py-25 text-center font-designer-12m leading-normal font-medium">
        BETA
      </span>
    </div>
  );
}
