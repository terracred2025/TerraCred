import { TransactionStep } from '@/hooks/useTransactionFlow';

interface TransactionStatusProps {
  step: TransactionStep;
  message: string;
  txHash?: string;
}

export function TransactionStatus({ step, message, txHash }: TransactionStatusProps) {
  if (step === 'idle') return null;

  const getIcon = () => {
    switch (step) {
      case 'confirming':
        return '👛';
      case 'processing':
        return '⚙️';
      case 'waiting':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getColor = () => {
    switch (step) {
      case 'confirming':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'processing':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'waiting':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'error':
        return 'bg-danger/10 border-danger/20 text-danger';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getColor()}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {txHash && (
            <a
              href={`https://hashscan.io/testnet/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline mt-1 block"
            >
              View on HashScan →
            </a>
          )}
        </div>
        {(step === 'processing' || step === 'waiting') && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
        )}
      </div>
    </div>
  );
}
