import { PageType } from '@/types/base';
import { LocaleCodeType } from '@/types/locale';
import { redirect } from '@/src/i18n/routing';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  return {
    title: 'Sign up disabled | UnitTCMS',
    robots: { index: false, follow: false },
  };
}

export default function Page({ params }: PageType) {
  redirect({ href: '/account/signin', locale: params.locale as LocaleCodeType });
}
