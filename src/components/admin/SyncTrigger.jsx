
import React, { useEffect, useRef } from 'react';

// Helper component to trigger sync once when mounted
const SyncTrigger = ({ onSync, onComplete }) => {
    const hasRun = useRef(false);

    useEffect(() => {
        if (!hasRun.current) {
            hasRun.current = true;
            onSync().then(() => {
                // Add small delay so user sees the loading state briefly
                setTimeout(onComplete, 1000);
            });
        }
    }, [onSync, onComplete]);

    return null;
};

export default SyncTrigger;
