import React from 'react';
import useHashConnect from '../hooks/useHashConnect';

const HashConnectButton: React.FC = () => {
  const { isConnected, accountId, isLoading, connect, disconnect } = useHashConnect();

  const formatAccountId = (id: string) => {
    return `${id.slice(0, 7)}...${id.slice(-4)}`;
  };

  return (
    <div className="flex items-center">
      {!isConnected ? (
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">
            {formatAccountId(accountId || '')}
          </span>
          <button
            className="px-3 py-1.5 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default HashConnectButton; 