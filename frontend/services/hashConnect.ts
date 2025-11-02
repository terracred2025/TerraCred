import type { HashConnect } from "hashconnect";
import { AccountId, LedgerId, ContractExecuteTransaction, ContractFunctionParameters, Hbar, AccountAllowanceApproveTransaction, TokenId } from "@hashgraph/sdk";

const env = "testnet";
const appMetadata = {
    name: "TerraCRED",
    description: "TerraCRED - Property DeFi Platform",
    icons: [typeof window !== 'undefined' ? window.location.origin + "/favicon.ico" : "/favicon.ico"],
    url: typeof window !== 'undefined' ? window.location.origin : "https://frontend-ila0wdhfe-hemjay07s-projects.vercel.app",
};

// Initialize HashConnect only on client side
let hc: HashConnect | null = null;
let hcInitPromise: Promise<void> | null = null;
let hcInstancePromise: Promise<HashConnect> | null = null;

const initializeHashConnect = async (): Promise<HashConnect> => {
    if (typeof window === 'undefined') {
        throw new Error("HashConnect can only be initialized in browser environment");
    }

    console.log("🔷 Initializing HashConnect...");
    console.log("🔷 Environment:", env);
    console.log("🔷 App metadata:", appMetadata);
    console.log("🔷 Current origin:", typeof window !== 'undefined' ? window.location.origin : 'N/A');

    // Import HashConnect
    const module = await import('hashconnect');
    const HashConnectClass = module.HashConnect;
    console.log("🔷 HashConnect module imported");

    // Get project ID from env or fallback
    // IMPORTANT: Trim to remove any trailing newlines or whitespace
    const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "fb29af584e8f72298b6386b0c3724234").trim();
    console.log("🔷 Using WalletConnect Project ID:", projectId);

    // Create instance
    const instance = new HashConnectClass(
        LedgerId.fromString(env),
        projectId,
        appMetadata,
        true
    );

    console.log("✅ HashConnect instance created", instance);

    // Initialize and wait for it to complete
    try {
        await instance.init();
        console.log("✅ HashConnect initialized successfully");
    } catch (initError: any) {
        console.error("❌ HashConnect initialization failed:", initError);
        console.error("❌ Error message:", initError?.message);
        throw initError;
    }

    hc = instance;
    return instance;
};

// Lazy initialization - only initialize when first requested
export const getHashConnectInstance = async (): Promise<HashConnect> => {
    if (typeof window === 'undefined') {
        throw new Error("HashConnect can only be used in browser environment");
    }

    // If already initialized, return the existing instance
    if (hc) {
        console.log("🔷 Returning existing HashConnect instance");
        return hc;
    }

    // If initialization is in progress, wait for it
    if (hcInstancePromise) {
        console.log("🔷 Waiting for ongoing HashConnect initialization...");
        return await hcInstancePromise;
    }

    // Start initialization
    console.log("🔷 Starting new HashConnect initialization...");
    hcInstancePromise = initializeHashConnect().catch((error) => {
        console.error("❌ HashConnect initialization failed permanently:", error);
        // Reset the promise so it can be retried
        hcInstancePromise = null;
        throw error;
    });

    return await hcInstancePromise;
};

export { hc, hcInitPromise };

export const getConnectedAccountIds = async () => {
    const instance = await getHashConnectInstance();
    return instance.connectedAccountIds;
};

export const getInitPromise = async (): Promise<void> => {
    if (!hcInstancePromise) {
        throw new Error("HashConnect not initialized. Make sure this is called on the client side.");
    }
    // Wait for the instance to be initialized
    await hcInstancePromise;
};

export const signTransaction = async (
    accountIdForSigning: string,
    transaction: any
) => {
    const instance = await getHashConnectInstance();
    await getInitPromise();

    const accountIds = await getConnectedAccountIds();
    if (!accountIds || accountIds.length === 0) {
        throw new Error("No connected accounts");
    }

    const isAccountIdForSigningPaired = accountIds.some(
        (id: AccountId) => id.toString() === accountIdForSigning.toString()
    );
    if (!isAccountIdForSigningPaired) {
        throw new Error(`Account ${accountIdForSigning} is not paired`);
    }

    const accountIdObj = AccountId.fromString(accountIdForSigning);
    const result = await instance.signTransaction(accountIdObj, transaction);
    return result;
};

export const executeTransaction = async (
    accountIdForSigning: string,
    transaction: any
) => {
    const instance = await getHashConnectInstance();
    await getInitPromise();

    const accountIds = await getConnectedAccountIds();
    if (!accountIds || accountIds.length === 0) {
        throw new Error("No connected accounts");
    }

    const isAccountIdForSigningPaired = accountIds.some(
        (id: AccountId) => id.toString() === accountIdForSigning.toString()
    );
    if (!isAccountIdForSigningPaired) {
        throw new Error(`Account ${accountIdForSigning} is not paired`);
    }

    const result = await instance.sendTransaction(AccountId.fromString(accountIdForSigning), transaction);
    return result;
};

export const signMessages = async (
    accountIdForSigning: string,
    message: string
) => {
    const instance = await getHashConnectInstance();
    await getInitPromise();

    const accountIds = await getConnectedAccountIds();
    if (!accountIds || accountIds.length === 0) {
        throw new Error("No connected accounts");
    }

    const isAccountIdForSigningPaired = accountIds.some(
        (id: AccountId) => id.toString() === accountIdForSigning.toString()
    );
    if (!isAccountIdForSigningPaired) {
        throw new Error(`Account ${accountIdForSigning} is not paired`);
    }

    const result = await instance.signMessages(AccountId.fromString(accountIdForSigning), message);
    return result;
};

