'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { useTransactionFlow } from '@/hooks/useTransactionFlow';
import { TransactionStatus } from '@/components/TransactionStatus';
import { InfoIcon } from '@/components/Tooltip';
import { CONFIG } from '@/constants';
import type { Loan } from '@/types';

export default function RepayPage() {
  const { isConnected, accountId, connect } = useHashConnect();
  const { repay, extendLoan, getLoanDetails, getTokenBalance } = useContract();
  const txFlow = useTransactionFlow();

  const [loanDetails, setLoanDetails] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [heNGNBalance, setHeNGNBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh function
  const refreshLoanData = async () => {
    if (!isConnected || !accountId) return;

    try {
      // Fetch loan details
      const details = await getLoanDetails(accountId) as Loan;
      setLoanDetails(details);

      // Fetch heNGN balance
      const balance = await getTokenBalance(accountId, CONFIG.HENGN_TOKEN_ADDRESS);
      setHeNGNBalance(balance);
    } catch (error) {
      console.error('Failed to refresh loan data:', error);
    }
  };

  useEffect(() => {
    async function fetchLoanData() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await refreshLoanData();
      } catch (error) {
        console.error('Failed to fetch loan data:', error);
        setError('Failed to load loan details');
      } finally {
        setLoading(false);
      }
    }

    fetchLoanData();
  }, [isConnected, accountId]);

  const handleRepay = async () => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      alert('Please enter a valid repayment amount');
      return;
    }

    if (!loanDetails) {
      alert('No active loan found');
      return;
    }

    const repayAmountCents = Math.floor(parseFloat(repayAmount) * 100);
    const totalDebtCents = parseFloat(loanDetails.totalDebt);
    const heNGNBalanceCents = parseFloat(heNGNBalance);

    if (repayAmountCents > heNGNBalanceCents) {
      alert(`Insufficient heNGN balance. You have ₦${(heNGNBalanceCents / 100).toFixed(2)} but need ₦${(repayAmountCents / 100).toFixed(2)}`);
      return;
    }

    // Check if this is a full repayment (with buffer)
    const bufferCents = 1000; // ₦10 buffer
    const isFullRepayment = repayAmountCents >= totalDebtCents && repayAmountCents <= totalDebtCents + bufferCents;

    // Allow repayment if it's within the buffer range
    if (repayAmountCents > totalDebtCents + bufferCents) {
      alert(`Repayment amount (₦${(repayAmountCents / 100).toFixed(2)}) exceeds total debt + buffer (₦${((totalDebtCents + bufferCents) / 100).toFixed(2)})`);
      return;
    }

    const confirmed = confirm(
      `💳 LOAN REPAYMENT\n\n` +
      `Repayment Amount: ₦${(repayAmountCents / 100).toFixed(2)}\n` +
      `Current Total Debt: ₦${(totalDebtCents / 100).toFixed(2)}\n` +
      (isFullRepayment ?
        `Buffer Included: ₦${((repayAmountCents - totalDebtCents) / 100).toFixed(2)}\n` +
        `(Accounts for interest during transaction)\n\n` +
        `✅ This will FULLY repay your loan and unlock your collateral!\n` +
        `Any excess heNGN will remain in your wallet.\n\n` :
        `Remaining After Payment: ₦${((totalDebtCents - repayAmountCents) / 100).toFixed(2)}\n\n` +
        `⚠️ This is a PARTIAL payment. You will still owe ₦${((totalDebtCents - repayAmountCents) / 100).toFixed(2)}\n\n`) +
      `This requires 2 wallet signatures:\n` +
      `1. Approve heNGN spending\n` +
      `2. Execute repayment\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    const result = await txFlow.executeTransaction(
      async () => {
        return await repay(repayAmountCents.toString());
      },
      {
        successMessage: isFullRepayment
          ? '✅ Loan fully repaid! Collateral unlocked!'
          : `✅ Payment of ₦${(repayAmountCents / 100).toFixed(2)} processed successfully!`,
        onSuccess: async (result) => {
          // Auto-refresh loan data
          await refreshLoanData();
          setRepayAmount('');

          // If fully repaid, the page will automatically show the success screen
          // because we're refreshing loanDetails and checking totalDebt
        },
        redirectTo: isFullRepayment ? '/dashboard' : undefined,
        redirectDelay: isFullRepayment ? 2000 : undefined,
      }
    );

    if (!result) {
      setError('Repayment failed. Please try again.');
    }
  };

  const handleExtendLoan = async () => {
    if (!loanDetails) {
      alert('No active loan found');
      return;
    }

    // Use calculated interest from totalDebt (always fresh from contract)
    const totalDebtCents = parseFloat(loanDetails.totalDebt);
    const borrowedCents = parseFloat(loanDetails.borrowedAmount);
    const interestOwedCents = totalDebtCents - borrowedCents;
    const heNGNBalanceCents = parseFloat(heNGNBalance);

    if (interestOwedCents > heNGNBalanceCents) {
      alert(`Insufficient heNGN balance to pay interest.\n\nRequired: ₦${(interestOwedCents / 100).toFixed(2)}\nYou have: ₦${(heNGNBalanceCents / 100).toFixed(2)}`);
      return;
    }

    const currentDueDate = new Date(parseInt(loanDetails.dueDate) * 1000);
    const newDueDate = new Date(currentDueDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // +90 days

    const confirmed = confirm(
      `📅 LOAN EXTENSION REQUEST\n\n` +
      `This is a ONE-TIME extension option.\n\n` +
      `Current Due Date: ${currentDueDate.toLocaleDateString()}\n` +
      `New Due Date: ${newDueDate.toLocaleDateString()}\n` +
      `Extension Period: 3 months (90 days)\n\n` +
      `Interest Payment Required: ₦${(interestOwedCents / 100).toFixed(2)}\n` +
      `Your heNGN Balance: ₦${(heNGNBalanceCents / 100).toFixed(2)}\n\n` +
      `⚠️ Important:\n` +
      `• You must pay all accrued interest\n` +
      `• This extension can only be used ONCE\n` +
      `• Interest will continue to accrue\n\n` +
      `This requires 2 wallet signatures:\n` +
      `1. Approve heNGN for interest payment\n` +
      `2. Execute extension\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError(null);

      setProcessingStep('Step 1/2: Approving heNGN for interest payment...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setProcessingStep('Step 2/2: Processing loan extension...');
      const result = await extendLoan(interestOwedCents.toString());

      if (result.success) {
        alert(`✅ Loan extended successfully!\n\nTransaction: ${result.txHash}\n\nNew due date: ${newDueDate.toLocaleDateString()}\nInterest paid: ₦${(interestOwedCents / 100).toFixed(2)}`);

        // Refresh loan details
        const updatedDetails = await getLoanDetails(accountId!) as Loan;
        setLoanDetails(updatedDetails);

        // Refresh balance
        const balance = await getTokenBalance(accountId!, CONFIG.HENGN_TOKEN_ADDRESS);
        setHeNGNBalance(balance);
      }
    } catch (error: any) {
      console.error('Extension failed:', error);
      setError(error.message || 'Loan extension failed');
      alert(`❌ Extension failed:\n${error.message}`);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleMaxRepay = () => {
    if (!loanDetails) return;
    const totalDebtNaira = parseFloat(loanDetails.totalDebt) / 100;
    const heNGNBalanceNaira = parseFloat(heNGNBalance) / 100;

    // Add ₦10 buffer to account for interest that accrues during transaction confirmation
    const bufferNaira = 10;
    const maxWithBuffer = totalDebtNaira + bufferNaira;

    setRepayAmount(Math.min(maxWithBuffer, heNGNBalanceNaira).toFixed(2));
  };

  // Check if extension is eligible
  const isExtensionEligible = () => {
    if (!loanDetails) return false;

    const dueDate = parseInt(loanDetails.dueDate);
    if (dueDate === 0) return false;

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

    // Must be within 30 days of due date, not overdue, and extension not used
    return (
      !loanDetails.extensionUsed &&
      now >= dueDate - thirtyDaysInSeconds &&
      now <= dueDate
    );
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Repay Loan</h1>
          <p className="text-muted-foreground mb-8">
            Connect your wallet to manage your loan repayment
          </p>
          <button
            onClick={connect}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading loan details...</p>
        </div>
      </div>
    );
  }

  const hasCollateral = loanDetails && parseFloat(loanDetails.collateralAmount) > 0;
  const hasBorrowed = loanDetails && parseFloat(loanDetails.borrowedAmount) > 0;
  const totalDebtCents = loanDetails ? parseFloat(loanDetails.totalDebt) : 0;
  const isDustDebt = totalDebtCents > 0 && totalDebtCents < 100; // Less than ₦1
  const isFullyRepaid = totalDebtCents === 0 || isDustDebt;

  // If loan is fully repaid (including dust amounts)
  if (hasCollateral && (totalDebtCents === 0 || isDustDebt)) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Repay Loan</h1>

          <div className="bg-card border border-border rounded-lg p-8 mb-6">
            <p className="text-lg font-semibold mb-4">
              Loan Fully Repaid
            </p>
            <p className="text-muted-foreground mb-2">
              {loanDetails.collateralAmount} tokens locked as collateral
            </p>
            {isDustDebt && (
              <p className="text-xs text-muted-foreground mb-4">
                Remaining ₦{(totalDebtCents / 100).toFixed(4)} is negligible
              </p>
            )}
            <p className="text-muted-foreground mb-4">
              Your loan is paid off. Withdraw collateral from your dashboard.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If collateral deposited but no borrow yet
  if (hasCollateral && !hasBorrowed) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Repay Loan</h1>

          <div className="bg-card border border-border rounded-lg p-8 mb-6">
            <p className="text-lg font-semibold mb-4">
              Collateral Deposited
            </p>
            <p className="text-muted-foreground mb-2">
              {loanDetails.collateralAmount} tokens locked as collateral
            </p>
            <p className="text-muted-foreground mb-4">
              You can borrow up to ₦{(parseFloat(loanDetails.maxBorrow) / 1000000).toFixed(2)}M
            </p>
            <p className="text-sm text-muted-foreground">
              No active loan to repay
            </p>
          </div>

          <Link
            href="/borrow"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Borrow Funds
          </Link>
        </div>
      </div>
    );
  }

  // No collateral at all
  if (!hasCollateral) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Repay Loan</h1>
          <p className="text-muted-foreground mb-8">
            You don&apos;t have any active loans
          </p>
          <Link
            href="/borrow"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Borrow Now
          </Link>
        </div>
      </div>
    );
  }

  const borrowedAmountNaira = parseFloat(loanDetails.borrowedAmount) / 100;
  const totalDebtNaira = parseFloat(loanDetails.totalDebt) / 100;
  // Calculate actual accrued interest from total debt (contract calculates this fresh)
  const accruedInterestNaira = totalDebtNaira - borrowedAmountNaira;
  const heNGNBalanceNaira = parseFloat(heNGNBalance) / 100;
  const healthFactor = parseFloat(loanDetails.healthFactor);
  const dueDate = new Date(parseInt(loanDetails.dueDate) * 1000);
  const daysRemaining = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  const isDueSoon = daysRemaining <= 30 && daysRemaining > 0;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-4">Repay Loan</h1>
          <p className="text-muted-foreground">
            Manage your loan repayment and extension options
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loan Status Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Debt Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">💰 Debt Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Principal Borrowed</span>
                <span className="font-semibold">₦{borrowedAmountNaira.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Accrued Interest ({CONFIG.INTEREST_RATE}% APR)</span>
                <span className="font-semibold text-orange-500">₦{accruedInterestNaira.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Total Debt</span>
                <span className="text-lg font-bold text-primary">₦{totalDebtNaira.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Loan Timeline */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📅 Loan Timeline</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-semibold">{dueDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Days Remaining</span>
                <span className={`font-semibold ${isOverdue ? 'text-destructive' : isDueSoon ? 'text-orange-500' : 'text-success'}`}>
                  {isOverdue ? `OVERDUE by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground">Extension Used</span>
                <span className={`font-semibold ${loanDetails.extensionUsed ? 'text-muted-foreground' : 'text-success'}`}>
                  {loanDetails.extensionUsed ? '✓ Yes' : '✗ No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings - Only show critical info */}
        {(healthFactor !== Number.MAX_SAFE_INTEGER && healthFactor < 120) || isOverdue ? (
          <div className="bg-muted border border-border px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">
              {isOverdue ? 'Loan Overdue' : 'Low Health Factor'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isOverdue
                ? `${Math.abs(daysRemaining)} days overdue. Repay immediately.`
                : `Health: ${healthFactor.toFixed(0)}%. Below liquidation threshold.`}
            </p>
          </div>
        ) : null}

        {/* Transaction Status */}
        <TransactionStatus
          step={txFlow.state.step}
          message={txFlow.state.message}
          txHash={txFlow.state.txHash}
        />

        {/* Repayment Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">💳 Make Repayment</h2>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Repayment Amount (heNGN)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Your heNGN Balance: ₦{heNGNBalanceNaira.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const balance = await getTokenBalance(accountId!, CONFIG.HENGN_TOKEN_ADDRESS);
                    setHeNGNBalance(balance);
                  }}
                  className="text-xs text-primary hover:underline"
                  disabled={txFlow.isProcessing}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-background border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={txFlow.isProcessing}
              />
              <button
                onClick={handleMaxRepay}
                className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={txFlow.isProcessing}
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Min: ₦0.01 • Max: ₦{Math.min(totalDebtNaira + 10, heNGNBalanceNaira).toFixed(2)}
              {heNGNBalanceNaira === 0 && totalDebtNaira > 0
                ? ' • ⚠️ You need heNGN to repay. Get heNGN first.'
                : parseFloat(repayAmount) >= totalDebtNaira && parseFloat(repayAmount) <= totalDebtNaira + 10
                  ? ' • Full repayment with ₦10 buffer to prevent interest accrual during transaction'
                  : parseFloat(repayAmount) === totalDebtNaira
                    ? ' • Full repayment will unlock your collateral'
                    : heNGNBalanceNaira < totalDebtNaira
                      ? ` • ⚠️ Insufficient balance (need ₦${(totalDebtNaira - heNGNBalanceNaira).toFixed(2)} more)`
                      : ''}
            </p>
          </div>

          <button
            onClick={handleRepay}
            disabled={txFlow.isProcessing || !repayAmount || parseFloat(repayAmount) <= 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {txFlow.isProcessing ? txFlow.state.message : 'Repay Loan'}
          </button>
        </div>

        {/* Extension Section */}
        {isExtensionEligible() ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold">Loan Extension</h2>
              <InfoIcon tooltip={
                <div className="text-xs space-y-1">
                  <p>Extend loan by 3 months (one-time)</p>
                  <p>Requires interest payment: ₦{accruedInterestNaira.toFixed(2)}</p>
                </div>
              } />
            </div>
            <button
              onClick={handleExtendLoan}
              disabled={processing}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? processingStep : `Extend for ₦${accruedInterestNaira.toFixed(2)}`}
            </button>
          </div>
        ) : loanDetails.extensionUsed ? (
          <div className="bg-muted border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Extension already used</p>
          </div>
        ) : !isOverdue ? (
          <div className="bg-muted border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              Extension available 30 days before due date
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
