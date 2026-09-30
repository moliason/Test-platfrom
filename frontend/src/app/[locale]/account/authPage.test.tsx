/* @vitest-environment happy-dom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import AuthPage from './authPage';
import { AuthMessages } from '@/types/user';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@heroui/react', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children);

  return {
    Button: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement('button', null, children),
    Input: ({
      label,
      type,
      autoComplete,
      onChange,
    }: {
      label?: string;
      type?: string;
      autoComplete?: string;
      onChange?: React.ChangeEventHandler<HTMLInputElement>;
    }) => ReactModule.createElement('input', { type, autoComplete, onChange, 'aria-label': label }),
    Card: passthrough,
    CardHeader: passthrough,
    CardBody: passthrough,
  };
});

vi.mock('./authControl', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInAsGuest: vi.fn(),
}));
vi.mock('@/src/i18n/routing', () => ({
  Link: 'a',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/utils/TokenProvider', async () => {
  const ReactModule = await import('react');
  return {
    TokenContext: ReactModule.createContext({
      setToken: vi.fn(),
      storeTokenToLocalStorage: vi.fn(),
    }),
  };
});
vi.mock('@/config/config', () => ({ default: { isDemoSite: false, apiServer: '' } }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/icons', () => ({ OpenIdIcon: () => null }));
vi.mock('lucide-react', () => ({
  ChevronRight: () => null,
  Eye: () => null,
  EyeOff: () => null,
}));

const messages: AuthMessages = {
  title: 'Sign in',
  linkTitle: 'Sign up',
  submitTitle: 'Sign in',
  signInAsGuest: 'Guest',
  signInWithSso: 'SSO',
  or: 'or',
  email: 'Email',
  username: 'Username',
  password: 'Password',
  confirmPassword: 'Confirm password',
  invalidEmail: 'Invalid email',
  invalidPassword: 'Invalid password',
  usernameEmpty: 'Username required',
  passwordDoesNotMatch: 'Passwords do not match',
  EmailAlreadyExist: 'Email already exists',
  emailNotExist: 'Email not found',
  signupError: 'Sign up failed',
  signinError: 'Sign in failed',
  demoPageWarning: 'Demo',
};

describe('AuthPage sign-in identifier', () => {
  it('accepts email only', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<AuthPage isSignup={false} messages={messages} locale="en" ssoEnabled={false} />);
    });

    const identifierInput = container.querySelector('input') as HTMLInputElement;
    expect(identifierInput.type).toBe('email');
    expect(identifierInput.getAttribute('aria-label')).toBe('Email');
    expect(identifierInput.autocomplete).toBe('email');

    await act(async () => root.unmount());
  });
});
