'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import useHashConnect from '@/hooks/useHashConnect';
import { CONFIG } from '@/constants';


const HashConnectButton = dynamic(
  () => import('@/components/hashConnectButton'),
  { ssr: false }
);

export default function Header() {
  const { accountId } = useHashConnect();
  const isAdmin = accountId === CONFIG.ADMIN_ACCOUNT_ID;

  // const handleConnect = async () => {
  //   setIsConnecting(true);
  //   try {
  //     await openHashPackModal();
  //     console.log('✅ Wallet connection modal opened');
  //   } catch (error: any) {
  //     console.error('Connection error:', error);
  //     alert(`Failed to connect: ${error.message}`);
  //   } finally {
  //     setIsConnecting(false);
  //   }
  // };

  // const handleDisconnect = () => {
  //   hashPackWallet.disconnect();
  // };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="TerraCRED"
              className="h-16 w-16 object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">TerraCRED</span>
              <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Property DeFi</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <Link href="/properties" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/borrow" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Borrow
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            )}
          </nav>

          {/* Connect Button */}
          <div className="flex items-center">
            <HashConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}