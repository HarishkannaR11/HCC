/** The standing promise, shown wherever charts can be reached. */
export function SyntheticDataNotice({ className }: { className?: string }) {
  return (
    <p className={`text-[12px] text-muted ${className ?? ""}`}>
      Every chart in Chartwise is synthetic — invented patients, providers and facilities. No real
      patient data is stored or shown. Risk adjustment coding practice on ICD-10-CM and CMS-HCC; not
      affiliated with AAPC or AHIMA.
    </p>
  );
}
