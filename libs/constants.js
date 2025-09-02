// Common constants and data for the ShareSkippy app

export const SOCIAL_ICONS = {
  twitter: {
    id: "twitter",
    ariaLabel: "See user post on Twitter",
    svg: (
      <svg className="w-5 h-5 fill-[#00aCee]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.611-.1-.923a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z"></path>
      </svg>
    ),
  },
  productHunt: {
    id: "product_hunt",
    ariaLabel: "See user review on Product Hunt",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26.245 26.256" className="w-[18px] h-[18px]">
        <path d="M26.254 13.128c0 7.253-5.875 13.128-13.128 13.128S-.003 20.382-.003 13.128 5.872 0 13.125 0s13.128 5.875 13.128 13.128" fill="#da552f"/>
        <path d="M14.876 13.128h-3.72V9.2h3.72c1.083 0 1.97.886 1.97 1.97s-.886 1.97-1.97 1.97m0-6.564H8.53v13.128h2.626v-3.938h3.72c2.538 0 4.595-2.057 4.595-4.595s-2.057-4.595-4.595-4.595" fill="#fff"/>
      </svg>
    ),
  },
  video: {
    id: "video",
  },
  other: { 
    id: "other" 
  },
};

export const SAMPLE_TESTIMONIALS = [
  {
    username: "marclou",
    name: "Marc Lou",
    text: "Really easy to use. The tutorials are really useful and explains how everything works. Hope to ship my next project really fast!",
    type: "twitter",
    link: "https://twitter.com/marc_louvion",
    img: "https://pbs.twimg.com/profile_images/1514863683574599681/9k7PqDTA_400x400.jpg",
  },
  {
    username: "the_mcnaveen",
    name: "Naveen",
    text: "Setting up everything from the ground up is a really hard, and time consuming process. What you pay for will save your time for sure.",
    type: "twitter",
    link: "https://twitter.com/the_mcnaveen",
  },
  {
    username: "wahab",
    name: "Wahab Shaikh",
    text: "Easily saves 15+ hrs for me setting up trivial stuff. Now, I can directly focus on shipping features rather than hours of setting up the same technologies from scratch. Feels like a super power! :D",
    type: "productHunt",
    link: "https://www.producthunt.com/products/shipfast-2/reviews?review=667971",
  },
];

export const APP_CONFIG = {
  name: "ShareSkippy",
  description: "Connect dog owners with trusted dog sitters in your community",
  version: "0.1.0",
  author: "ShareSkippy Team",
  contact: {
    email: "support@shareskippy.com",
    website: "https://shareskippy.com"
  }
};

export const NAVIGATION = {
  main: [
    { name: "Home", href: "/" },
    { name: "Community", href: "/community" },
    { name: "Safety", href: "/safety" },
    { name: "FAQ", href: "/faq" },
    { name: "Blog", href: "/blog" }
  ],
  footer: [
    { name: "About", href: "/about" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/tos" },
    { name: "Contact", href: "/contact" }
  ]
};

export const FEATURES = [
  {
    title: "Community-Driven",
    description: "Connect with local dog owners and sitters in your neighborhood",
    icon: "🏘️"
  },
  {
    title: "Safety First",
    description: "Verified profiles and safety guidelines ensure peace of mind",
    icon: "🛡️"
  },
  {
    title: "Easy Scheduling",
    description: "Simple availability management and booking system",
    icon: "📅"
  },
  {
    title: "Trusted Network",
    description: "Build relationships with reliable sitters in your area",
    icon: "🤝"
  }
];
