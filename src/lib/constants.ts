// Transaction and Pagination Constants
export const TRANSACTION_LIMITS = {
    DEFAULT: 50,
    SMALL: 10,
    MEDIUM: 25,
    LARGE: 100,
    EXTRA_LARGE: 250,
    MAXIMUM: 500,
    DASHBOARD: 1000,
    UNLIMITED: 9999, // For cases where we want all transactions
} as const;

// Pagination Constants
export const PAGINATION = {
    DEFAULT_LIMIT: TRANSACTION_LIMITS.DASHBOARD,
    DEFAULT_OFFSET: 0,
    MAX_LIMIT: TRANSACTION_LIMITS.DASHBOARD,
} as const;

// Date Range Constants
export const DATE_RANGES = {
    DEFAULT_DAYS: 30,
    CURRENT_YEAR: 'current_year',
    CURRENT_MONTH: 'current_month',
    LAST_30_DAYS: 'last_30_days',
} as const;

// API Constants
export const API = {
    DEFAULT_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    BATCH_SIZE: 100, // For bulk operations
} as const;

// UI Constants
export const UI = {
    DEBOUNCE_DELAY: 300, // milliseconds for search debouncing
    ANIMATION_DURATION: 200, // milliseconds for transitions
    MAX_SEARCH_LENGTH: 100,
    MAX_CATEGORY_LENGTH: 50,
} as const;

// Chart Constants
export const CHARTS = {
    DEFAULT_CATEGORY_LIMIT: 5,
    MAX_CATEGORY_LIMIT: 10,
    DEFAULT_CHART_HEIGHT: 300,
    ANIMATION_DURATION: 1000,
} as const;

// Validation Constants
export const VALIDATION = {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999.99,
    MIN_DATE: '2020-01-01',
    MAX_DATE: '2030-12-31',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error occurred. Please try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    TRANSACTION_SYNCED: 'Transactions synced successfully.',
    ACCOUNT_LINKED: 'Account linked successfully.',
    ACCOUNT_UNLINKED: 'Account unlinked successfully.',
    SETTINGS_SAVED: 'Settings saved successfully.',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
    THEME: 'expense-tracker-theme',
    USER_PREFERENCES: 'expense-tracker-preferences',
    CACHED_TRANSACTIONS: 'expense-tracker-cached-transactions',
    LAST_SYNC: 'expense-tracker-last-sync',
} as const;

// Feature Flags
export const FEATURES = {
    ENABLE_CHARTS: true,
    ENABLE_EXPORT: true,
    ENABLE_NOTIFICATIONS: true,
    ENABLE_DARK_MODE: true,
    ENABLE_CREDIT_CARD_PAYMENT_FILTERING: true,
} as const;

// Export all constants as a single object for easy access
export const CONSTANTS = {
    TRANSACTION_LIMITS,
    PAGINATION,
    DATE_RANGES,
    API,
    UI,
    CHARTS,
    VALIDATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STORAGE_KEYS,
    FEATURES,
} as const; 