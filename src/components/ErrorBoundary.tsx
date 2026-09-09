import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/* Isolates WebGL blob crashes — on success renders children untouched
   (no visual change); on failure renders a blank same-size box so the
   fixed centered layout is preserved. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="h-[64vmin] w-[64vmin] md:h-[52vmin] md:w-[52vmin]" aria-hidden="true" />;
    }
    return this.props.children;
  }
}
