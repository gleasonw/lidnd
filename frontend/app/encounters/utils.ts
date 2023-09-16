export function getGoogleDriveImageLink(url: string): string {
  const regex = /file\/d\/(.*?)\/view/;
  const match = url.match(regex);
  if (match && match[1]) {
    const id = match[1];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  return "";
}
