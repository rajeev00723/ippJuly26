import React, { PropsWithChildren } from 'react';

/**
 * Root is a transparent pass-through. The Apple sidebar and shell chrome
 * are rendered by AppleShell inside each persona/tool page.
 * Backstage's AppRouter still needs a Root wrapper for plugin route binding.
 */
export const Root = ({ children }: PropsWithChildren<{}>) => (
  <>{children}</>
);
