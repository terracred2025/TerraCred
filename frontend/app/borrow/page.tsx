'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import { CONFIG } from '@/constants';
import { InfoIcon } from '@/components/Tooltip';
import type { Property } from '@/types';
import { AssociateHeNGNButton } from '@/components/AssociateHeNGNButton';

export default function BorrowPage() {
  const { isConnected, accountId } = useHashConnect();
  const { depositCollateral, borrow, getLoanDetails } = useContract();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [step, setStep] = useState<'select' | 'deposit' | 'borrow'>('select');
  const [maxBorrowFromContract, setMaxBorrowFromContract] = useState<string>('0');
  const [loanDetails, setLoanDetails] = useState<any>(null);

  useEffect(() => {
    async function fetchProperties() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch properties
        const response = await api.getProperties(accountId);
        if (response.success) {
          const verified = response.properties.filter(p => p.status === 'verified');
          setProperties(verified);
        }

        // Check if user already has active collateral
        const details = await getLoanDetails(accountId);
        setLoanDetails(details);

        // If user has active collateral, they can only borrow more (not deposit different property)
        if (parseFloat(details.collateralAmount) > 0) {
          setMaxBorrowFromContract(details.maxBorrow);
          // Find which property is being used
          const collateralProperty = response.properties.find(
            p => p.tokenAddress?.toLowerCase() === details.collateralToken.toLowerCase()
          );

          if (collateralProperty) {
            setSelectedProperty(collateralProperty);
            setStep('borrow'); // Skip to borrow step
          } else {
            // Create a synthetic property object from blockchain data
            // ⭐ Calculate actual value from contract's maxBorrow (in Naira)
            const maxBorrowNaira = parseFloat(details.maxBorrow);
            const inferredPropertyValue = maxBorrowNaira > 0 ? maxBorrowNaira * 1.5 : 400000000;

            const syntheticProperty: Property = {
              propertyId: details.propertyId || 'BLOCKCHAIN',
              owner: accountId,
              address: 'Property from Blockchain',
              value: inferredPropertyValue, // ⭐ Infer from contract's maxBorrow
              description: 'Collateral deposited directly on blockchain',
              status: 'verified',
              tokenId: details.collateralToken,
              tokenAddress: details.collateralToken,
              tokenSupply: parseInt(details.collateralAmount),
              verifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            setSelectedProperty(syntheticProperty);
            setStep('borrow'); // Skip to borrow step
          }
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [isConnected, accountId]);

  // ⭐ REMOVED: The automatic balance check that was triggering wallet connection

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setBorrowAmount('');
    setStep('deposit');
  };

  const handleDepositCollateral = async () => {
    if (!selectedProperty || !accountId) return;

    // ALL-OR-NOTHING MODEL: User must deposit entire property
    const allTokens = selectedProperty.tokenSupply.toString();
    // ⭐ Property value stays in NAIRA (matches 1 token = ₦1 model)
    // Only heNGN amounts use kobo (2 decimals), not property values!
    const totalPropertyValue = selectedProperty.value;

    // Warn user about the process
    const confirmed = confirm(
      '🏠 PROPERTY COLLATERAL AGREEMENT\n\n' +
      `You are using your ENTIRE property as collateral:\n` +
      `• Property: ${selectedProperty.address}\n` +
      `• Total Value: ₦${(totalPropertyValue / 1000000).toFixed(1)}M\n` +
      `• All ${selectedProperty.tokenSupply} tokens will be locked\n\n` +
      `LOAN TERMS:\n` +
      `• Borrow up to 66% LTV (₦${(totalPropertyValue * 0.6667 / 1000000).toFixed(1)}M max)\n` +
      `• Interest: ${CONFIG.INTEREST_RATE}% APR (accrues daily)\n` +
      `• Repayment Period: ${CONFIG.LOAN_TERM_MONTHS} months\n` +
      `• Repay anytime before due date\n\n` +
      `💡 How It Works:\n` +
      `• Entire property is collateral (like a traditional mortgage)\n` +
      `• Repay principal + interest to unlock your property\n` +
      `• If liquidated: debt paid first, surplus returns to you\n\n` +
      '⚠️ This requires 2 wallet signatures:\n' +
      '1. Approve token spending\n' +
      '2. Deposit collateral\n\n' +
      'Click OK to continue.'
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      setProcessingStep('Step 1/2: Requesting token approval - Check your wallet!');

      const result = await depositCollateral(
        selectedProperty.tokenAddress!,
        allTokens,
        selectedProperty.propertyId,
        totalPropertyValue.toString()
      );

      setProcessingStep('Waiting for transaction confirmation...');
      // Wait for transaction to be confirmed on Hedera network
      // Mirror node needs time to index the transaction
      await new Promise(resolve => setTimeout(resolve, 3000));

      setProcessingStep('Fetching your loan details...');

      // Fetch loan details with retry logic (transaction might still be indexing)
      let details;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        details = await getLoanDetails(accountId);

        // Check if we got valid collateral data
        if (parseFloat(details.collateralAmount) > 0) {
          break;
        }

        // If no collateral yet, wait and retry
        if (retries < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        retries++;
      }

      setLoanDetails(details!);
      setMaxBorrowFromContract(details!.maxBorrow);

      setProcessingStep('');

      // Show appropriate message based on whether loan data was retrieved
      if (details && parseFloat(details.collateralAmount) > 0) {
        alert(`✅ Collateral deposited!\nTx: ${result.txHash}\n\nMax you can borrow: ₦${parseFloat(details.maxBorrow).toLocaleString()}`);
      } else {
        alert(`✅ Collateral deposited!\nTx: ${result.txHash}\n\n⏳ Note: Loan details are still indexing. Please refresh the page in a few seconds to see your borrowing limit.`);
      }

      setStep('borrow');
    } catch (error: any) {
      setProcessingStep('');
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount) return;

    // ⭐ maxBorrowFromContract is in NAIRA (matches property value units)
    const requestedAmountNaira = parseFloat(borrowAmount);
    const maxBorrowNaira = parseFloat(maxBorrowFromContract);

    if (requestedAmountNaira > maxBorrowNaira) {
      alert(`❌ Cannot borrow ₦${borrowAmount}\n\nMaximum you can borrow: ₦${maxBorrowNaira.toLocaleString()}\n\nThis is based on your collateral value and the ${CONFIG.MAX_LTV}% LTV ratio.`);
      return;
    }

    if (requestedAmountNaira <= 0) {
      alert('❌ Please enter a valid borrow amount greater than 0');
      return;
    }

    // Calculate fee breakdown
    const originationFee = requestedAmountNaira * (CONFIG.ORIGINATION_FEE / 100);
    const netAmountReceived = requestedAmountNaira - originationFee;
    const estimatedYearlyInterest = requestedAmountNaira * (CONFIG.INTEREST_RATE / 100);

    const confirmed = confirm(
      `💳 BORROW CONFIRMATION\n\n` +
      `Requested Amount: ₦${requestedAmountNaira.toLocaleString()}\n\n` +
      `Fee Breakdown:\n` +
      `• Origination Fee (${CONFIG.ORIGINATION_FEE}%): ₦${originationFee.toFixed(2)}\n` +
      `• Net Amount You'll Receive: ₦${netAmountReceived.toLocaleString()}\n\n` +
      `What You'll Owe:\n` +
      `• Principal: ₦${requestedAmountNaira.toLocaleString()}\n` +
      `• Interest (${CONFIG.INTEREST_RATE}% APR): ~₦${estimatedYearlyInterest.toLocaleString()}/year\n` +
      `• Due Date: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\n` +
      `⚠️ Important:\n` +
      `You receive ₦${netAmountReceived.toLocaleString()} but owe ₦${requestedAmountNaira.toLocaleString()} + interest\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      // ⭐ Contract expects amount in NAIRA (matching maxBorrow units), NOT kobo!
      // The contract handles heNGN transfer internally with proper units
      const amountNaira = Math.floor(requestedAmountNaira).toString();
      const result = await borrow(amountNaira);

      alert(
        `✅ Loan Disbursed Successfully!\n\n` +
        `Transaction: ${result.txHash}\n\n` +
        `Amount Borrowed: ₦${requestedAmountNaira.toLocaleString()}\n` +
        `Origination Fee: ₦${originationFee.toFixed(2)}\n` +
        `Net Received: ₦${netAmountReceived.toLocaleString()}\n\n` +
        `💡 Check your HashPack wallet for the heNGN tokens.\n` +
        `If you don't see them, you may need to associate the heNGN token first.`
      );
      window.location.href = '/dashboard';
    } catch (error: any) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Removed calculateMaxBorrow - now using entire property value from contract

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <p className="text-foreground font-medium mb-4">Wallet Not Connected</p>
            <Link href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-20"><div className="text-center">Loading...</div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Borrow heNGN</h1>
        <p className="text-muted-foreground mb-10">
          Lock your property tokens as collateral and borrow Naira stablecoins.
        </p>

        {/* heNGN Association */}
        <AssociateHeNGNButton />

        {/* Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex-1 text-center ${step === 'select' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'select' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>1</div>
            <p className="text-sm">Select</p>
          </div>
          <div className="flex-1 border-t border-border"></div>
          <div className={`flex-1 text-center ${step === 'deposit' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'deposit' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>2</div>
            <p className="text-sm">Deposit</p>
          </div>
          <div className="flex-1 border-t border-border"></div>
          <div className={`flex-1 text-center ${step === 'borrow' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'borrow' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>3</div>
            <p className="text-sm">Borrow</p>
          </div>
        </div>

        {/* Select Property */}
        {step === 'select' && (
          <div className="bg-card border rounded-lg p-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Select Property</h2>
              {loanDetails && parseFloat(loanDetails.collateralAmount) > 0 && (
                <InfoIcon tooltip={
                  <div className="text-xs space-y-1">
                    <p><strong>Active loan detected</strong></p>
                    <p>Only one property can be used as collateral at a time. Repay your current loan to use a different property.</p>
                  </div>
                } />
              )}
            </div>

            {properties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No verified properties yet</p>
                <Link href="/tokenize" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg">
                  Tokenize Property
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => {
                  const isCollateral = loanDetails &&
                    property.tokenAddress?.toLowerCase() === loanDetails.collateralToken.toLowerCase() &&
                    parseFloat(loanDetails.collateralAmount) > 0;

                  return (
                    <button
                      key={property.propertyId}
                      onClick={() => !isCollateral && handlePropertySelect(property)}
                      disabled={loanDetails && parseFloat(loanDetails.collateralAmount) > 0 && !isCollateral}
                      className={`w-full p-4 bg-background border rounded-lg transition text-left ${
                        isCollateral
                          ? 'border-primary bg-primary/5'
                          : loanDetails && parseFloat(loanDetails.collateralAmount) > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-primary cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{property.address}</p>
                          <p className="text-xs text-muted-foreground">{property.propertyId}</p>
                          {isCollateral && (
                            <p className="text-xs text-muted-foreground mt-1">Currently used as collateral</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">₦{(property.value / 1000000).toFixed(1)}M</p>
                          <p className="text-xs text-muted-foreground">{property.tokenSupply} tokens</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Deposit Collateral */}
        {step === 'deposit' && selectedProperty && (
          <div className="bg-card border rounded-lg p-8">
            <button onClick={() => setStep('select')} className="text-sm text-muted-foreground hover:text-foreground mb-4">
              ← Change Property
            </button>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Deposit Collateral</h2>
              <InfoIcon tooltip={
                <div className="text-xs space-y-2">
                  <p><strong>Loan Terms:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Max: 66% LTV</li>
                    <li>Rate: {CONFIG.INTEREST_RATE}% APR</li>
                    <li>Term: {CONFIG.LOAN_TERM_MONTHS} months</li>
                    <li>Repay anytime</li>
                  </ul>
                  <p className="pt-2 border-t border-border"><strong>Process:</strong></p>
                  <p>Requires 2 wallet signatures: (1) Approve (2) Deposit</p>
                </div>
              } />
            </div>

            {/* Property Summary */}
            <div className="bg-muted border border-border rounded-lg p-4 mb-6">
              <p className="text-sm font-medium mb-2">{selectedProperty.address}</p>
              <p className="text-xs text-muted-foreground mb-3">{selectedProperty.propertyId}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold">₦{(selectedProperty.value / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Borrow</p>
                  <p className="text-lg font-bold">₦{(selectedProperty.value * 0.6667 / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            </div>

            {processingStep && (
              <div className="mb-4 p-4 bg-muted border border-border rounded-lg">
                <p className="text-sm text-center">
                  {processingStep}
                  <br />
                  <span className="text-xs text-muted-foreground">Check your wallet for signature requests</span>
                </p>
              </div>
            )}

            <button
              onClick={handleDepositCollateral}
              disabled={processing}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Deposit ${selectedProperty.tokenSupply} Tokens`}
            </button>
          </div>
        )}

        {/* Borrow */}
        {step === 'borrow' && selectedProperty && (
          <div className="bg-card border rounded-lg p-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Borrow heNGN</h2>
              <InfoIcon tooltip={
                <div className="text-xs space-y-2">
                  <p><strong>Collateral:</strong> {selectedProperty.address}</p>
                  <p className="text-muted-foreground">{selectedProperty.propertyId}</p>
                </div>
              } />
            </div>

            {/* Loan Timeline - Only show if active loan */}
            {loanDetails && parseFloat(loanDetails.borrowedAmount) > 0 && parseFloat(loanDetails.dueDate) > 0 && (() => {
              const dueDate = new Date(parseInt(loanDetails.dueDate) * 1000);
              const daysRemaining = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysRemaining < 0;

              return (
                <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium mb-1">Loan Due Date</p>
                      <p className="text-lg font-bold">{dueDate.toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">{isOverdue ? 'Overdue' : 'Days Remaining'}</p>
                      <p className="text-2xl font-bold">{isOverdue ? Math.abs(daysRemaining) : daysRemaining}</p>
                    </div>
                  </div>
                  {isOverdue && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      Loan is overdue. Please repay immediately.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Manage Loan Actions */}
            {loanDetails && parseFloat(loanDetails.borrowedAmount) > 0 && (
              <div className="bg-muted border border-border rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Debt</h3>
                    <p className="text-2xl font-bold">
                      ₦{(parseFloat(loanDetails.totalDebt) / 100).toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href="/repay"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Repay
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  Principal: ₦{(parseFloat(loanDetails.borrowedAmount) / 100).toFixed(2)} • Interest: ₦{(parseFloat(loanDetails.accruedInterest) / 100).toFixed(2)}
                </div>
              </div>
            )}

            {/* Collateral Summary */}
            <div className="bg-muted border border-border rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-medium">Collateral Status</p>
                <InfoIcon tooltip={
                  <div className="text-xs space-y-2">
                    <p><strong>Health Factor:</strong> {(() => {
                      const hf = loanDetails?.healthFactor || '0';
                      const isInfinite = hf === '115792089237316195423570985008687907853269984665640564039457584007913129639935' || parseFloat(hf) > 1000000;
                      if (isInfinite) return '∞ (No Debt)';
                      return `${parseFloat(hf).toFixed(0)}%`;
                    })()}</p>
                    <p className="pt-2 border-t border-border">
                      <strong>Liquidation:</strong> If health drops below {CONFIG.LIQUIDATION_THRESHOLD}%, your property may be liquidated. Your equity will be returned.
                    </p>
                  </div>
                } />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Property Value</p>
                  <p className="text-lg font-bold">
                    {(() => {
                      const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                      if (maxBorrowNaira > 0) {
                        const actualPropertyValue = maxBorrowNaira * 1.5;
                        return `₦${(actualPropertyValue / 1000000).toFixed(1)}M`;
                      }
                      return `₦${(selectedProperty.value / 1000000).toFixed(1)}M`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your Equity</p>
                  <p className="text-lg font-bold">
                    {(() => {
                      const maxBorrowNaira = parseFloat(maxBorrowFromContract);
                      const actualPropertyValue = maxBorrowNaira > 0 ? maxBorrowNaira * 1.5 : selectedProperty.value;
                      const totalDebtNaira = parseFloat(loanDetails?.totalDebt || '0') / 100;
                      return `₦${((actualPropertyValue - totalDebtNaira) / 1000000).toFixed(2)}M`;
                    })()}
                  </p>
                </div>
              </div>

              {maxBorrowFromContract && parseFloat(maxBorrowFromContract) > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Available to Borrow</p>
                  <p className="text-xl font-bold">
                    ₦{(parseFloat(maxBorrowFromContract) / 1000000).toFixed(2)}M
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Borrow Amount (heNGN)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  placeholder="e.g., 1000000"
                  className="flex-1 px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => {
                    // ⭐ maxBorrow is in Naira, use directly
                    setBorrowAmount(maxBorrowFromContract);
                  }}
                  disabled={!maxBorrowFromContract || parseFloat(maxBorrowFromContract) <= 0}
                  className="px-4 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg font-medium hover:bg-primary/30 disabled:opacity-50"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter amount in Naira (₦). Max: ₦{parseFloat(maxBorrowFromContract).toLocaleString()} • Rate: {CONFIG.INTEREST_RATE}% APR
              </p>
            </div>

            {/* Fee Breakdown Display */}
            {borrowAmount && parseFloat(borrowAmount) > 0 && (
              <div className="bg-muted border border-border rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium">Fee Breakdown</h3>
                  <InfoIcon tooltip={
                    <div className="text-xs space-y-2">
                      <p><strong>Origination Fee:</strong> {CONFIG.ORIGINATION_FEE}% deducted from loan</p>
                      <p><strong>Interest:</strong> {CONFIG.INTEREST_RATE}% APR accrues daily</p>
                      <p><strong>Est. 12-month cost:</strong> ~{CONFIG.INTEREST_RATE}% of principal</p>
                    </div>
                  } />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested</span>
                    <span className="font-semibold">₦{parseFloat(borrowAmount).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee ({CONFIG.ORIGINATION_FEE}%)</span>
                    <span className="font-semibold">-₦{(parseFloat(borrowAmount) * (CONFIG.ORIGINATION_FEE / 100)).toFixed(2)}</span>
                  </div>

                  <div className="border-t border-border pt-2 mt-2"></div>

                  <div className="flex justify-between">
                    <span className="font-medium">You'll Receive</span>
                    <span className="font-bold text-lg">₦{(parseFloat(borrowAmount) * (1 - CONFIG.ORIGINATION_FEE / 100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleBorrow}
              disabled={!borrowAmount || parseFloat(borrowAmount) <= 0 || processing}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Borrow heNGN'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}