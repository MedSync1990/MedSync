import { useEffect } from 'react';

export const APP_NAME = 'MedSync';

export function formatPageTitle(pageTitle?: string | null): string {
  if (!pageTitle || !pageTitle.trim()) {
    return APP_NAME;
  }
  return `${pageTitle.trim()} | ${APP_NAME}`;
}

export function useDocumentTitle(title?: string | null, preserveOnUnmount = false) {
  useEffect(() => {
    if (!title || !title.trim()) return;

    const previousTitle = document.title;
    document.title = formatPageTitle(title);

    return () => {
      if (!preserveOnUnmount) {
        document.title = previousTitle;
      }
    };
  }, [title, preserveOnUnmount]);
}

export default useDocumentTitle;
