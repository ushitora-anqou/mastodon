import { useCallback } from 'react';
import { useHovering } from 'mastodon/hooks/useHovering';
import { autoPlayGif } from 'mastodon/initial_state';
import type { Account } from 'mastodon/models/account';

interface Props {
  account: Account | undefined; // FIXME: remove `undefined` once we know for sure its always there
  friend: Account | undefined; // FIXME: remove `undefined` once we know for sure its always there
  size?: number;
  baseSize?: number;
  overlaySize?: number;
}

export const AvatarOverlay: React.FC<Props> = ({
  account,
  friend,
  size = 46,
  baseSize = 36,
  overlaySize = 24,
}) => {
  const { hovering, handleMouseEnter, handleMouseLeave } =
    useHovering(autoPlayGif);
  const accountSrc = hovering
    ? account?.get('avatar')
    : account?.get('avatar_static');
  const friendSrc = hovering
    ? friend?.get('avatar')
    : friend?.get('avatar_static');

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if ((e.button === 1 || (e.button === 0 && e.ctrlKey)) && account) {
      e.preventDefault();
      e.stopPropagation();
      const isRemote = account.get('acct') !== account.get('username');
      if (isRemote && account.get('url')) {
        // For remote users, open the original page
        window.open(account.get('url'), '_blank', 'noopener');
      } else {
        // For local users, open the local account page
        window.open(`/@${account.get('acct')}`, '_blank', 'noopener');
      }
    }
  }, [account]);

  return (
    <div
      className='account__avatar-overlay'
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onAuxClick={handleAuxClick}
    >
      <div className='account__avatar-overlay-base'>
        <div
          className='account__avatar'
          style={{ width: `${baseSize}px`, height: `${baseSize}px` }}
        >
          {accountSrc && <img src={accountSrc} alt={account?.get('acct')} />}
        </div>
      </div>
      <div className='account__avatar-overlay-overlay'>
        <div
          className='account__avatar'
          style={{ width: `${overlaySize}px`, height: `${overlaySize}px` }}
        >
          {friendSrc && <img src={friendSrc} alt={friend?.get('acct')} />}
        </div>
      </div>
    </div>
  );
};
