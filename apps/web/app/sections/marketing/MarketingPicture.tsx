type MarketingPictureProps = {
  index: number;
  alt: string;
  imageClassName: string;
  pictureClassName: string;
  loading?: "eager" | "lazy";
};

export const MarketingPicture = ({ index, alt, imageClassName, pictureClassName, loading = "lazy" }: MarketingPictureProps) => (
  <picture className={pictureClassName}>
    <source srcSet={`/marketing/marketing-image-${index}-dark.webp`} media="(prefers-color-scheme: dark)" type="image/webp" />
    <img
      src={`/marketing/marketing-image-${index}-light.webp`}
      alt={alt}
      className={imageClassName}
      loading={loading}
      decoding="async"
      width={1600}
      height={1200}
    />
  </picture>
);
