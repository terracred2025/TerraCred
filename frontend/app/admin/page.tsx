'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import { toast } from '@/lib/toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Property } from '@/types';

export default function AdminPage() {
  const { isConnected, accountId } = useHashConnect();
  const { withdrawFees, getTokenBalance } = useContract();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [withdrawingFees, setWithdrawingFees] = useState(false);
  const [poolBalance, setPoolBalance] = useState<string>('0');
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

  // Check if user is admin
  const isAdmin = accountId === CONFIG.ADMIN_ACCOUNT_ID;

  useEffect(() => {
    async function fetchAllProperties() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // ✅ Admin fetches ALL properties (no owner filter)
        const response = await api.getProperties();
        if (response.success) {
          setProperties(response.properties);
        }

        // Fetch pool balance (accumulated fees)
        try {
          const balance = await getTokenBalance(CONFIG.LENDING_POOL_ID, CONFIG.HENGN_TOKEN_ADDRESS);
          setPoolBalance(balance);
        } catch (error) {
          console.error('Failed to fetch pool balance:', error);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllProperties();
  }, [isConnected, accountId]);

  const handleVerifyProperty = async (propertyId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Verify Property',
      description: `This will mint RWA tokens to the property owner and mark the property as verified. The owner can then use it as collateral.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVerifying(propertyId);
        const loadingToast = toast.loading('Verifying property...');

        try {
          const response = await fetch(`${CONFIG.API_URL}/properties/${propertyId}/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              verifier: accountId,
            }),
          });

          const result = await response.json();
          toast.dismiss(loadingToast);

          if (result.success) {
            toast.success('Property verified successfully');

            // Refresh properties list
            const refreshResponse = await api.getProperties();
            if (refreshResponse.success) {
              setProperties(refreshResponse.properties);
            }
          } else {
            toast.error(result.error || 'Verification failed');
          }
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.message || 'Verification error');
        } finally {
          setVerifying(null);
        }
      },
    });
  };

  const handleRejectProperty = async (propertyId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Property',
      description: `This property will be marked as rejected and the owner will be notified.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const loadingToast = toast.loading('Rejecting property...');

        try {
          const response = await fetch(`${CONFIG.API_URL}/properties/${propertyId}/reject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reason: 'Property does not meet requirements',
            }),
          });

          const result = await response.json();
          toast.dismiss(loadingToast);

          if (result.success) {
            toast.success('Property rejected');

            // Refresh properties list
            const refreshResponse = await api.getProperties();
            if (refreshResponse.success) {
              setProperties(refreshResponse.properties);
            }
          } else {
            toast.error(result.error || 'Rejection failed');
          }
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.message || 'Error rejecting property');
        }
      },
    });
  };

  const handleWithdrawFees = async () => {
    const poolBalanceNaira = parseFloat(poolBalance) / 100;

    setConfirmModal({
      isOpen: true,
      title: 'Withdraw Fees',
      description: `Withdraw ₦${poolBalanceNaira.toLocaleString()} in accumulated fees to your wallet?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setWithdrawingFees(true);
        const loadingToast = toast.loading('Withdrawing fees...');

        try {
          const result = await withdrawFees();
          toast.dismiss(loadingToast);

          if (result.success) {
            toast.success(`Successfully withdrew ₦${poolBalanceNaira.toLocaleString()}`);

            // Refresh pool balance
            const newBalance = await getTokenBalance(CONFIG.LENDING_POOL_ID, CONFIG.HENGN_TOKEN_ADDRESS);
            setPoolBalance(newBalance);
          }
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.message || 'Fee withdrawal failed');
        } finally {
          setWithdrawingFees(false);
        }
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 bg-muted text-foreground rounded text-xs font-medium">Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  const filteredProperties = properties.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <p className="text-foreground font-medium mb-4">Wallet Not Connected</p>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to access the admin panel
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

  // Not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <p className="text-foreground font-medium mb-4">Access Denied</p>
            <p className="text-muted-foreground mb-6">
              Admin privileges required
            </p>
            <div className="text-xs text-muted-foreground mb-4">
              <p>Your account: <span className="font-mono">{accountId}</span></p>
              <p>Admin account: <span className="font-mono">{CONFIG.ADMIN_ACCOUNT_ID}</span></p>
            </div>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-4xl font-bold mb-4">Admin Panel</h1>
        <p className="text-muted-foreground mb-2">
          Manage and verify property submissions
        </p>
        <p className="text-xs text-muted-foreground">
          Admin account: <span className="font-mono">{accountId}</span>
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Properties</p>
          <p className="text-2xl font-bold">{properties.length}</p>
        </div>
        <div className="bg-muted border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold">
            {properties.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-muted border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Verified</p>
          <p className="text-2xl font-bold">
            {properties.filter(p => p.status === 'verified').length}
          </p>
        </div>
        <div className="bg-muted border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Rejected</p>
          <p className="text-2xl font-bold">
            {properties.filter(p => p.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Fee Withdrawal Section */}
      <div className="bg-card border border-border rounded-lg p-8 mb-12">
        <h2 className="text-lg font-bold mb-2">Platform Fees</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Accumulated origination fees ({CONFIG.ORIGINATION_FEE}%)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Pool Balance</p>
            <p className="text-2xl font-bold">
              ₦{(parseFloat(poolBalance) / 100).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Available</p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Fee Rate</p>
            <p className="text-2xl font-bold">{CONFIG.ORIGINATION_FEE}%</p>
            <p className="text-xs text-muted-foreground mt-1">Per loan</p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Verified</p>
            <p className="text-2xl font-bold">{properties.filter(p => p.status === 'verified').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Properties</p>
          </div>
        </div>

        <button
          onClick={handleWithdrawFees}
          disabled={withdrawingFees || parseFloat(poolBalance) === 0}
          className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-lg font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {withdrawingFees ? 'Withdrawing...' : `Withdraw ₦${(parseFloat(poolBalance) / 100).toLocaleString()}`}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          All ({properties.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Pending ({properties.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'verified'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Verified ({properties.filter(p => p.status === 'verified').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rejected'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-card/80'
          }`}
        >
          Rejected ({properties.filter(p => p.status === 'rejected').length})
        </button>
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            {filter === 'all'
              ? 'No properties submitted yet.'
              : `No ${filter} properties found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProperties.map((property) => (
            <div
              key={property.propertyId}
              className="bg-card border border-border rounded-lg p-8"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{property.address}</h3>
                    {getStatusBadge(property.status)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    {property.propertyId}
                  </p>
                  {property.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {property.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="text-sm font-mono">{property.owner}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="text-sm font-semibold">₦{(property.value / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Token Supply</p>
                  <p className="text-sm font-semibold">{property.tokenSupply.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm">{new Date(property.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {property.status === 'verified' && property.tokenId && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-success font-medium mb-1">✓ Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Token ID: <span className="font-mono">{property.tokenId}</span>
                  </p>
                  {property.verifiedAt && (
                    <p className="text-xs text-muted-foreground">
                      Verified: {new Date(property.verifiedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {property.status === 'rejected' && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-danger font-medium mb-1">✗ Rejected</p>
                  {property.rejectionReason && (
                    <p className="text-xs text-muted-foreground">
                      Reason: {property.rejectionReason}
                    </p>
                  )}
                </div>
              )}

              {/* Actions for pending properties */}
              {property.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerifyProperty(property.propertyId)}
                    disabled={verifying === property.propertyId}
                    className="flex-1 px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying === property.propertyId ? 'Verifying...' : '✓ Verify Property'}
                  </button>
                  <button
                    onClick={() => handleRejectProperty(property.propertyId)}
                    disabled={verifying !== null}
                    className="flex-1 px-4 py-2 bg-danger text-white rounded-lg font-medium hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {/* View details link */}
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href={`/properties/${property.propertyId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Full Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

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
