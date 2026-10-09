interface Scope {
  setExtra: (_key: string, _value: unknown) => void;
  setTag: (_key: string, _value: string) => void;
}

const scope: Scope = {
  setExtra: () => undefined,
  setTag: () => undefined,
};

export const captureException = () => undefined;
export const captureMessage = () => undefined;
export const withScope = (callback: (activeScope: Scope) => void) =>
  callback(scope);
