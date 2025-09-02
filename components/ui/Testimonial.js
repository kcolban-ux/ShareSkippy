import React from "react";
import Image from "next/image";

const Testimonial = ({
  variant = "default",
  rating = 5,
  text,
  author = {},
  highlight,
  className = "",
  priority = false,
  featured = false,
  social = null,
  link = null,
  videoSrc = null
}) => {
  const { name, role, avatar, followers, username } = author;

  const renderStars = (count) => {
    return [...Array(count)].map((_, i) => (
      <svg
        key={i}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-warning"
      >
        <path
          fillRule="evenodd"
          d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
          clipRule="evenodd"
        />
      </svg>
    ));
  };

  const renderSocialIcon = (type) => {
    const icons = {
      twitter: (
        <svg className="w-5 h-5 fill-[#00aCee]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.611-.1-.923a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z"></path>
        </svg>
      ),
      productHunt: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26.245 26.256" className="w-[18px] h-[18px]">
          <path d="M26.254 13.128c0 7.253-5.875 13.128-13.128 13.128S-.003 20.382-.003 13.128 5.872 0 13.125 0s13.128 5.875 13.128 13.128" fill="#da552f"/>
          <path d="M14.876 13.128h-3.72V9.2h3.72c1.083 0 1.97.886 1.97 1.97s-.886 1.97-1.97 1.97m0-6.564H8.53v13.128h2.626v-3.938h3.72c2.538 0 4.595-2.057 4.595-4.595s-2.057-4.595-4.595-4.595" fill="#fff"/>
        </svg>
      )
    };
    return icons[type] || null;
  };

  const variants = {
    default: (
      <div className={`bg-base-100 p-6 rounded-lg shadow-sm ${className}`}>
        <div className="rating mb-4">
          {renderStars(rating)}
        </div>
        <blockquote className="text-base leading-relaxed mb-4">
          {highlight && (
            <span className="bg-warning/25 px-1.5">
              {highlight}
            </span>
          )}{" "}
          {text}
        </blockquote>
        {author.name && (
          <div className="flex items-center gap-3">
            {avatar && (
              <Image
                className="w-10 h-10 rounded-full object-cover"
                src={avatar}
                alt={name}
                priority={priority}
                width={40}
                height={40}
              />
            )}
            <div>
              <p className="font-semibold">{name}</p>
              {role && <p className="text-base-content/80 text-sm">{role}</p>}
              {followers && <p className="text-base-content/80 text-sm">{followers}</p>}
            </div>
          </div>
        )}
      </div>
    ),
    small: (
      <div className={`space-y-6 max-w-lg mx-auto px-8 py-16 md:py-32 ${className}`}>
        <div className="rating !flex justify-center">
          {renderStars(rating)}
        </div>
        <div className="text-base leading-relaxed space-y-2 max-w-md mx-auto text-center">
          {text}
        </div>
        {author.name && (
          <div className="flex justify-center items-center gap-3 md:gap-4">
            {avatar && (
              <Image
                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                src={avatar}
                alt={name}
                priority={priority}
                width={48}
                height={48}
              />
            )}
            <div>
              <p className="font-semibold">{name}</p>
              {role && <p className="text-base-content/80 text-sm">{role}</p>}
            </div>
          </div>
        )}
      </div>
    ),
    avatars: (
      <div className={`flex flex-col md:flex-row justify-center items-center md:items-start gap-3 ${className}`}>
        <div className="-space-x-5 avatar-group justify-start">
          {Array.isArray(author.avatars) && author.avatars.map((avatar, i) => (
            <div className="avatar w-12 h-12" key={i}>
              <Image
                src={avatar.src}
                alt={avatar.alt}
                priority={priority}
                width={50}
                height={50}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center items-center md:items-start gap-1">
          <div className="rating">
            {renderStars(rating)}
          </div>
          {text && (
            <div className="text-base text-base-content/80">
              {text}
            </div>
          )}
        </div>
      </div>
    ),
    card: (
      <figure className={`relative max-w-lg h-full p-6 md:p-10 bg-base-200 rounded-2xl max-md:text-sm flex flex-col ${className}`}>
        <blockquote className="relative flex-1">
          <p className="text-base-content/80 leading-relaxed">
            {text}
          </p>
        </blockquote>
        <figcaption className="relative flex items-center justify-start gap-4 pt-4 mt-4 md:gap-8 md:pt-8 md:mt-8 border-t border-base-content/5">
          <div className="w-full flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-base-content md:mb-0.5">
                {name}
              </div>
              {username && (
                <div className="mt-0.5 text-sm text-base-content/80">
                  @{username}
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-full bg-base-300 shrink-0">
              {avatar ? (
                <Image
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                  src={avatar}
                  alt={`${name}'s testimonial`}
                  width={48}
                  height={48}
                />
              ) : (
                <span className="w-10 h-10 md:w-12 md:h-12 rounded-full flex justify-center items-center text-lg font-medium bg-base-300">
                  {name?.charAt(0)}
                </span>
              )}
            </div>
          </div>
        </figcaption>
      </figure>
    ),
    featured: (
      <div className={`relative max-w-lg h-full p-6 md:p-10 bg-base-200 rounded-2xl max-md:text-sm flex flex-col ${featured ? 'lg:col-span-2 lg:text-lg' : ''} ${className}`}>
        <blockquote className="relative flex-1">
          <p className="text-base-content/80 leading-relaxed">
            {text}
          </p>
        </blockquote>
        <figcaption className="relative flex items-center justify-start gap-4 pt-4 mt-4 md:gap-8 md:pt-8 md:mt-8 border-t border-base-content/5">
          <div className="w-full flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-base-content md:mb-0.5">
                {name}
              </div>
              {username && (
                <div className="mt-0.5 text-sm text-base-content/80">
                  @{username}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {social && renderSocialIcon(social)}
              <div className="overflow-hidden rounded-full bg-base-300 shrink-0">
                {avatar ? (
                  <Image
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                    src={avatar}
                    alt={`${name}'s testimonial`}
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-full flex justify-center items-center text-lg font-medium bg-base-300">
                    {name?.charAt(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </figcaption>
      </div>
    )
  };

  return variants[variant] || variants.default;
};

// Grid layout component for multiple testimonials
export const TestimonialGrid = ({ 
  testimonials = [], 
  title = "What our users say",
  subtitle = "Don't take our word for it. Here's what they have to say.",
  className = "",
  featuredIndex = null
}) => {
  return (
    <section className={`py-24 px-8 max-w-7xl mx-auto ${className}`}>
      <div className="flex flex-col text-center w-full mb-20">
        <div className="mb-8">
          <h2 className="sm:text-5xl text-4xl font-extrabold text-base-content">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="lg:w-2/3 mx-auto leading-relaxed text-base text-base-content/80">
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {testimonials.map((testimonial, index) => (
          <Testimonial
            key={index}
            variant={index === featuredIndex ? "featured" : "card"}
            text={testimonial.text}
            author={testimonial.author}
            social={testimonial.social}
            featured={index === featuredIndex}
            className={index === featuredIndex ? 'lg:col-span-2' : ''}
          />
        ))}
      </div>
    </section>
  );
};

export default Testimonial;
