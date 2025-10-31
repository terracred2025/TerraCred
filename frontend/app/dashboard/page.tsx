'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import { InfoIcon } from '@/components/Tooltip';
import { toast } from '@/lib/toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Property, Loan } from '@/types';

export default function DashboardPage() {
  const { isConnected, accountId } = useHashConnect();
  const { getLoanDetails, withdrawCollateral } = useContract();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's properties
        const propsResponse = await api.getProperties(accountId);
        if (propsResponse.success) {
          setProperties(propsResponse.properties);
        }

        // Fetch loan details from the contract
        setLoadingLoan(true);
        try {
          const details = await getLoanDetails(accountId);
          setLoanDetails(details);

          // Also try to fetch loan data from backend (legacy)
          try {
            const loanResponse = await api.getLoan(accountId);
            if (loanResponse.success && loanResponse.loan) {
              setLoan(loanResponse.loan);
            }
          } catch {
            // No loan exists in backend, that's ok
            setLoan(null);
          }
        } catch (error) {
          console.error('Failed to fetch loan details:', error);
          setLoanDetails(null);
        } finally {
          setLoadingLoan(false);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, accountId]);

  // Handle collateral withdrawal
  const handleWithdrawCollateral = async () => {
    if (!loanDetails || !accountId) return;

    const collateralAmount = loanDetails.collateralAmount;
    const propertyId = loanDetails.propertyId;

    setConfirmModal({
      isOpen: true,
      title: 'Withdraw Collateral',
      description: `Withdraw ${collateralAmount} RWA tokens? Property will be delisted and we'll arrange off-chain transfer.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setWithdrawing(true);
        const loadingToast = toast.loading('Withdrawing collateral...');

        try {
          // Call withdraw collateral on smart contract
          const result = await withdrawCollateral(collateralAmount);
          toast.dismiss(loadingToast);

          if (result.success) {
            toast.success('Collateral withdrawn successfully');

            // Call backend to delist property
            try {
              await api.delistProperty(accountId, propertyId);
            } catch (err) {
              console.error('Failed to delist property in backend:', err);
            }

            // Refresh loan details
            const updatedDetails = await getLoanDetails(accountId);
            setLoanDetails(updatedDetails);

            // Refresh properties
            const propsResponse = await api.getProperties(accountId);
            if (propsResponse.success) {
              setProperties(propsResponse.properties);
            }
          }
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.message || 'Withdrawal failed');
        } finally {
          setWithdrawing(false);
        }
      },
    });
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <p className="text-foreground font-medium mb-4">Wallet Not Connected</p>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your dashboard
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const totalValue = properties.reduce((sum, p) => sum + p.value, 0);
  const verifiedCount = properties.filter(p => p.status === 'verified').length;

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-5xl font-bold mb-4">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Welcome back, <span className="font-mono">{accountId?.slice(0, 10)}...</span>
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Properties */}
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-muted-foreground">Total Properties</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mb-1">{properties.length}</p>
          <p className="text-xs text-muted-foreground">
            {verifiedCount} verified • {properties.length - verifiedCount} pending
          </p>
        </div>

        {/* Total Value */}
        <div className="bg-card border border-border rounded-lg p-8">
          <p className="text-sm text-muted-foreground mb-2">Total Value</p>
          <p className="text-3xl font-bold tabular-nums mb-1">₦{(totalValue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground">
            Portfolio equity value
          </p>
        </div>

        {/* Loan Status */}
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-muted-foreground">Loan Status</p>
            <InfoIcon tooltip={
              <div className="space-y-1">
                <p>Shows your current loan status:</p>
                <ul className="text-xs list-disc list-inside">
                  <li>Borrowed: Active loan amount</li>
                  <li>Available: Max you can borrow</li>
                  <li>Health: Ratio of collateral to debt</li>
                </ul>
              </div>
            } />
          </div>
          {loading || loadingLoan ? (
            <>
              <p className="text-2xl font-bold text-muted-foreground">Loading...</p>
            </>
          ) : loanDetails && parseFloat(loanDetails.collateralAmount) > 0 ? (
            <>
              {parseFloat(loanDetails.borrowedAmount) > 0 ? (
                <>
                  <p className="text-3xl font-bold tabular-nums mb-1">₦{(parseFloat(loanDetails.borrowedAmount) / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Borrowed • Health: {loanDetails.healthFactor !== '0' && loanDetails.healthFactor !== '115792089237316195423570985008687907853269984665640564039457584007913129639935' ? `${(parseFloat(loanDetails.healthFactor) / 1).toFixed(0)}%` : '∞'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold tabular-nums mb-1">₦{(parseFloat(loanDetails.maxBorrow) / 100 / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground">
                    Available • {loanDetails.collateralAmount} tokens locked
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums mb-1">₦0</p>
              <p className="text-xs text-muted-foreground">No collateral deposited</p>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <Link
          href="/tokenize"
          className="p-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
        >
          Tokenize Property
        </Link>
        <Link
          href="/borrow"
          className="p-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
        >
          Borrow heNGN
        </Link>
        <Link
          href="/repay"
          className="p-4 bg-card border border-border rounded-lg font-medium hover:bg-muted transition-colors text-center"
        >
          Repay Loan
        </Link>
      </div>

      {/* Withdraw Collateral Section - Only show if collateral exists and NO active loan */}
      {!loading && !loadingLoan && loanDetails &&
       parseFloat(loanDetails.collateralAmount) > 0 &&
       parseFloat(loanDetails.borrowedAmount) === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 mb-12">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold">Withdraw Collateral</h2>
            <InfoIcon tooltip={
              <div className="space-y-2 text-xs">
                <p><strong>Withdrawing returns:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All RWA tokens to your wallet</li>
                  <li>Delists property from platform</li>
                  <li>Initiates off-chain transfer process</li>
                </ul>
              </div>
            } />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {loanDetails.collateralAmount} tokens locked • No active loan
          </p>

          <div className="p-4 bg-background border border-border rounded-lg mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Collateral Amount</p>
                <p className="text-xl font-bold">{loanDetails.collateralAmount} tokens</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Property ID</p>
                <p className="text-xl font-bold">{loanDetails.propertyId}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleWithdrawCollateral}
            disabled={withdrawing}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawing ? 'Processing...' : 'Withdraw Collateral'}
          </button>
        </div>
      )}

      {/* Your Properties */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Your Properties</h2>
        
        {properties.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't tokenized any properties yet.
            </p>
            <Link
              href="/tokenize"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Tokenize Your First Property
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <Link
                key={property.propertyId}
                href={`/properties/${property.propertyId}`}
                className="bg-card border border-border rounded-lg p-8 hover:border-primary transition-colors"
              >
                {/* Status */}
                <div className="mb-3">
                  {property.status === 'verified' && (
                    <span className="px-2 py-1 bg-muted text-foreground rounded text-xs font-medium">
                      Verified
                    </span>
                  )}
                  {property.status === 'pending' && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">
                      Pending
                    </span>
                  )}
                </div>

                {/* Address */}
                <h3 className="font-semibold mb-2 line-clamp-2">{property.address}</h3>
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                  {property.propertyId}
                </p>

                {/* Value */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-semibold">₦{(property.value / 1000000).toFixed(1)}M</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
      />
    </div>
  );
}