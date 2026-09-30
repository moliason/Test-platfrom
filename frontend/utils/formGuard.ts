import { useEffect } from 'react';

const isIgnoredPath = (href: string, compiledPatterns: RegExp[]): boolean => {
  return compiledPatterns.some((regex) => regex.test(href));
};

export const confirmFormNavigation = (href?: string): boolean =>
  window.dispatchEvent(new CustomEvent('unittcms:before-navigate', { cancelable: true, detail: { href } }));

export const useFormGuard = (isDirty: boolean, confirmText: string, ignorePathPatterns?: string[]) => {
  const patternsKey = JSON.stringify(ignorePathPatterns ?? []);
  useEffect(() => {
    const compiledPatterns: RegExp[] = (JSON.parse(patternsKey) as string[]).flatMap((pattern) => {
      try {
        return [new RegExp(pattern)];
      } catch {
        return [];
      }
    });

    const confirmLeave = (href?: string) => {
      if (!isDirty) return true;
      if (href) {
        if (href.startsWith('#')) return true;
        const destination = new URL(href, window.location.href);
        if (destination.origin === window.location.origin && isIgnoredPath(destination.pathname, compiledPatterns))
          return true;
      }
      return window.confirm(confirmText);
    };

    const handleClick = (event: MouseEvent) => {
      if (
        !isDirty ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      if (event.target instanceof Element) {
        const anchor = event.target.closest('a:not([download]):not([target="_blank"])');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href) return;

        if (!confirmLeave(href)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    const handleNavigation = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      if (!confirmLeave(href)) event.preventDefault();
    };

    // Intercept same-document browser Back/Forward before the router unmounts the editor.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const handleTraverse = (event: Event) => {
      const navigate = event as Event & { navigationType: string; destination: { url: string; sameDocument: boolean } };
      if (
        navigate.navigationType === 'traverse' &&
        navigate.destination.sameDocument &&
        navigate.cancelable &&
        !confirmLeave(navigate.destination.url)
      ) {
        navigate.preventDefault();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        return (event.returnValue = '');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('unittcms:before-navigate', handleNavigation);
    navigation?.addEventListener('navigate', handleTraverse);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('unittcms:before-navigate', handleNavigation);
      navigation?.removeEventListener('navigate', handleTraverse);
    };
  }, [confirmText, isDirty, patternsKey]);
};
