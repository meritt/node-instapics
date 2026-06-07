function imageOf(raw) {
  return raw.media_type === 'VIDEO'
    ? (raw.thumbnail_url ?? null)
    : (raw.media_url ?? null);
}

function childOf(child) {
  return {
    type: child.media_type === 'VIDEO' ? 'video' : 'photo',
    url: child.media_url ?? child.thumbnail_url ?? null
  };
}

export function normalizeMedia(raw) {
  const caption = raw.caption ?? null;
  const permalink = raw.permalink ?? null;
  const timestamp = raw.timestamp ?? null;

  if (raw.media_type === 'VIDEO') {
    return {
      id: raw.id,
      type: raw.media_product_type === 'REELS' ? 'reel' : 'video',
      url: raw.media_url ?? null,
      thumbnail: raw.thumbnail_url ?? null,
      caption,
      permalink,
      timestamp
    };
  }

  if (raw.media_type === 'CAROUSEL_ALBUM') {
    const children = raw.children?.data ?? [];
    const [first, ...rest] = children;

    return {
      id: raw.id,
      type: 'album',
      url: first?.media_url ?? raw.media_url ?? null,
      thumbnail: first ? imageOf(first) : (raw.media_url ?? null),
      items: rest.map(childOf),
      caption,
      permalink,
      timestamp
    };
  }

  return {
    id: raw.id,
    type: 'photo',
    url: raw.media_url ?? null,
    thumbnail: raw.media_url ?? null,
    caption,
    permalink,
    timestamp
  };
}

export function normalizeProfile(raw) {
  return {
    id: raw.id ?? raw.user_id ?? null,
    username: raw.username ?? null,
    account: raw.account_type ?? null,
    posts: raw.media_count ?? null
  };
}
