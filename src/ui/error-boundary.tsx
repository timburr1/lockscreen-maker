import { Component, type ReactNode } from 'react';
import { logError } from '../log';

type Props = { readonly children: ReactNode };
type State = { readonly failed: boolean };

/** Catches bugs thrown while rendering, so a visitor sees a message rather than a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    logError('The app failed to render', error);
  }

  override render() {
    return this.state.failed ? <p role="alert">Something went wrong. Reload the page to try again.</p> : this.props.children;
  }
}
