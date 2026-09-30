/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSettingsPage from './ProfileSettingsPage';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  updateLocale: vi.fn(),
  contextValue: {
    token: {
      access_token: 'token',
      expires_at: Date.now() + 60_000,
      user: {
        id: 1,
        email: 'admin@example.com',
        password: '',
        username: 'admin',
        role: 0,
        avatarPath: null,
        locale: 'zh-CN',
      },
    },
    isSignedIn: () => true,
    setToken: vi.fn(),
    storeTokenToLocalStorage: vi.fn(),
    removeTokenFromLocalStorage: vi.fn(),
  },
}));

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) => ReactModule.createElement('div', null, children);
  return {
    Button: ({
      children,
      onPress,
      isDisabled,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
    }) => ReactModule.createElement('button', { disabled: isDisabled, onClick: onPress }, children),
    Input: () => ReactModule.createElement('input'),
    Card: passthrough,
    CardHeader: passthrough,
    CardBody: passthrough,
    CardFooter: passthrough,
    Select: ({
      selectedKeys,
      onSelectionChange,
    }: {
      selectedKeys: Iterable<string>;
      onSelectionChange: (selection: Set<string>) => void;
    }) =>
      ReactModule.createElement(
        'select',
        {
          'data-testid': 'locale-select',
          value: Array.from(selectedKeys)[0] || '',
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onSelectionChange(new Set([event.target.value])),
        },
        ['de', 'en', 'pt-BR', 'zh-CN', 'ja'].map((code) =>
          ReactModule.createElement('option', { key: code, value: code }, code)
        )
      ),
    SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) =>
      ReactModule.createElement('option', { value }, children),
    addToast: vi.fn(),
  };
});

vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return { TokenContext: ReactModule.createContext(mocks.contextValue) };
});

vi.mock('@/src/i18n/routing', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/account/settings',
}));

vi.mock('@/utils/usersControl', () => ({
  updateUsername: vi.fn(),
  updatePassword: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  updateLocale: mocks.updateLocale,
}));

vi.mock('@/utils/errorHandler', () => ({ logError: vi.fn() }));
vi.mock('@/components/UserAvatar', async () => {
  const ReactModule = await import('react');
  return { default: () => ReactModule.createElement('div') };
});
vi.mock('lucide-react', async () => {
  const ReactModule = await import('react');
  return { Globe: () => ReactModule.createElement('span') };
});

const messages = {
  profileSettings: 'Profile Settings',
  changeUsername: 'Change Username',
  newUsername: 'New Username',
  updateUsername: 'Update Username',
  usernameUpdated: 'Username updated',
  changePassword: 'Change Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  updatePassword: 'Update Password',
  passwordUpdated: 'Password updated',
  changeLocale: 'Change Language',
  updateLocale: 'Update Language',
  localeUpdated: 'Language updated',
  changeAvatar: 'Change Avatar',
  uploadAvatar: 'Upload Avatar',
  removeAvatar: 'Remove Avatar',
  avatarUpdated: 'Avatar updated',
  avatarRemoved: 'Avatar removed',
  maxFileSize5mb: '5MB',
  onlyImagesAllowed: 'Images only',
  currentPasswordIncorrect: 'Incorrect password',
  updateError: 'Update failed',
  invalidPassword: 'Invalid password',
  passwordNotMatch: 'Passwords do not match',
  usernameEmpty: 'Username required',
  invalidLocale: 'Invalid language',
};

describe('ProfileSettingsPage language selector', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.updateLocale.mockReset();
    mocks.contextValue.token.user.locale = 'zh-CN';
    mocks.contextValue.setToken.mockReset();
    mocks.contextValue.storeTokenToLocalStorage.mockReset();
  });

  it('starts with the language in the current route', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage messages={messages} locale="en" />);
    });

    expect((container.querySelector('[data-testid="locale-select"]') as HTMLSelectElement).value).toBe('en');
    await act(async () => root.unmount());
  });

  it('keeps the update button enabled when the selected language is already saved', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage messages={messages} locale="zh-CN" />);
    });

    const updateButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === messages.updateLocale
    );
    expect(updateButton?.disabled).toBe(false);
    await act(async () => root.unmount());
  });

  it('updates when the select reports a Set of selected keys', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage messages={messages} locale="en" />);
    });

    const select = container.querySelector('[data-testid="locale-select"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(select.value).toBe('en');
    await act(async () => root.unmount());
  });

  it('saves the selection and navigates to the selected language', async () => {
    mocks.updateLocale.mockResolvedValue({
      user: { ...mocks.contextValue.token.user, locale: 'ja' },
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage messages={messages} locale="en" />);
    });

    const select = container.querySelector('[data-testid="locale-select"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'ja';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const updateButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === messages.updateLocale
    );
    await act(async () => updateButton?.click());

    expect(mocks.updateLocale).toHaveBeenCalledWith('token', 'ja');
    expect(mocks.push).toHaveBeenCalledWith('/account/settings', { locale: 'ja' });
    await act(async () => root.unmount());
  });
});
