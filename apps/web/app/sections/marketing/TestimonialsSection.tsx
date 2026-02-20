import { testimonials, type TestimonialItem } from "../../content/marketing";

const TestimonialCard = ({ item }: { item: TestimonialItem }) => (
  <article className="testimonial-card">
    <span className="testimonial-card__quote-mark" aria-hidden="true">
      &ldquo;
    </span>
    <p className="testimonial-card__quote">{item.quote}</p>
    <div className="testimonial-card__rating" aria-label={`${item.rating} out of 5 stars`}>
      {Array.from({ length: item.rating }).map((_, index) => (
        <span key={index} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
    <p className="testimonial-card__attribution">{item.attribution}</p>
  </article>
);

export const TestimonialsSection = () => (
  <section className="testimonials" id="testimonials">
    <div className="testimonials__inner" data-reveal-group>
      <div className="testimonials__intro" data-reveal>
        <h2>The feedback system teams actually complete</h2>
        <p className="lede">Clear deadlines, fewer arguments, better accountability.</p>
      </div>
      <div className="testimonials__cards" data-reveal>
        {testimonials.map((item) => (
          <TestimonialCard key={item.quote} item={item} />
        ))}
      </div>
    </div>
  </section>
);
