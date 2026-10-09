import { createElement, type ImgHTMLAttributes } from 'react';

type ImageShimProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

export default function ImageShim({
  fill: _fill,
  priority: _priority,
  ...props
}: ImageShimProps) {
  return createElement('img', props);
}
