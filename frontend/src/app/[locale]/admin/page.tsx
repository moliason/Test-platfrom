import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import AdminPage from './AdminPage';
import { LocaleCodeType } from '@/types/locale';
import { AdminMessages } from '@/types/user';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return {
    title: `${t('user_management')} | UnitTCMS`,
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  const t = useTranslations('Admin');
  const messages: AdminMessages = {
    userManagement: t('user_management'),
    createUser: t('create_user'),
    avatar: t('avatar'),
    id: t('id'),
    email: t('email'),
    username: t('username'),
    role: t('role'),
    administrator: t('administrator'),
    user: t('user'),
    noUsersFound: t('no_users_found'),
    quitAdmin: t('quit_admin'),
    quit: t('quit'),
    quitConfirm: t('quit_confirm'),
    close: t('close'),
    roleChanged: t('role_changed'),
    lostAdminAuth: t('lost_admin_auth'),
    atLeast: t('at_least'),
    resetPassword: t('reset_password'),
    reset: t('reset'),
    invalidPassword: t('invalid_password'),
    passwordNotMatch: t('password_not_match'),
    initialPassword: t('initial_password'),
    confirmPassword: t('confirm_password'),
    create: t('create'),
    invalidEmail: t('invalid_email'),
    usernameRequired: t('username_required'),
    accountCreated: t('account_created'),
    emailAlreadyExists: t('email_already_exists'),
    createUserFailed: t('create_user_failed'),
  };

  return (
    <div className="w-full flex items-center justify-center">
      <AdminPage messages={messages} />
    </div>
  );
}
