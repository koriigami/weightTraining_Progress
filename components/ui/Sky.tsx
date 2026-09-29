// The Arena Bright backdrop: a fixed sky gradient with three drifting cloud
// layers in the top band only. Purely decorative. It sits behind everything
// (z-index -1), and the drift stops under prefers-reduced-motion (globals.css).
export function Sky() {
  return (
    <div className="wt-sky" aria-hidden="true" data-testid="sky">
      <div className="wt-sky-band">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
