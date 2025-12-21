// English translations
export const en = {
    common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        back: 'Back',
        next: 'Next',
        close: 'Close',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        refresh: 'Refresh',
        viewAll: 'View All',
        noData: 'No data found',
        amount: 'Amount',
        status: 'Status',
        date: 'Date',
        all: 'All',
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
        completed: 'Completed',
        cancelled: 'Cancelled'
    },

    auth: {
        login: 'Log In',
        logout: 'Log Out',
        register: 'Register',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        forgotPassword: 'Forgot Password',
        welcomeBack: 'Welcome Back',
        createAccount: 'Create Account',
        emailPlaceholder: 'name@example.com',
        passwordPlaceholder: 'Enter your password',
        noAccount: "Don't have an account?",
        haveAccount: 'Already have an account?',
        signUp: 'Sign Up',
        signIn: 'Sign In'
    },

    dashboard: {
        title: 'Dashboard',
        balance: 'Your Balance',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        cryptoDeposit: 'Crypto Deposit',
        cryptoWithdraw: 'Crypto Withdraw',
        findAgent: 'Find Agent',
        findAgentDesc: 'Locate nearest exchange points',
        recentActivity: 'Recent Activity',
        noTransactions: 'No transactions yet',
        businessPanel: 'Business Panel',
        adminPanel: 'Admin Panel',
        pendingApprovals: 'Pending Approvals',
        paymentConfirm: 'Payment Confirmation',
        paymentConfirmMsg: 'Payment has been made to your account. Do you confirm?',
        approve: 'Approve',
        reject: 'Reject'
    },

    deposit: {
        title: 'Deposit',
        receiptOptional: 'Receipt Upload Optional',
        receiptInfo: 'If you upload a receipt, the transaction will be auto-approved within 20 minutes.',
        bankAccount: 'Your Bank Account',
        addNew: 'Add New',
        addBankAccount: 'Add Bank Account',
        addBankAccountDesc: 'You need to add a bank account to deposit',
        depositAmount: 'Deposit Amount (USDT)',
        minimum: 'Minimum: 10 USDT',
        youWillPay: 'You will pay',
        findMatch: 'Find Match',
        searchingMatch: 'Searching for Best Match...',
        searchingMatchDesc: 'Looking for a suitable seller',
        matchFound: 'Match Found!',
        matchFoundDesc: 'A suitable seller was found for your deposit.',
        confirmAndView: 'Confirm & View Details',
        confirmNote: 'Upon confirmation, payment details will be shown and a 30-minute timer will start.',
        pendingOrder: 'You Have a Pending Order',
        pendingOrderDesc: 'You have an active order. Complete or cancel it before creating a new one.',
        cancelOrder: 'Cancel Order',
        noMatchTitle: 'No Match Found',
        noMatchDesc: 'No withdrawal request for this amount. You can select nearby amounts:',
        waitingMatch: 'Waiting for Match',
        waitingMatchDesc: 'Your request has been added to the pool. You will be matched when a withdrawal request comes.',
        transactionType: 'Transaction Type',
        buyOrder: 'Deposit (Buy)',
        sellOrder: 'Withdrawal (Sell)',
        network: 'Network'
    },

    depositConfirm: {
        title: 'Payment Details',
        paymentInfo: 'Payment Information',
        iban: 'IBAN',
        recipient: 'Recipient',
        bank: 'Bank',
        amount: 'Amount',
        timeRemaining: 'Time Remaining',
        markAsPaid: 'Mark as Paid',
        uploadReceipt: 'Upload Receipt',
        paymentSent: 'Payment Notification Received!',
        paymentSentDesc: 'Your payment notification has been sent. Your balance will be credited when the seller confirms.',
        timeExpired: 'Time Expired!',
        timeExpiredDesc: 'Transaction time has expired and was cancelled. Please start a new transaction.'
    },

    withdraw: {
        title: 'Withdraw',
        withdrawAmount: 'Withdraw Amount (USDT)',
        youWillReceive: 'You will receive',
        selectBank: 'Select Bank Account',
        createRequest: 'Create Withdrawal Request',
        waitingMatch: 'Waiting for Match',
        instantWithdraw: 'Instant Withdraw',
        p2pWithdraw: 'P2P Withdraw',
        insufficientBalance: 'Insufficient Balance'
    },

    crypto: {
        depositTitle: 'Crypto Deposit',
        withdrawTitle: 'Crypto Withdraw',
        selectNetwork: 'Select Network',
        depositAddress: 'Deposit Address',
        clickToCopy: 'Click to copy',
        qrCode: 'QR Code',
        minimumDeposit: 'Minimum: 10 USDT',
        selectAsset: 'Select Asset',
        withdrawAmount: 'Withdraw Amount',
        walletAddress: 'Wallet Address',
        networkFee: 'Network Fee',
        confirmWithdraw: 'Confirm Withdrawal'
    },

    history: {
        title: 'Transaction History',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        transfer: 'Transfer',
        p2pBuy: 'P2P Buy',
        p2pSell: 'P2P Sell',
        noHistory: 'No transactions yet'
    },

    profile: {
        title: 'Profile',
        accountSettings: 'Account Settings',
        editProfile: 'Edit Profile',
        changePassword: 'Change Password',
        bankAccounts: 'Bank Accounts',
        transactionLimits: 'Transaction Limits',
        security: 'Security',
        language: 'Language',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        appVersion: 'App Version'
    },

    profileEdit: {
        title: 'Edit Profile',
        firstName: 'First Name',
        lastName: 'Last Name',
        firstNamePlaceholder: 'Enter your first name',
        lastNamePlaceholder: 'Enter your last name',
        save: 'Save'
    },

    changePassword: {
        title: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmNewPassword: 'Confirm New Password',
        updatePassword: 'Update Password',
        currentPasswordPlaceholder: 'Enter current password',
        newPasswordPlaceholder: 'Enter new password',
        confirmPasswordPlaceholder: 'Confirm new password'
    },

    bankAccounts: {
        title: 'Bank Accounts',
        addAccount: 'Add Bank Account',
        bankName: 'Bank Name',
        iban: 'IBAN',
        accountHolder: 'Account Holder',
        deleteConfirm: 'Are you sure you want to delete this account?',
        noAccounts: 'No bank accounts added yet'
    },

    notifications: {
        title: 'Notifications',
        markAllRead: 'Mark All as Read',
        new: 'New',
        read: 'Read',
        noNotifications: 'No notifications yet',
        justNow: 'Just now'
    },

    business: {
        title: 'Business Panel',
        totalBalance: 'Total Balance',
        subAccounts: 'Sub Accounts',
        paymentPortals: 'Payment Portals',
        transactionHistory: 'Transaction History',
        invite: 'Invite',
        requestPortal: 'Request Portal',
        portalName: 'Portal Name'
    },

    findAgent: {
        title: 'Find Agent',
        cashPoint: 'Cash Point',
        searchPlaceholder: 'Search city or region...',
        getDirections: 'Get Directions',
        noAgents: 'No agents found in this area'
    },

    nav: {
        home: 'Home',
        scan: 'Scan',
        settings: 'Settings'
    },

    alerts: {
        selectBank: 'Select Bank',
        selectBankMsg: 'Please select or add a bank account first.',
        minimumAmount: 'Minimum Amount',
        minimumAmountMsg: 'Minimum 10 USDT',
        serverError: 'Server Error',
        connectionError: 'Connection Error',
        unknownError: 'An unknown error occurred',
        tryAgain: 'Please try again'
    },

    languages: {
        tr: 'Türkçe',
        en: 'English'
    }
};
