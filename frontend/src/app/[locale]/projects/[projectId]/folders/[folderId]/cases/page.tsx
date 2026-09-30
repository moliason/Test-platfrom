import { getTranslations } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Cases' });
  return {
    title: `${t('test_case_list')} | UnitTCMS`,
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return null;
}
