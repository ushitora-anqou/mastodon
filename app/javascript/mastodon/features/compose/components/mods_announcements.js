import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Immutable from 'immutable';
import { Link } from 'react-router-dom';
import axios from 'axios';
import classnames from 'classnames';

class ModAnnouncement extends React.PureComponent {

  static propTypes = {
    item: ImmutablePropTypes.map,
  }

  render() {
    const { item } = this.props;

    const contents = [];
    if (item.get('icon')) {
      contents.push(
        <div key='icon' className='mods__announcements__icon'>
          <img src={item.get('icon')} alt='' />
        </div>
      );
    }
    contents.push(<div key='body' className='mods__announcements__body'>{item.get('body')}</div>);

    const href = item.get('href');

    const classname = classnames({
      'mods__announcements__item': true,
      'mods__announcements__item--clickable': !!href,
    });

    if (!href) {
      return (<div className={classname}>{contents}</div>);
    } else if (href.startsWith('/web/')) {
      return (<Link to={item.get('href').slice(4)} className={classname}>{contents}</Link>);
    } else {
      return (<a href={item.get('href')} target='_blank' className={classname}>{contents}</a>);
    }
  }

}

export default class ModsAnnouncements extends React.PureComponent {

  state = {
    items: ModsAnnouncements.cache || Immutable.Map(),
  }

  static isCacheControlled = false
  static lastDate = null
  static cache = null

  constructor () {
    super();
    this.refresh();
  }

  componentWillUnmount() {
    this.cancelPolling();
  }

  setPolling = () => {
    this.timer = setTimeout(this.refresh, 2 * 60 * 1000);
  }

  cancelPolling = () => {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  deleteServiceWorkerCache = () => {
    // files in /system/ will be cached by SW
    if (self.caches) {
      return caches.open('mastodon-system')
        .then(cache => cache.delete(window.origin + '/announcements.json'))
        .catch(() => {});
    } else {
      return Promise.resolve();
    }
  }

  refresh = () => {
    this.timer = null;

    axios.get('/announcements.json', {
      headers: {
        'If-Modified-Since': !ModsAnnouncements.isCacheControlled && ModsAnnouncements.lastDate || '',
      },
    })
      .then(resp => {
        ModsAnnouncements.isCacheControlled = !!resp.headers['cache-control'];
        ModsAnnouncements.lastDate = resp.headers['last-modified'];
        return resp;
      })
      .then(resp => this.setState({ items: ModsAnnouncements.cache = Immutable.fromJS(resp.data) || {} }))
      .catch(err => err.response.status !== 304 && console.warn(err))
      .then(this.deleteServiceWorkerCache)
      .then(this.setPolling)
      .catch(err => err && console.warn(err));
  }

  render() {
    const { items } = this.state;

    return (
      <ul className='mods__announcements'>
        {items.entrySeq().map(([key, item]) =>
          (<li key={key}>
            <ModAnnouncement item={item} />
          </li>)
        )}
      </ul>
    );
  }

}
