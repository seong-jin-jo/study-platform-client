'use client';

import { createContext, use, useEffect, useMemo, useState } from 'react';
import {
  getPublicDocumentAuthBootstrap,
  PUBLIC_AUTH_BOOTSTRAP_STATES,
  type PublicAuthBootstrapState,
} from './public-auth-bootstrap-state';

const PublicAuthBootstrapContext = createContext<PublicAuthBootstrapState>(
  PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED,
);

export function PublicAuthBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PublicAuthBootstrapState>(
    PUBLIC_AUTH_BOOTSTRAP_STATES.PENDING,
  );

  useEffect(() => {
    let active = true;
    getPublicDocumentAuthBootstrap().then(
      (result) => {
        if (active) setState(result);
      },
      () => {
        if (active) setState(PUBLIC_AUTH_BOOTSTRAP_STATES.DEGRADED);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return (
    <PublicAuthBootstrapContext.Provider value={value}>
      {children}
    </PublicAuthBootstrapContext.Provider>
  );
}

export const usePublicAuthBootstrapState = () =>
  use(PublicAuthBootstrapContext);
