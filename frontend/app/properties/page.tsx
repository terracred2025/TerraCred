'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useHashConnect from '@/hooks/useHashConnect';
import { api } from '@/lib/api';
import type { Property } from '@/types';

export default function PropertiesPage() {
  const { isConnected, accountId } = useHashConnect();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');

  useEffect(() => {
    async function fetchProperties() {
      if (!isConnected || !accountId) {
        setLoading(false);
        return;
      }

      try {
        // ✅ Fetch only user's own properties
        const response = await api.getProperties(accountId);
        if (response.success) {
          setProperties(response.properties);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [isConnected, accountId]);

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

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card border border-border rounded-lg p-8">
            <p className="text-foreground font-medium mb-4">Wallet Not Connected</p>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view your properties.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
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
        <div className="text-center text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-4xl font-bold mb-4">My Properties</h1>
        <p className="text-muted-foreground">
          View and manage your tokenized properties
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-10">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          All ({properties.length})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'verified'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Verified ({properties.filter(p => p.status === 'verified').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Pending ({properties.filter(p => p.status === 'pending').length})
        </button>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {filter === 'all' 
              ? 'No properties found. Be the first to tokenize!' 
              : `No ${filter} properties found.`}
          </p>
          <Link
            href="/tokenize"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Tokenize Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <Link
              key={property.propertyId}
              href={`/properties/${property.propertyId}`}
              className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors group"
            >
              {/* Image Placeholder */}
              <div className="h-48 bg-muted flex items-center justify-center">
                <span className="text-6xl">🏠</span>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Status Badge */}
                <div className="mb-3">
                  {getStatusBadge(property.status)}
                </div>

                {/* Address */}
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {property.address}
                </h3>

                {/* Property ID */}
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                  {property.propertyId}
                </p>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-semibold">₦{(property.value / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tokens</span>
                    <span className="font-semibold">{property.tokenSupply}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per Token</span>
                    <span className="font-semibold">₦{(property.value / property.tokenSupply).toLocaleString()}</span>
                  </div>
                </div>

                {/* View Details */}
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* CTA at Bottom */}
      {filteredProperties.length > 0 && (
        <div className="mt-12 text-center">
          <Link
            href="/tokenize"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            + Tokenize Your Property
          </Link>
        </div>
      )}
    </div>
  );
}