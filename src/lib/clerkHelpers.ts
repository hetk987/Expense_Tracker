import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Get user email from Clerk authentication
 * Returns the primary email address of the authenticated user
 */
export async function getUserEmail(): Promise<string | null> {
    try {
        const user = await currentUser();
        if (!user) return null;
        
        // Get primary email address
        const primaryEmail = user.emailAddresses.find(
            email => email.id === user.primaryEmailAddressId
        );
        
        return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
    } catch (error) {
        console.error('Error getting user email from Clerk:', error);
        return null;
    }
}

/**
 * Get user name from Clerk authentication
 * Returns the full name, first name, or username
 */
export async function getUserName(): Promise<string | null> {
    try {
        const user = await currentUser();
        if (!user) return null;
        
        // Try to get full name first
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        
        // Fall back to first name
        if (user.firstName) {
            return user.firstName;
        }
        
        // Fall back to username
        if (user.username) {
            return user.username;
        }
        
        // Fall back to email username
        const email = await getUserEmail();
        if (email) {
            return email.split('@')[0];
        }
        
        return 'User';
    } catch (error) {
        console.error('Error getting user name from Clerk:', error);
        return null;
    }
}

/**
 * Get user ID from Clerk authentication
 */
export async function getUserId(): Promise<string | null> {
    try {
        const { userId } = await auth();
        return userId;
    } catch (error) {
        console.error('Error getting user ID from Clerk:', error);
        return null;
    }
}

/**
 * Get user email and name together
 * Returns an object with email and name, or null if not authenticated
 */
export async function getUserInfo(): Promise<{ email: string; name: string; userId: string } | null> {
    try {
        const userId = await getUserId();
        if (!userId) return null;
        
        const email = await getUserEmail();
        const name = await getUserName();
        
        if (!email) return null;
        
        return {
            email,
            name: name || 'User',
            userId,
        };
    } catch (error) {
        console.error('Error getting user info from Clerk:', error);
        return null;
    }
}

