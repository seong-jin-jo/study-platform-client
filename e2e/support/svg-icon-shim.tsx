import { createElement, type SVGProps } from 'react';

export default function SvgIconShim(props: SVGProps<SVGSVGElement>) {
  return createElement(
    'svg',
    {
      width: 24,
      height: 24,
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      ...props,
    },
    createElement('path', {
      d: 'M8 4l8 8-8 8',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
    }),
  );
}
