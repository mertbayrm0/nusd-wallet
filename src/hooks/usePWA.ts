import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAReturn {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    installApp: () => Promise<void>;
    showIOSInstructions: boolean;
    setShowIOSInstructions: (show: boolean) => void;
}

export const usePWA = (): UsePWAReturn => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);

    // Check if already installed
    useEffect(() => {
        // Check if running in standalone mode (installed)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        // iOS Safari standalone check
        if ((window.navigator as any).standalone === true) {
            setIsInstalled(true);
        }
    }, []);

    // Listen for install prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setInstallPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Register service worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);
                })
                .catch((error) => {
                    console.error('SW registration failed:', error);
                });
        }
    }, []);

    const installApp = useCallback(async () => {
        if (isIOS) {
            // Show iOS instructions modal
            setShowIOSInstructions(true);
            return;
        }

        if (installPrompt) {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            console.log('Install outcome:', outcome);
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setInstallPrompt(null);
        }
    }, [installPrompt, isIOS]);

    return {
        isInstallable: !!installPrompt || isIOS,
        isInstalled,
        isIOS,
        isAndroid,
        installApp,
        showIOSInstructions,
        setShowIOSInstructions
    };
};

export default usePWA;
