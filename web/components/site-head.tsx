// Fonts and the site's original stylesheets, linked exactly as the static pages did.
export function SiteHead({ fonts, stylesheets }: { fonts: string; stylesheets: string[] }) {
  return (
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={fonts} rel="stylesheet" />
      {stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </head>
  );
}
