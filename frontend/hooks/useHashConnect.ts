'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setLoading, setConnected, setDisconnected } from '../store/hashConnectSlice';

// Track if listeners are setup (outside component to persist across re-renders)
let listenersSetup = false;

const useHashConnect = () => {
  const dispatch = useDispatch();
  const hashconnectState = useSelector((state: RootState) => state.hashconnect);
  const { isConnected, accountId, isLoading } = hashconnectState;

  // Only setup event listeners, don't initialize on mount
  useEffect(() => {
    // Skip initialization on mount - we'll initialize when user clicks connect
    console.log("🔷 useHashConnect hook mounted (initialization deferred until connect)");
  }, [dispatch]);

  const connect = async () => {
    dispatch(setLoading(true));
    try {
      if (typeof window === 'undefined') {
        console.error('❌ Not in browser environment');
        dispatch(setLoading(false));
        return;
      }

      console.log('🔷 Starting wallet connection...');
      console.log('🔷 Current URL:', window.location.origin);

      const { getHashConnectInstance, getConnectedAccountIds } = await import('../services/hashConnect');
      console.log('🔷 HashConnect service imported');

      const instance = await getHashConnectInstance();
      console.log('🔷 HashConnect instance obtained:', instance);

      // Setup event listeners (do this once)
      if (!listenersSetup) {
        console.log('🔷 Setting up event listeners...');

        instance.pairingEvent.on(async () => {
          console.log('✅ Pairing event triggered');
          const accounts = await getConnectedAccountIds();
          if (accounts?.length > 0) {
            console.log('✅ Connected account:', accounts[0].toString());
            dispatch(setConnected({ accountId: accounts[0].toString() }));
          }
        });

        instance.disconnectionEvent.on(() => {
          console.log('🔷 Disconnect event triggered');
          dispatch(setDisconnected());
        });

        listenersSetup = true;
        console.log('✅ Event listeners setup complete');
      }

      // Check if already connected
      const accounts = await getConnectedAccountIds();
      if (accounts?.length > 0) {
        console.log('✅ Already connected:', accounts[0].toString());
        dispatch(setConnected({ accountId: accounts[0].toString() }));
        dispatch(setLoading(false));
        return;
      }

      console.log('🔷 Attempting to open pairing modal...');

      // Open pairing modal
      try {
        await instance.openPairingModal();
        console.log('✅ Pairing modal opened successfully');
        // Keep loading state - it will be cleared when pairing event fires
      } catch (modalError: any) {
        console.error('❌ Pairing modal failed:', modalError);
        console.error('❌ Error message:', modalError?.message);
        console.error('❌ Error details:', modalError);
        alert(`Wallet connection failed: ${modalError?.message || 'Unknown error'}\n\nPlease try:\n1. Refresh the page\n2. Check if you're using a VPN\n3. Ensure HashPack wallet is installed`);
        dispatch(setLoading(false));
      }

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      alert(`Connection error: ${error?.message || 'Unknown error'}\n\nPlease try:\n1. Refresh the page\n2. Install HashPack wallet extension\n3. Check your internet connection`);
      dispatch(setLoading(false));
    }
  };

  const disconnect = async () => {
    try {
      if (typeof window === 'undefined') return;

      const { getHashConnectInstance } = await import('../services/hashConnect');
      const instance = await getHashConnectInstance(); // Now waits for initialization

      instance.disconnect();
      dispatch(setDisconnected());
    } catch (error) {
      console.error('Disconnect failed:', error);
      dispatch(setDisconnected());
    }
  };

  return {
    isConnected,
    accountId,
    isLoading,
    connect,
    disconnect,
  };
};

export default useHashConnect;
