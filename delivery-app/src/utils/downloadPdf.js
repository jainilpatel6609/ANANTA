// The Blob+<a download> technique reliably triggers a silent save on desktop, but many mobile
// browsers (iOS Safari, in-app webviews, some Android Chrome configs) silently no-op it --
// no error, no file, nothing. There is no web API that guarantees a silent save-to-disk on
// mobile without any user interaction, so on mobile we instead open the PDF in a new tab: the
// browser's built-in viewer renders it with its own visible download/save icon, which is the
// one approach that reliably works across mobile browsers.
export function savePdfCrossPlatform(pdf, fileName) {
  const blob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return 'opened';
  }

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  return 'downloaded';
}
