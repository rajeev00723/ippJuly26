import React, { useEffect } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';

const TARGET = 'http://localhost:3000/';

export const TryOutPage = () => {
  useEffect(() => {
    window.open(TARGET, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <AppleShell title="Try It Out">
      <div style={{ padding: '48px 40px', fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
          Opening <strong style={{ color: '#F0F0F0' }}>{TARGET}</strong> in a new tab…
        </p>
        <p style={{ color: '#999', fontSize: 13 }}>
          If the tab did not open,{' '}
          <a href={TARGET} target="_blank" rel="noopener noreferrer" style={{ color: '#D40511' }}>
            click here
          </a>
          .
        </p>
      </div>
    </AppleShell>
  );
};
