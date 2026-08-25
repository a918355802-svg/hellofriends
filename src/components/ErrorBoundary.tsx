import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IS_DEV } from '@/config/env';
import { BRAND } from '@/config/brand';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Last line of defence: a render crash shows a friendly recovery screen instead
 * of a white page. Technical details stay in the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (IS_DEV) console.error('[hellofriends] render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="max-w-xs text-sm text-muted">
          {BRAND.name} ran into an unexpected problem. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 h-11 rounded-2xl bg-brand px-6 font-semibold text-brand-ink"
        >
          Reload app
        </button>
      </div>
    );
  }
}
