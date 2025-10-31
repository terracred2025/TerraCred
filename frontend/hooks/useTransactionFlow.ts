import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type TransactionStep =
  | 'idle'
  | 'confirming'
  | 'processing'
  | 'waiting'
  | 'success'
  | 'error';

interface TransactionState {
  step: TransactionStep;
  message: string;
  txHash?: string;
  error?: string;
}

export function useTransactionFlow() {
  const router = useRouter();
  const [state, setState] = useState<TransactionState>({
    step: 'idle',
    message: '',
  });

  const startTransaction = (message: string = 'Check your wallet...') => {
    setState({ step: 'confirming', message });
  };

  const setProcessing = (message: string = 'Processing transaction...') => {
    setState({ step: 'processing', message });
  };

  const setWaiting = (message: string = 'Waiting for confirmation...', txHash?: string) => {
    setState({ step: 'waiting', message, txHash });
  };

  const setSuccess = (message: string = 'Transaction successful!', txHash?: string) => {
    setState({ step: 'success', message, txHash });
  };

  const setError = (error: string) => {
    setState({ step: 'error', message: error, error });
  };

  const reset = () => {
    setState({ step: 'idle', message: '' });
  };

  const executeTransaction = async <T,>(
    transactionFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void | Promise<void>;
      successMessage?: string;
      redirectTo?: string;
      redirectDelay?: number;
    }
  ): Promise<T | null> => {
    try {
      startTransaction();

      setProcessing();
      const result = await transactionFn();

      setWaiting();
      // Give time for blockchain confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const successMsg = options?.successMessage || 'Transaction successful!';
      setSuccess(successMsg);

      // Execute success callback
      if (options?.onSuccess) {
        await options.onSuccess(result);
      }

      // Auto-redirect if specified
      if (options?.redirectTo) {
        const delay = options?.redirectDelay || 1500;
        setTimeout(() => {
          router.push(options.redirectTo!);
        }, delay);
      }

      return result;
    } catch (error: any) {
      console.error('Transaction error:', error);
      setError(error.message || 'Transaction failed');
      return null;
    }
  };

  return {
    state,
    isProcessing: state.step !== 'idle' && state.step !== 'success' && state.step !== 'error',
    startTransaction,
    setProcessing,
    setWaiting,
    setSuccess,
    setError,
    reset,
    executeTransaction,
  };
}
