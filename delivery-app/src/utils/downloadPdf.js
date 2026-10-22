// jsPDF's own `.save()` creates a Blob and simulates an <a download> click -- this silently
// fails on many mobile browsers (iOS Safari, in-app webviews, some Android Chrome configs),
// especially for the large data URI a high-resolution html2canvas capture produces. This
// re-does the same Blob+anchor technique explicitly (skipping jsPDF's internal FileSaver path)
// so it downloads directly and silently on both desktop and mobile, with no share-sheet prompt.
export function savePdfCrossPlatform(pdf, fileName) {
  const blob = pdf.output('blob');
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