export const executeContractFunction = async (
    accountIdForSigning: string,
    contractId: string,
    functionName: string,
    functionParameters: any,
    gas: number = 500000
) => {
    const instance = await getHashConnectInstance();
    await getInitPromise();

    const accountIds = await getConnectedAccountIds();
    if (!accountIds || accountIds.length === 0) {
        throw new Error("No connected accounts");
    }

    const isAccountIdForSigningPaired = accountIds.some(
        (id: AccountId) => id.toString() === accountIdForSigning.toString()
    );
    if (!isAccountIdForSigningPaired) {
        throw new Error(`Account ${accountIdForSigning} is not paired`);
    }

    try {
        // Try different approaches to get the signer
        let signer;

        console.log('🔍 DIAGNOSTIC: HashConnect instance:', instance);
        console.log('🔍 DIAGNOSTIC: Instance constructor name:', instance.constructor.name);
        console.log('🔍 DIAGNOSTIC: Available instance properties:', Object.keys(instance));
        console.log('🔍 DIAGNOSTIC: Available instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));

        // Approach 1: Try to get signer directly (some versions might support this)
        console.log('🔍 DIAGNOSTIC: Checking if getSigner method exists...');
        console.log('🔍 DIAGNOSTIC: getSigner type:', typeof (instance as any).getSigner);

        if (typeof (instance as any).getSigner === 'function') {
            try {
                console.log('🔍 DIAGNOSTIC: Attempting direct getSigner with account:', accountIdForSigning);
                const accountIdObj = AccountId.fromString(accountIdForSigning);
                signer = (instance as any).getSigner(accountIdObj);
                console.log('🔍 DIAGNOSTIC: Direct getSigner success, signer:', signer);
                console.log('🔍 DIAGNOSTIC: Signer type:', typeof signer);
                console.log('🔍 DIAGNOSTIC: Signer constructor:', signer?.constructor?.name);
                console.log('🔍 DIAGNOSTIC: Signer methods:', signer ? Object.getOwnPropertyNames(Object.getPrototypeOf(signer)) : 'No signer');
            } catch (err: any) {
                console.error('🚨 DIAGNOSTIC: Direct getSigner failed:', err);
                console.error('🚨 DIAGNOSTIC: getSigner error type:', err?.constructor?.name);
                console.error('🚨 DIAGNOSTIC: getSigner error message:', err?.message);
            }
        } else {
            console.log('🔍 DIAGNOSTIC: getSigner method not available or not a function');
        }

        // Approach 2: Try with provider if direct signer failed
        if (!signer) {
            try {
                console.log('🔍 DIAGNOSTIC: Attempting provider approach...');

                // Note: These properties may not exist on HashConnect
                // This is diagnostic code that may not work with current HashConnect version
                const possibleTopics: any[] = [];

                console.log('🔍 DIAGNOSTIC: Possible topics:', possibleTopics);
                const topic = possibleTopics.find(t => t && typeof t === 'string');
                console.log('🔍 DIAGNOSTIC: Selected topic:', topic);

                // This section is commented out as it uses non-existent properties
                console.log('⚠️ DIAGNOSTIC: Provider approach skipped - requires updated HashConnect implementation');
            } catch (err: any) {
                console.error('🚨 DIAGNOSTIC: Provider approach failed:', err);
                console.error('🚨 DIAGNOSTIC: Provider error type:', err?.constructor?.name);
                console.error('🚨 DIAGNOSTIC: Provider error message:', err?.message);
            }
        }

        if (!signer) {
            throw new Error('Could not create signer. Please disconnect and reconnect your wallet.');
        }

        // Build the contract parameters based on function name
        let contractParams = new ContractFunctionParameters();

        console.log('🔍 DIAGNOSTIC: Function parameters received:', JSON.stringify(functionParameters, null, 2));
        console.log('🔍 DIAGNOSTIC: Function name:', functionName);
        console.log('🔍 DIAGNOSTIC: Contract ID:', contractId);
        console.log('🔍 DIAGNOSTIC: Gas limit:', gas);

        if (functionName === 'createNft') {
            console.log('🔍 DIAGNOSTIC: Building createNft transaction...');

            // Validate required parameters
            if (!functionParameters.name || !functionParameters.symbol || !functionParameters.memo) {
                throw new Error('Missing required parameters for createNft');
            }

            console.log('🔍 DIAGNOSTIC: Adding createNft parameters...');
            try {
                contractParams
                    .addString(functionParameters.name)
                    .addString(functionParameters.symbol)
                    .addString(functionParameters.memo)  // Fixed: description -> memo
                    .addInt64(functionParameters.maxSupply)
                    .addUint32(functionParameters.autoRenewPeriod);
                console.log('🔍 DIAGNOSTIC: createNft parameters added successfully');
            } catch (paramError: any) {
                console.error('🚨 DIAGNOSTIC: Error adding createNft parameters:', paramError);
                throw paramError;
            }

        } else if (functionName === 'mintNft') {
            console.log('🔍 DIAGNOSTIC: Building mintNft transaction...');

            // Comprehensive parameter validation
            console.log('🔍 DIAGNOSTIC: Validating mintNft parameters...');

            if (!functionParameters.tokenAddress) {
                throw new Error('Missing required parameter: tokenAddress');
            }
            if (!functionParameters.metadata) {
                throw new Error('Missing required parameter: metadata');
            }
            // Metadata can be string or array of strings
            if (typeof functionParameters.metadata !== 'string' && !Array.isArray(functionParameters.metadata)) {
                throw new Error('Metadata must be a string or array of strings');
            }
            if (Array.isArray(functionParameters.metadata) && functionParameters.metadata.length === 0) {
                throw new Error('Metadata array cannot be empty');
            }
            if (typeof functionParameters.metadata === 'string' && functionParameters.metadata.length === 0) {
                throw new Error('Metadata string cannot be empty');
            }
            if (functionParameters.availableDates && !Array.isArray(functionParameters.availableDates)) {
                throw new Error('availableDates must be an array');
            }

            console.log('🔍 DIAGNOSTIC: Parameter validation passed');

            // TEST MODES: Different testing approaches to isolate the issue
            const useMinimalTest = functionParameters.minimal === true;
            const useMockToken = functionParameters.mockToken === true;

            if (useMinimalTest) {
                console.log('🧪 MINIMAL TEST MODE: Using minimal parameters to isolate issue');

                // Use the simplest possible values
                const minimalParams = new ContractFunctionParameters();
                console.log('🧪 MINIMAL TEST: Adding minimal address...');
                minimalParams.addAddress("0.0.123456"); // Simple test address

                console.log('🧪 MINIMAL TEST: Adding minimal bytes...');
                const testBytes = new TextEncoder().encode("test");
                minimalParams.addBytesArray([testBytes]);

                console.log('🧪 MINIMAL TEST: Adding minimal uint256 array...');
                minimalParams.addUint256Array([1, 2, 3]);

                console.log('🧪 MINIMAL TEST: Minimal parameters built, proceeding with transaction...');
                contractParams = minimalParams;

                // Skip the complex parameter building and jump to transaction construction
                console.log('🧪 MINIMAL TEST: Skipping to transaction construction with minimal params');

            } else if (useMockToken) {
                console.log('🎭 MOCK TOKEN TEST MODE: Using known-good mock token address');

                // Use a well-formed mock token address instead of depending on first transaction
                const mockTokenAddress = "0.0.1234567"; // Mock but properly formatted token address
                console.log('🎭 MOCK TOKEN: Using mock token address:', mockTokenAddress);

                // Create simple but realistic metadata
                const mockMetadata = JSON.stringify({
                    name: "Test Property",
                    description: "Mock property for testing",
                    price: 100,
                    testMode: true
                });

                console.log('🎭 MOCK TOKEN: Using mock metadata:', mockMetadata);
                console.log('🎭 MOCK TOKEN: Mock metadata length:', mockMetadata.length);

                // Use minimal available dates
                const mockDates = [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 86400]; // Today and tomorrow in seconds

                try {
                    console.log('🎭 MOCK TOKEN: Building parameters with mock data...');

                    // Encode mock metadata using browser-compatible method
                    const mockMetadataBytes = new TextEncoder().encode(mockMetadata);
                    console.log('🎭 MOCK TOKEN: Mock metadata encoded, bytes length:', mockMetadataBytes.length);

                    // Build parameters with mock data
                    contractParams
                        .addAddress(mockTokenAddress)
                        .addBytesArray([mockMetadataBytes])
                        .addUint256Array(mockDates);

                    console.log('🎭 MOCK TOKEN: Mock parameters built successfully');
                } catch (mockError: any) {
                    console.error('🚨 MOCK TOKEN: Error building mock parameters:', mockError);
                    throw new Error(`Mock parameter building failed: ${mockError.message}`);
                }

            } else {
                // Normal parameter processing
                console.log('🔍 DIAGNOSTIC: Using normal parameter processing');

                // Ensure token address is properly formatted
                let tokenAddress = functionParameters.tokenAddress;
                console.log('🔍 DIAGNOSTIC: Original token address:', tokenAddress);
                console.log('🔍 DIAGNOSTIC: Token address type:', typeof tokenAddress);

                if (typeof tokenAddress === 'string' && !tokenAddress.startsWith('0x')) {
                console.log('🔍 DIAGNOSTIC: Token address not in 0x format, using as-is');
            }

            console.log('🔍 DIAGNOSTIC: Using token address for mint:', tokenAddress);
            console.log('🔍 DIAGNOSTIC: Metadata type:', typeof functionParameters.metadata);
            console.log('🔍 DIAGNOSTIC: Metadata length:', functionParameters.metadata?.length);
            console.log('🔍 DIAGNOSTIC: Available dates:', functionParameters.availableDates);
            console.log('🔍 DIAGNOSTIC: Available dates type:', typeof functionParameters.availableDates);

            // Handle metadata array - convert each string to bytes
            let metadataBytes;
            console.log('🔍 DIAGNOSTIC: Processing metadata array...');
            console.log('🔍 DIAGNOSTIC: functionParameters.metadata:', functionParameters.metadata);
            console.log('🔍 DIAGNOSTIC: metadata type:', typeof functionParameters.metadata);
            console.log('🔍 DIAGNOSTIC: metadata is array:', Array.isArray(functionParameters.metadata));

            try {
                if (Array.isArray(functionParameters.metadata)) {
                    // Metadata is array of strings - convert each to bytes
                    console.log('🔍 DIAGNOSTIC: Converting metadata array to bytes array...');
                    const encoder = new TextEncoder();
                    metadataBytes = functionParameters.metadata.map((item: string) => encoder.encode(item));
                    console.log('🔍 DIAGNOSTIC: Metadata array converted, length:', metadataBytes.length);
                    console.log('🔍 DIAGNOSTIC: First item type:', metadataBytes[0]?.constructor?.name);
                } else {
                    // Fallback: single string
                    console.log('🔍 DIAGNOSTIC: Converting single metadata string to bytes...');
                    const encoder = new TextEncoder();
                    metadataBytes = [encoder.encode(functionParameters.metadata as string)];
                    console.log('🔍 DIAGNOSTIC: Single metadata converted to array');
                }
            } catch (textEncoderError) {
                console.error('🚨 DIAGNOSTIC: TextEncoder failed:', textEncoderError);

                try {
                    // Approach 2: Convert TextEncoder result to Buffer if needed
                    console.log('🔍 DIAGNOSTIC: Trying TextEncoder + Buffer conversion...');
                    const encoder = new TextEncoder();
                    const uint8Array = encoder.encode(functionParameters.metadata);
                    metadataBytes = Buffer.from(uint8Array);
                    console.log('🔍 DIAGNOSTIC: TextEncoder + Buffer conversion success');
                } catch (bufferConversionError) {
                    console.error('🚨 DIAGNOSTIC: TextEncoder + Buffer conversion failed:', bufferConversionError);

                    try {
                        // Approach 3: Fallback to manual byte conversion
                        console.log('🔍 DIAGNOSTIC: Falling back to manual byte conversion...');
                        const bytes = [];
                        for (let i = 0; i < functionParameters.metadata.length; i++) {
                            bytes.push(functionParameters.metadata.charCodeAt(i));
                        }
                        metadataBytes = new Uint8Array(bytes);
                        console.log('🔍 DIAGNOSTIC: Manual byte conversion success');
                    } catch (manualError) {
                        console.error('🚨 DIAGNOSTIC: All byte encoding methods failed:', manualError);
                        throw new Error(`All metadata encoding methods failed: ${(manualError as Error).message}`);
                    }
                }
            }

            console.log('🔍 DIAGNOSTIC: Final metadata bytes:', metadataBytes);
            console.log('🔍 DIAGNOSTIC: Final metadata bytes type:', metadataBytes.constructor.name);
            console.log('🔍 DIAGNOSTIC: Final metadata bytes length:', metadataBytes.length);

            try {
                console.log('🔍 DIAGNOSTIC: Adding mintNft parameters...');

                console.log('🔍 DIAGNOSTIC: Adding address parameter...');
                contractParams.addAddress(tokenAddress);
                console.log('🔍 DIAGNOSTIC: Address parameter added successfully');

                console.log('🔍 DIAGNOSTIC: Adding bytes array parameter...');
                // metadataBytes should now be an array of Uint8Arrays
                try {
                    console.log('🔍 DIAGNOSTIC: metadataBytes is array:', Array.isArray(metadataBytes));
                    console.log('🔍 DIAGNOSTIC: metadataBytes length:', metadataBytes.length);
                    console.log('🔍 DIAGNOSTIC: First item type:', metadataBytes[0]?.constructor?.name);

                    // metadataBytes is already Uint8Array[] - exactly what the contract expects
                    contractParams.addBytesArray(metadataBytes);
                    console.log('🔍 DIAGNOSTIC: Bytes array parameter added directly');
                } catch (bytesError) {
                    console.log('🔍 DIAGNOSTIC: Direct bytes array failed:', bytesError);
                    console.log('🔍 DIAGNOSTIC: Trying fallback...');
                    const encoder = new TextEncoder();
                    const fallbackBytes = encoder.encode(JSON.stringify(functionParameters.metadata));
                    contractParams.addBytesArray([fallbackBytes]);
                    console.log('🔍 DIAGNOSTIC: Bytes array parameter added with fallback');
                }

                console.log('🔍 DIAGNOSTIC: Adding uint256 array parameter...');
                const availableDates = functionParameters.availableDates || [];
                console.log('🔍 DIAGNOSTIC: Available dates to add:', availableDates);
                contractParams.addUint256Array(availableDates);
                console.log('🔍 DIAGNOSTIC: Uint256 array parameter added successfully');

                console.log('🔍 DIAGNOSTIC: All mintNft parameters added successfully');
                } catch (paramError: any) {
                    console.error('🚨 DIAGNOSTIC: Error adding mintNft parameters:', paramError);
                    console.error('🚨 DIAGNOSTIC: Parameter error message:', paramError.message);
                    console.error('🚨 DIAGNOSTIC: Parameter error stack:', paramError.stack);
                    console.error('🚨 DIAGNOSTIC: Failed with token address:', tokenAddress);
                    console.error('🚨 DIAGNOSTIC: Failed with metadata bytes:', metadataBytes);
                    console.error('🚨 DIAGNOSTIC: Failed with available dates:', functionParameters.availableDates);
                    throw new Error(`Parameter addition failed: ${paramError.message}`);
                }
            } // End of normal parameter processing

        } else if (functionName === 'updateAvailability') {
            console.log('🔍 DIAGNOSTIC: Building updateAvailability transaction...');
            contractParams
                .addAddress(functionParameters.tokenAddress)
                .addInt64(functionParameters.serialNumber)
                .addUint256(functionParameters.date)
                .addBool(functionParameters.isBooked);

        } else if (functionName === 'transferNft') {
            console.log('🔍 DIAGNOSTIC: Building transferNft transaction...');
            contractParams
                .addAddress(functionParameters.tokenAddress)
                .addAddress(functionParameters.newOwnerAddress)
                .addInt64(functionParameters.serialNumber);

        } else if (functionName === 'depositCollateral') {
            console.log('🔍 DIAGNOSTIC: Building depositCollateral transaction...');

            // Validate required parameters
            if (!functionParameters.tokenAddress) {
                throw new Error('Missing required parameter: tokenAddress');
            }
            if (!functionParameters.amount) {
                throw new Error('Missing required parameter: amount');
            }
            if (!functionParameters.propertyId) {
                throw new Error('Missing required parameter: propertyId');
            }
            if (!functionParameters.propertyValue) {
                throw new Error('Missing required parameter: propertyValue');
            }

            console.log('🔍 DIAGNOSTIC: Adding depositCollateral parameters...');
            contractParams
                .addAddress(functionParameters.tokenAddress)
                .addUint256(functionParameters.amount)
                .addString(functionParameters.propertyId)
                .addUint256(functionParameters.propertyValue);
            console.log('🔍 DIAGNOSTIC: depositCollateral parameters added successfully');

        } else if (functionName === 'borrow') {
            console.log('🔍 DIAGNOSTIC: Building borrow transaction...');

            if (!functionParameters.amount) {
                throw new Error('Missing required parameter: amount');
            }

            console.log('🔍 DIAGNOSTIC: Adding borrow parameters...');
            contractParams.addUint256(functionParameters.amount);
            console.log('🔍 DIAGNOSTIC: borrow parameters added successfully');

        } else if (functionName === 'repay') {
            console.log('🔍 DIAGNOSTIC: Building repay transaction...');

            if (!functionParameters.amount) {
                throw new Error('Missing required parameter: amount');
            }

            console.log('🔍 DIAGNOSTIC: Adding repay parameters...');
            contractParams.addUint256(functionParameters.amount);
            console.log('🔍 DIAGNOSTIC: repay parameters added successfully');

        } else if (functionName === 'addSupportedToken') {
            console.log('🔍 DIAGNOSTIC: Building addSupportedToken transaction...');

            if (!functionParameters.token) {
                throw new Error('Missing required parameter: token');
            }

            console.log('🔍 DIAGNOSTIC: Adding addSupportedToken parameters...');
            contractParams.addAddress(functionParameters.token);
            console.log('🔍 DIAGNOSTIC: addSupportedToken parameters added successfully');

        } else if (functionName === 'approve') {
            console.log('🔍 DIAGNOSTIC: Building ERC20 approve transaction...');

            if (!functionParameters.spender) {
                throw new Error('Missing required parameter: spender');
            }
            if (!functionParameters.amount) {
                throw new Error('Missing required parameter: amount');
            }

            console.log('🔍 DIAGNOSTIC: Adding approve parameters...');
            console.log('🔍 DIAGNOSTIC: Spender:', functionParameters.spender);
            console.log('🔍 DIAGNOSTIC: Amount:', functionParameters.amount);
            contractParams
                .addAddress(functionParameters.spender)
                .addUint256(functionParameters.amount);
            console.log('🔍 DIAGNOSTIC: approve parameters added successfully');

        } else if (functionName === 'withdrawCollateral') {
            console.log('🔍 DIAGNOSTIC: Building withdrawCollateral transaction...');

            if (!functionParameters.amount) {
                throw new Error('Missing required parameter: amount');
            }

            console.log('🔍 DIAGNOSTIC: Adding withdrawCollateral parameters...');
            contractParams.addUint256(functionParameters.amount);
            console.log('🔍 DIAGNOSTIC: withdrawCollateral parameters added successfully');

        } else {
            throw new Error(`Unknown function name: ${functionName}`);
        }

        console.log('🔍 DIAGNOSTIC: Contract parameters built successfully');
        console.log('🔍 DIAGNOSTIC: Contract parameters object:', contractParams);

        console.log('🔍 DIAGNOSTIC: Starting transaction construction...');
        console.log('🔍 DIAGNOSTIC: Building with:', { contractId, functionName, gas });

        let transaction;
        try {
            // Create the transaction step by step to ensure proper construction
            console.log('🔍 DIAGNOSTIC: Creating ContractExecuteTransaction...');
            transaction = new ContractExecuteTransaction();
            console.log('🔍 DIAGNOSTIC: ContractExecuteTransaction created');

            console.log('🔍 DIAGNOSTIC: Setting contract ID...');
            transaction = transaction.setContractId(contractId);
            console.log('🔍 DIAGNOSTIC: Contract ID set');

            console.log('🔍 DIAGNOSTIC: Setting gas...');
            transaction = transaction.setGas(gas);
            console.log('🔍 DIAGNOSTIC: Gas set');

            console.log('🔍 DIAGNOSTIC: Setting function and parameters...');
            transaction = transaction.setFunction(functionName, contractParams);
            console.log('🔍 DIAGNOSTIC: Function and parameters set');

            // Add payable amount for createNft function (token creation requires fee)
            if (functionName === 'createNft') {
                console.log('🔍 DIAGNOSTIC: Setting payable amount for createNft...');
                transaction = transaction.setPayableAmount(new Hbar(20)); // 20 HBAR for token creation
                console.log('🔍 DIAGNOSTIC: Payable amount set for createNft');
            }

            console.log('🔍 DIAGNOSTIC: Setting max transaction fee...');
            transaction = transaction.setMaxTransactionFee(new Hbar(2));
            console.log('🔍 DIAGNOSTIC: Max transaction fee set');

            console.log('🔍 DIAGNOSTIC: Transaction construction completed successfully');
        } catch (constructionError: any) {
            console.error('🚨 DIAGNOSTIC: Error during transaction construction:', constructionError);
            console.error('🚨 DIAGNOSTIC: Construction error stack:', constructionError.stack);
            throw new Error(`Transaction construction failed: ${constructionError.message}`);
        }

        let frozenTransaction;
        try {
            console.log('🔍 DIAGNOSTIC: Transaction built, now freezing with signer...');
            console.log('🔍 DIAGNOSTIC: Signer object:', signer);
            console.log('🔍 DIAGNOSTIC: Signer type:', typeof signer);
            console.log('🔍 DIAGNOSTIC: Signer constructor:', signer?.constructor?.name);

            // Check if signer has the methods we need
            if (signer) {
                const signerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(signer));
                console.log('🔍 DIAGNOSTIC: Signer prototype methods:', signerMethods);

                // Also check for methods directly on the object
                const signerOwnMethods = Object.getOwnPropertyNames(signer);
                console.log('🔍 DIAGNOSTIC: Signer own properties:', signerOwnMethods);
            }

            // Check if the transaction has freezeWithSigner method
            console.log('🔍 DIAGNOSTIC: Transaction object:', transaction);
            console.log('🔍 DIAGNOSTIC: Transaction type:', typeof transaction);
            console.log('🔍 DIAGNOSTIC: Transaction constructor:', transaction?.constructor?.name);
            console.log('🔍 DIAGNOSTIC: freezeWithSigner method type:', typeof transaction.freezeWithSigner);

            if (typeof transaction.freezeWithSigner !== 'function') {
                throw new Error('Transaction does not have freezeWithSigner method');
            }

            // Freeze the transaction with signer
            console.log('🔍 DIAGNOSTIC: Calling freezeWithSigner...');
            frozenTransaction = await transaction.freezeWithSigner(signer);
            console.log('🔍 DIAGNOSTIC: Transaction frozen successfully');
            console.log('🔍 DIAGNOSTIC: Frozen transaction type:', typeof frozenTransaction);
            console.log('🔍 DIAGNOSTIC: Frozen transaction constructor:', frozenTransaction?.constructor?.name);

        } catch (freezeError: any) {
            console.error('🚨 DIAGNOSTIC: Error during transaction freezing:', freezeError);
            console.error('🚨 DIAGNOSTIC: Freeze error type:', freezeError?.constructor?.name);
            console.error('🚨 DIAGNOSTIC: Freeze error message:', freezeError?.message);
            console.error('🚨 DIAGNOSTIC: Freeze error stack:', freezeError?.stack);
            throw new Error(`Transaction freezing failed: ${freezeError.message}`);
        }

        let response;
        try {
            console.log('🔍 DIAGNOSTIC: Transaction frozen, now executing with HashConnect signer...');

            // Check if frozen transaction has executeWithSigner method
            console.log('🔍 DIAGNOSTIC: Frozen transaction methods check...');
            console.log('🔍 DIAGNOSTIC: executeWithSigner method type:', typeof frozenTransaction.executeWithSigner);

            if (typeof frozenTransaction.executeWithSigner !== 'function') {
                throw new Error('Frozen transaction does not have executeWithSigner method');
            }

            // Execute with signer (this will prompt wallet for signature)
            console.log('🔍 DIAGNOSTIC: Calling executeWithSigner...');
            response = await frozenTransaction.executeWithSigner(signer);
            console.log('🔍 DIAGNOSTIC: Transaction execution completed');
            console.log('🔍 DIAGNOSTIC: Transaction response:', response);
            console.log('🔍 DIAGNOSTIC: Response type:', typeof response);
            console.log('🔍 DIAGNOSTIC: Response constructor:', response?.constructor?.name);

        } catch (executionError: any) {
            console.error('🚨 DIAGNOSTIC: Error during transaction execution:', executionError);
            console.error('🚨 DIAGNOSTIC: Execution error type:', executionError?.constructor?.name);
            console.error('🚨 DIAGNOSTIC: Execution error message:', executionError?.message);
            console.error('🚨 DIAGNOSTIC: Execution error stack:', executionError?.stack);

            // Check for specific error patterns
            if (executionError.message && executionError.message.includes('Proposal expired')) {
                throw new Error('Transaction approval timed out. Please try again and approve the transaction in your wallet more quickly.\n\n' +
                    'If this persists:\n' +
                    '1. Reconnect your wallet\n' +
                    '2. Make sure your wallet is unlocked\n' +
                    '3. Try refreshing the page');
            }

            if (executionError.message && executionError.message.includes('body.data was not set in the protobuf')) {
                console.error('🚨 DIAGNOSTIC: FOUND THE PROTOBUF ERROR!');
                console.error('🚨 DIAGNOSTIC: This error occurred during executeWithSigner()');
                console.error('🚨 DIAGNOSTIC: Frozen transaction state:', frozenTransaction);
            }

            if (executionError.message && executionError.message.includes('is not a function')) {
                console.error('🚨 DIAGNOSTIC: FOUND FUNCTION CALL ERROR!');
                console.error('🚨 DIAGNOSTIC: This is likely a method invocation issue');
                console.error('🚨 DIAGNOSTIC: Signer object at time of error:', signer);
                console.error('🚨 DIAGNOSTIC: Frozen transaction at time of error:', frozenTransaction);
            }

            throw new Error(`Transaction execution failed: ${executionError.message}`);
        }

        let receipt;
        try {
            console.log('🔍 DIAGNOSTIC: Getting transaction receipt...');

            // Check if response has getReceiptWithSigner method
            console.log('🔍 DIAGNOSTIC: Response methods check...');
            console.log('🔍 DIAGNOSTIC: getReceiptWithSigner method type:', typeof response.getReceiptWithSigner);

            if (typeof (response as any).getReceiptWithSigner !== 'function') {
                console.log('🔍 DIAGNOSTIC: getReceiptWithSigner not available, trying getReceipt...');

                if (typeof (response as any).getReceipt === 'function') {
                    receipt = await (response as any).getReceipt();
                    console.log('🔍 DIAGNOSTIC: Receipt obtained via getReceipt');
                } else {
                    console.log('🔍 DIAGNOSTIC: No receipt methods available, skipping receipt');
                    receipt = null;
                }
            } else {
                // Get receipt with signer
                console.log('🔍 DIAGNOSTIC: Calling getReceiptWithSigner...');
                receipt = await (response as any).getReceiptWithSigner(signer);
                console.log('🔍 DIAGNOSTIC: Transaction receipt obtained via getReceiptWithSigner');
            }

            console.log('🔍 DIAGNOSTIC: Transaction receipt:', receipt);
            console.log('🔍 DIAGNOSTIC: Receipt type:', typeof receipt);
            console.log('🔍 DIAGNOSTIC: Receipt constructor:', receipt?.constructor?.name);

            // Check receipt status if available
            if (receipt && (receipt as any).status) {
                const statusString = (receipt as any).status.toString();
                console.log('🔍 DIAGNOSTIC: Receipt status:', statusString);

                if (statusString.includes('CONTRACT_REVERT_EXECUTED') ||
                    statusString.includes('FAIL') ||
                    statusString.includes('REVERT')) {
                    throw new Error(`Contract execution failed: ${statusString}`);
                }
            }

        } catch (receiptError: any) {
            console.error('🚨 DIAGNOSTIC: Error getting receipt:', receiptError);
            console.error('🚨 DIAGNOSTIC: Receipt error type:', receiptError?.constructor?.name);
            console.error('🚨 DIAGNOSTIC: Receipt error message:', receiptError?.message);
            console.error('🚨 DIAGNOSTIC: Receipt error stack:', receiptError?.stack);

            // Check for contract revert errors - these should be thrown, not suppressed
            if (receiptError.message && (
                receiptError.message.includes('CONTRACT_REVERT_EXECUTED') ||
                receiptError.message.includes('StatusError')
            )) {
                console.error('🚨 DIAGNOSTIC: CONTRACT REVERT DETECTED! Throwing error...');
                throw new Error('Contract execution reverted. This usually means:\n' +
                    '1. Token not approved for the lending pool\n' +
                    '2. Insufficient token balance\n' +
                    '3. Token not associated with your account\n' +
                    '4. Contract validation failed\n\n' +
                    `Original error: ${receiptError.message}`);
            }

            // Check for specific error patterns
            if (receiptError.message && receiptError.message.includes('body.data was not set in the protobuf')) {
                console.error('🚨 DIAGNOSTIC: FOUND THE PROTOBUF ERROR IN RECEIPT!');
                console.error('🚨 DIAGNOSTIC: This error occurred during getReceiptWithSigner()');
                console.error('🚨 DIAGNOSTIC: This is a known Hedera SDK bug - treating as non-fatal');

                // ⭐ FIX: Don't fail the transaction due to receipt error
                // The transaction was likely sent successfully, we just can't get the receipt
                const txId = (response as any).transactionId?.toString() || 'unknown';
                console.warn('⚠️ Transaction sent but receipt unavailable. Transaction ID:', txId);

                // Continue without receipt - the transaction was sent
                receipt = null;
            } else if (receiptError.message && receiptError.message.includes('is not a function')) {
                console.error('🚨 DIAGNOSTIC: FOUND FUNCTION CALL ERROR IN RECEIPT!');
                console.error('🚨 DIAGNOSTIC: Response object at time of error:', response);

                // Non-fatal - continue without receipt
                receipt = null;
            } else {
                // For other errors, rethrow them - don't suppress
                throw receiptError;
            }
        }

        console.log('🔍 DIAGNOSTIC: Transaction completed successfully!');

        return {
            success: true,
            response,
            receipt,
            transactionId: (response as any).transactionId ? (response as any).transactionId.toString() : 'unknown',
            contractFunctionResult: (receipt as any)?.contractFunctionResult || null
        };

    } catch (error: any) {
        console.error('🚨 DIAGNOSTIC: Contract execution completely failed:', error);
        console.error('🚨 DIAGNOSTIC: Error message:', error.message);
        console.error('🚨 DIAGNOSTIC: Error stack:', error.stack);

        // If signer pattern failed, try the direct sendTransaction approach
        if (error.message && (error.message.includes('body.data was not set in the protobuf') ||
            error.message.includes('Transaction execution failed') ||
            error.message.includes('Transaction freezing failed'))) {

            console.log('🔄 DIAGNOSTIC: Signer pattern failed, trying direct sendTransaction approach...');
            return await executeContractFunctionDirect(accountIdForSigning, contractId, functionName, functionParameters, gas);
        }

        throw error;
    }
};

