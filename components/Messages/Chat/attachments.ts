export type ChatAttachment = {
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'video' | 'file';
};

export const mimeFromName = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase();

  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'txt') return 'text/plain';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'ogg') return 'audio/ogg';
  if (extension === 'flac') return 'audio/flac';

  return 'application/octet-stream';
};

export const getAttachmentKind = (
  mimeType: string,
  name: string,
): ChatAttachment['kind'] | null => {
  const mime = mimeType.toLowerCase();
  const fallbackMime = mimeFromName(name);
  const effectiveMime = mime === 'application/octet-stream' ? fallbackMime : mime;

  if (
    effectiveMime === 'image/jpeg' ||
    effectiveMime === 'image/png' ||
    effectiveMime === 'image/webp' ||
    effectiveMime === 'image/gif'
  ) {
    return 'image';
  }

  if (effectiveMime.startsWith('video/')) return 'video';
  if (
    effectiveMime === 'application/pdf' ||
    effectiveMime === 'text/plain' ||
    effectiveMime.startsWith('audio/')
  ) {
    return 'file';
  }

  return null;
};

export const MAX_ATTACHMENTS = 10;
