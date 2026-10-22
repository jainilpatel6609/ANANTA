// jsPDF's own `.save()` creates a Blob and simulates an <a download> click -- this silently
// fails on many mobile browsers (iOS Safari, in-app webviews, some Android Chrome configs),
// especially for large data URIs from a high-resolution html2canvas capture. Prefer handing the
// file to the OS share sheet when available, which sidesteps all of that entirely.
export async function savePdfCrossPlatform(pdf, fileName) {
  const blob = pdf.output('blob');

  if (navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return 'shared';
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // Fall through to the blob-link fallback below.
    }
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  return 'downloaded';
}
