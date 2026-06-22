import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { useLayout } from '@/mastodon/hooks/useLayout';
import { useVisibility } from '@/mastodon/hooks/useVisibility';
import {
  autoPlayGif,
  me,
  domain as localDomain,
} from '@/mastodon/initial_state';
import type { Account } from '@/mastodon/models/account';
import { getAccountHidden } from '@/mastodon/selectors/accounts';
import { useAppSelector } from '@/mastodon/store';

import { AccountBio } from '../account_bio';
import { Avatar } from '../avatar';
import { AnimateEmojiProvider } from '../emoji/context';
import { FamiliarFollowers } from '../familiar_followers';

import { AccountBanners } from './banners';
import { AccountButtons } from './buttons';
import { AccountHeaderFields } from './fields';
import { AccountName } from './name';
import { AccountNote } from './note';
import { AccountNumberFields } from './number_fields';
import classes from './styles.module.scss';
import { AccountSubscriptionForm } from './subscription_form';
import { AccountTabs } from './tabs';

const titleFromAccount = (account: Account) => {
  const displayName = account.display_name;
  const acct =
    account.acct === account.username
      ? `${account.username}@${localDomain}`
      : account.acct;
  const prefix =
    displayName.trim().length === 0 ? account.username : displayName;

  return `${prefix} (@${acct})`;
};

export const AccountHeader: React.FC<{
  accountId: string;
  hideTabs?: boolean;
}> = ({ accountId, hideTabs }) => {
  const account = useAppSelector((state) => state.accounts.get(accountId));
  const hidden = useAppSelector((state) => getAccountHidden(state, accountId));

  const { layout } = useLayout();
  const { observedRef, isIntersecting } = useVisibility({
    observerOptions: {
      rootMargin: layout === 'mobile' ? '0px 0px -55px 0px' : '', // Height of bottom nav bar.
    },
  });

  if (!account) {
    return null;
  }

  const suspendedOrHidden = hidden || account.suspended;
  const isLocal = !account.acct.includes('@');
  const isMe = me && account.id === me;

  return (
    <div>
      <AccountBanners account={account} />

      <AnimateEmojiProvider
        className={classNames(!!account.moved && classes.moved)}
      >
        <div className={classes.header}>
          {!suspendedOrHidden && (
            <img
              src={autoPlayGif ? account.header : account.header_static}
              alt={account.header_description}
              className='parallax'
            />
          )}
        </div>

        <div className={classes.barWrapper}>
          <div className={classes.avatarWrapper}>
            {isLocal ? (
              <Link to={`/@${account.acct}`}>
                <Avatar
                  className={classes.avatar}
                  account={suspendedOrHidden ? undefined : account}
                  alt={account.avatar_description}
                  size={80}
                />
              </Link>
            ) : (
              <a href={account.url} rel='noopener'>
                <Avatar
                  className={classes.avatar}
                  account={suspendedOrHidden ? undefined : account}
                  alt={account.avatar_description}
                  size={80}
                />
              </a>
            )}
          </div>

          <div className={classes.displayNameWrapper}>
            <AccountName accountId={accountId} />
            <AccountButtons
              accountId={accountId}
              className={classes.buttonsDesktop}
              noShare={!isMe || 'share' in navigator}
              forceMenu={'share' in navigator}
            />
          </div>

          <AccountNumberFields accountId={accountId} />

          {!isMe && !suspendedOrHidden && (
            <FamiliarFollowers
              accountId={accountId}
              className={classes.familiarFollowers}
            />
          )}

          {!suspendedOrHidden && (
            <div className={classes.bioButtonsWrapper}>
              {me && account.id !== me && <AccountNote accountId={accountId} />}

              <AccountBio showDropdown accountId={accountId} />

              <AccountHeaderFields accountId={accountId} />

              {!me && account.email_subscriptions && (
                <AccountSubscriptionForm accountId={accountId} />
              )}
            </div>
          )}

          <AccountButtons
            className={classNames(
              classes.buttonsMobile,
              !isIntersecting && classes.buttonsMobileIsStuck,
            )}
            accountId={accountId}
            noShare
          />
        </div>
      </AnimateEmojiProvider>

      {!hideTabs && !hidden && <AccountTabs />}
      <div ref={observedRef} />

      <Helmet>
        <title>{titleFromAccount(account)}</title>
        <meta
          name='robots'
          content={isLocal && !account.noindex ? 'all' : 'noindex'}
        />
        <link rel='canonical' href={account.url} />
      </Helmet>
    </div>
  );
};
