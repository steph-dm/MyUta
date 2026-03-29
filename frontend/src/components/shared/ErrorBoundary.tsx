import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "../ui/button";
import { AlertTriangle } from "lucide-react";
import i18n from "../../i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.props.compact) {
        return (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {i18n.t("common:errors.unexpectedMessage")}
            </p>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              {i18n.t("common:errors.tryAgain")}
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">
              {i18n.t("common:errors.generic")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {i18n.t("common:errors.unexpectedMessage")}
            </p>
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            {i18n.t("common:errors.tryAgain")}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

export const SectionErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary compact>{children}</ErrorBoundary>
);
