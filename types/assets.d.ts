import type { StaticImageData } from 'next/image';

declare module '*.png' {
  const value: StaticImageData;
  export default value;
}
