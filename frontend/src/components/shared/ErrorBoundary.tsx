import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "../ui/button";
import { AlertTriangle } from "lucide-react";
import i18n from "../../i18n";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
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

            return (
                <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                    <div>
                        <h2 className="text-lg font-semibold">{i18n.t("common:errors.generic")}</h2>
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
