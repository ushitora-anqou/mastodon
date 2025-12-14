import type { ComponentPropsWithoutRef, FC } from 'react';

import type { LinkProps } from 'react-router-dom';
import { Link } from 'react-router-dom';

import type { Account } from '@/mastodon/models/account';

import { DisplayNameDefault } from './default';
import { DisplayNameWithoutDomain } from './no-domain';
import { DisplayNameSimple } from './simple';

export interface DisplayNameProps {
  account?: Account;
  localDomain?: string;
  variant?: 'default' | 'simple' | 'noDomain';
}

export const DisplayName: FC<
  DisplayNameProps & ComponentPropsWithoutRef<'span'>
> = ({ variant = 'default', ...props }) => {
  if (variant === 'simple') {
    return <DisplayNameSimple {...props} />;
  } else if (variant === 'noDomain') {
    return <DisplayNameWithoutDomain {...props} />;
  }
  return <DisplayNameDefault {...props} />;
};

export const LinkedDisplayName: FC<
  Omit<LinkProps, 'to'> & {
    displayProps: DisplayNameProps & ComponentPropsWithoutRef<'span'>;
  }
> = ({ displayProps, children, ...linkProps }) => {
  const { account } = displayProps;
  if (!account) {
    return <DisplayName {...displayProps} />;
  }

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      const isRemote = account.acct !== account.username;
      if (isRemote && account.url) {
        // For remote users, open the original page
        window.open(account.url, '_blank', 'noopener');
      } else {
        // For local users, open the local account page
        window.open(`/@${account.acct}`, '_blank', 'noopener');
      }
    }
  };

  return (
    <Link
      to={`/@${account.acct}`}
      title={`@${account.acct}`}
      data-id={account.id}
      data-hover-card-account={account.id}
      onAuxClick={handleAuxClick}
      {...linkProps}
    >
      {children}
      <DisplayName {...displayProps} />
    </Link>
  );
};
