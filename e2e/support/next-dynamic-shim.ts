import { createElement, type ComponentType } from 'react';

type Loader = () => Promise<{ default: ComponentType } | ComponentType>;

export default function dynamic(_loader: Loader) {
  return function DynamicShim() {
    return createElement('span', { 'aria-hidden': true });
  };
}
