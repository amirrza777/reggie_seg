import Image from "next/image";
import { marqueeSets, type LogoItem } from "../../content/marketing";

const LogoMarqueeSet = ({ logos, setIndex }: { logos: LogoItem[]; setIndex: number }) => (
  <div className="logo-marquee__set" aria-hidden={setIndex > 0}>
    {logos.map((logo, index) => {
      const isDuplicate = setIndex > 0;
      return (
        <Image
          key={`${logo.src}-${setIndex}-${index}`}
          className="logo-marquee__logo"
          src={logo.src}
          alt={isDuplicate ? "" : logo.alt}
          width={logo.width}
          height={logo.height}
          loading="lazy"
          aria-hidden={isDuplicate}
          sizes="(max-width: 768px) 200px, 320px"
        />
      );
    })}
  </div>
);

export const LogoMarquee = () => (
  <div className="logo-marquee" aria-label="Partner logos" data-reveal>
    <div className="logo-marquee__track">
      {marqueeSets.map((set, setIndex) => (
        <LogoMarqueeSet key={`marquee-set-${setIndex}`} logos={set} setIndex={setIndex} />
      ))}
    </div>
  </div>
);
