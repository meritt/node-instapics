function httpsUrl(value) {
  return typeof value === 'string' && URL.parse(value)?.protocol === 'https:'
    ? value
    : null;
}

export function typeOf(raw) {
  switch (raw.media_type) {
    case 'IMAGE':
      return 'photo';
    case 'CAROUSEL_ALBUM':
      return 'album';
    case 'VIDEO':
      return raw.media_product_type === 'REELS' ? 'reel' : 'video';
    default:
      return undefined;
  }
}

function imageOf(raw) {
  return httpsUrl(
    raw.media_type === 'VIDEO' ? raw.thumbnail_url : raw.media_url
  );
}

function childOf(child) {
  return {
    type: child.media_type === 'VIDEO' ? 'video' : 'photo',
    url: httpsUrl(child.media_url) ?? httpsUrl(child.thumbnail_url)
  };
}

function albumOf(raw) {
  const children = Array.isArray(raw.children?.data)
    ? raw.children.data.filter(
        (child) => child !== null && typeof child === 'object'
      )
    : [];
  const [first, ...rest] = children;

  return {
    url: httpsUrl(first?.media_url) ?? httpsUrl(raw.media_url),
    thumbnail: first ? imageOf(first) : httpsUrl(raw.media_url),
    items: rest.map(childOf)
  };
}

function sourcesOf(type, raw) {
  if (type === 'album') {
    return albumOf(raw);
  }

  if (type === 'video' || type === 'reel') {
    return {
      url: httpsUrl(raw.media_url),
      thumbnail: httpsUrl(raw.thumbnail_url)
    };
  }

  const url = httpsUrl(raw.media_url);
  return { url, thumbnail: url };
}

export function normalizeMedia(raw) {
  const type = typeOf(raw) ?? 'photo';

  return {
    id: raw.id,
    type,
    ...sourcesOf(type, raw),
    caption: raw.caption ?? null,
    permalink: httpsUrl(raw.permalink),
    timestamp: raw.timestamp ?? null
  };
}

export function normalizeProfile(raw) {
  return {
    id: raw.id ?? null,
    username: raw.username ?? null,
    account: raw.account_type ?? null,
    posts: raw.media_count ?? null
  };
}