// Alternative direct sendTransaction approach
export const executeContractFunctionDirect = async (
    _accountIdForSigning: string,
    _contractId: string,
    _functionName: string,
    _functionParameters: any,
    _gas: number = 500000
) => {
    console.log('🔄 DIAGNOSTIC: Starting direct sendTransaction approach...');
    console.log('⚠️ DIAGNOSTIC: This fallback is not fully implemented');

    // Note: sendTransaction expects a proper Transaction object from @hashgraph/sdk
    // Not a plain object. This would require reconstructing the transaction.
    // For now, we'll just throw an error indicating this approach is not implemented.

    throw new Error('Direct sendTransaction fallback not fully implemented. Main signer approach should work.');
};

// Function to associate token with user account
export const associateToken = async (accountId: string, tokenAddress: string) => {
    try {
        console.log('🔗 DIAGNOSTIC: Starting token association...');
        console.log('🔗 DIAGNOSTIC: Account ID:', accountId);
        console.log('🔗 DIAGNOSTIC: Token Address:', tokenAddress);

        console.log('⚠️ DIAGNOSTIC: Token association not yet implemented');
        console.log('This would require a different approach with HashConnect');

        throw new Error('Token association not yet implemented. Please associate tokens manually in HashPack wallet.');

    } catch (error) {
        console.error('🔗 DIAGNOSTIC: Token association failed:', error);
        throw error;
    }
};

