import { pdfExportService } from '../services';

// Desktop: the Blob+<a download> technique reliably triggers a silent save.
//
// Mobile inside a WebView-wrapped app (e.g. the Appilix-built APK): a JS blob/data URI never
// reaches the native download handler at all -- Appilix's own docs confirm its native download
// dialog only fires when the user "taps a download link" (a real HTTP(S) URL). So on mobile the
// generated PDF is relayed through a short-lived, single-use backend endpoint
// (pdfExportService) to get a real URL, then navigated to directly.
export async function savePdfCrossPlatform(pdf, fileName) {
  const blob = pdf.output('blob');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    try {
      const res = await pdfExportService.uploadForDownload(blob, fileName);
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
        return 'opened';
      }
    } catch (err) {
      // Fall through to the local blob-link attempt below as a last resort.
    }
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return 'opened';
  }

  const blobUrl = URL.createObjectURL(blob);
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
