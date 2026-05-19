interface ParticlesJSInstance {
  fn: {
    vendors: {
      destroypJS: () => void;
    };
  };
}

interface Window {
  particlesJS?: (tagId: string, params: unknown) => void;
  pJSDom?: ParticlesJSInstance[] | null;
}
