interface PublicSeoHeadProps {
  title: string;
  description: string;
  canonical: string;
  indexable?: boolean;
  ogType?: 'article' | 'profile' | 'website';
  image?: string | null;
  publishedTime?: string;
  modifiedTime?: string;
}

export default function PublicSeoHead({
  title,
  description,
  canonical,
  indexable = true,
  ogType = 'website',
  image,
  publishedTime,
  modifiedTime,
}: PublicSeoHeadProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={indexable ? 'index,follow' : 'noindex,follow'}
      />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="ZERO-ONE" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      {image ? <meta property="og:image" content={image} /> : null}
      {publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}
    </>
  );
}
