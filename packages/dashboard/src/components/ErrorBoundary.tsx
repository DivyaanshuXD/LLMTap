import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LLMTap] UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-center gap-6 py-24">
        <div className="dashboard-shell flex max-w-lg flex-col items-center gap-5 rounded-[28px] px-8 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
            <AlertTriangle className="h-7 w-7 text-rose-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }
}