// Approve token spending for a contract (spender)
export const approveToken = async (
    accountId: string,
    tokenId: string,
    spenderContractId: string,
    amount: string
) => {
    try {
        console.log('✅ DIAGNOSTIC: Starting token approval...');
        console.log('✅ DIAGNOSTIC: Account ID:', accountId);
        console.log('✅ DIAGNOSTIC: Token ID:', tokenId);
        console.log('✅ DIAGNOSTIC: Spender Contract ID:', spenderContractId);
        console.log('✅ DIAGNOSTIC: Amount:', amount);

        const instance = await getHashConnectInstance();
        const signer = instance.getSigner(AccountId.fromString(accountId));

        // Convert Hedera IDs to proper format
        const ownerAccountId = AccountId.fromString(accountId);
        const tokenIdObj = TokenId.fromString(tokenId);
        const spenderAccountId = AccountId.fromString(spenderContractId);

        console.log('✅ DIAGNOSTIC: Creating approval transaction...');

        // Create approval transaction
        // For NFTs/fungible tokens, we approve the spender (lending pool) to spend tokens
        // SECURITY: We approve only the exact amount requested
        // This means users need to approve each deposit, but it's more transparent
        const approvalAmount = parseInt(amount); // Exact amount requested
        console.log('✅ DIAGNOSTIC: Using approval amount:', approvalAmount, '(exact amount requested)');

        const approvalTx = new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(tokenIdObj, ownerAccountId, spenderAccountId, approvalAmount)
            .setMaxTransactionFee(new Hbar(2));

        console.log('✅ DIAGNOSTIC: Freezing approval transaction...');
        const frozenTx = await approvalTx.freezeWithSigner(signer);

        console.log('✅ DIAGNOSTIC: Executing approval transaction...');
        const response = await frozenTx.executeWithSigner(signer);

        console.log('✅ DIAGNOSTIC: Getting approval receipt...');
        let receipt;
        try {
            receipt = await response.getReceiptWithSigner(signer);

            // Check receipt status
            if (receipt && (receipt as any).status) {
                const statusString = (receipt as any).status.toString();
                console.log('✅ DIAGNOSTIC: Approval receipt status:', statusString);

                if (statusString.includes('FAIL') || statusString.includes('REVERT')) {
                    throw new Error(`Approval transaction failed: ${statusString}`);
                }
            }
        } catch (receiptError: any) {
            console.warn('⚠️ Could not get approval receipt:', receiptError.message);

            // Wait a bit for the transaction to be processed
            console.log('⏳ Waiting 5 seconds for approval to process...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Continue anyway - the deposit will fail if approval didn't work
            console.log('⚠️ Continuing without receipt verification');
            receipt = null;
        }

        console.log('✅ DIAGNOSTIC: Approval transaction sent!', {
            transactionId: response.transactionId?.toString(),
            status: receipt ? receipt.status.toString() : 'Receipt not available - transaction may still be processing'
        });

        // Add additional delay to ensure approval is processed before deposit
        console.log('⏳ Waiting 3 more seconds before proceeding to deposit...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        return {
            success: true,
            transactionId: response.transactionId?.toString(),
            receipt
        };

    } catch (error: any) {
        console.error('❌ DIAGNOSTIC: Token approval failed:', error);
        console.error('❌ DIAGNOSTIC: Error message:', error.message);
        console.error('❌ DIAGNOSTIC: Error stack:', error.stack);
        throw new Error(`Token approval failed: ${error.message}`);
    }
}; 