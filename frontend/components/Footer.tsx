import Image from 'next/image';
import { Link, NextUiLinkClasses } from '@/src/i18n/routing';
import { LocaleCodeType } from '@/types/locale';

type Props = {
  locale: LocaleCodeType;
};

export default function Footer({ locale }: Props) {
  return (
    <div className="w-full text-center py-2 px-6 flex flex-wrap justify-center items-center gap-4 text-gray-500">
      <Link href="https://github.com/moliason/Test-platfrom" aria-label="Test-platfrom">
        <Image src="/favicon/test-platfrom.svg" width={32} height={32} alt="Test-platfrom" />
      </Link>
      <div>
        <Link
          href="https://github.com/moliason/Test-platfrom"
          className={`${NextUiLinkClasses} !text-gray-500 hover:text-gray-700`}
        >
          Test-platfrom
        </Link>
      </div>

      <Link href={'/health'} locale={locale} className={`${NextUiLinkClasses} !text-gray-500 hover:text-gray-700`}>
        Status
      </Link>
    </div>
  );
}
