import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Divider } from '@heroui/react';
import PaneMainTitle from './PaneMainTitle';
import PaneMainFeatures from './PaneMainFeatures';
import { title, subtitle } from '@/components/primitives';
import { PageType } from '@/types/base';
import { LocaleCodeType } from '@/types/locale';
import Footer from '@/components/Footer';

export default function LandingPage({ params }: PageType) {
  const t = useTranslations('Index');

  const features = [
    {
      uid: 'project',
      title: t('project_title'),
      subTitle: t('project_subtitle'),
    },
    {
      uid: 'case',
      title: t('case_management_title'),
      subTitle: t('case_management_subtitle'),
    },
    {
      uid: 'run',
      title: t('run_management_title'),
      subTitle: t('run_management_subtitle'),
    },
    {
      uid: 'member',
      title: t('member_management_title'),
      subTitle: t('member_management_subtitle'),
    },
  ];

  return (
    <section className="mx-auto max-w-screen-xl my-12">
      <div className="flex flex-wrap">
        <div className="w-full md:w-7/12 order-last md:order-first p-4">
          <PaneMainTitle locale={params.locale as LocaleCodeType} />
        </div>

        <div className="w-full md:w-5/12 p-4">
          <Image src="/favicon/test-platfrom.svg" width={192} height={192} alt="Test-platfrom" className="mx-auto" />
        </div>
      </div>

      <div
        className="flex flex-wrap flex-col items-center"
        style={{
          marginTop: '6rem',
        }}
      >
        <PaneMainFeatures />
      </div>

      <Divider className="my-12" />
      <div className="flex flex-wrap lg:text-left text-center">
        {features.map((feature) => (
          <div key={feature.uid} className="w-full md:w-1/2">
            <div className="p-4">
              <h2 className={title({ size: 'sm', class: 'tracking-normal' })}>{feature.title}</h2>
              <h4 className={subtitle({ class: 'mt-4' })}>{feature.subTitle}</h4>
            </div>
          </div>
        ))}
      </div>

      <Divider className="my-12" />
      <Footer locale={params.locale as LocaleCodeType} />
    </section>
  );
}
