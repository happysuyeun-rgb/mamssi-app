export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function webShare(opts: ShareData): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(opts);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string) {
  try {
    // @ts-expect-error older types
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}

export async function webShare(data: ShareData) {
  // @ts-expect-error older types
  if (navigator.share) {
    try {
      // @ts-expect-error older types
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}


