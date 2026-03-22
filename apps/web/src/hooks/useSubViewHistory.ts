import { useEffect } from 'react';

/**
 * Syncs a React sub-view state with the browser history API so that the
 * Android hardware back button steps correctly through nested views.
 *
 * Usage:
 *   const [view, setView] = useState<'list' | 'detail'>(null);
 *   useSubViewHistory(view !== null, () => setView(null));
 *
 * @param isInSubView  true when the user is inside a sub-view (not the root state)
 * @param onBack       callback to run when the user presses back (should reset the sub-view)
 */
export function useSubViewHistory(
    isInSubView: boolean,
    onBack: () => void
) {
    // Push a synthetic history entry whenever we enter a sub-view
    useEffect(() => {
        if (isInSubView) {
            window.history.pushState({ subView: true }, '');
        }
    }, [isInSubView]);

    // Listen for popstate (hardware back / browser back)
    useEffect(() => {
        const handlePop = () => {
            if (isInSubView) {
                onBack();
            }
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [isInSubView, onBack]);
}
