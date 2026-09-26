// Rank Me Local map-pin mark (from rank-me-local/src/app/icon.svg). The pin
// takes the current text colour; the "1" is punched out in the primary colour.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="8 2 48 58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 3.5C20.13 3.5 10.5 13.13 10.5 25c0 8.02 6.26 17.13 11.51 23.5 3.4 4.13 6.79 7.5 8.19 8.85a2.6 2.6 0 0 0 3.6 0c1.4-1.35 4.79-4.72 8.19-8.85C47.24 42.13 53.5 33.02 53.5 25 53.5 13.13 43.87 3.5 32 3.5Z"
      />
      <path fill="var(--primary)" d="M36.8 14.4v20.9h-6.2V21.9l-3.6 2.2v-5.3l5.6-4.4h4.2Z" />
    </svg>
  );
}
