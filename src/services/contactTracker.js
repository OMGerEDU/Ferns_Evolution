const db = require('../db');
const logger = require('../utils/logger');

/**
 * Contact Tracker Service
 * Tracks contact interactions to support first-contact detection and relationship state
 */

class ContactTracker {
    constructor() {
        this.cache = new Map(); // In-memory cache for performance
    }

    /**
     * Check if this is the first message from a contact
     * @param {string} contactNumber - Contact phone number (with @s.whatsapp.net)
     * @param {string} instanceName - Instance name
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<boolean>} True if first contact
     */
    async isFirstContact(contactNumber, instanceName, tenantId) {
        try {
            const cacheKey = `${tenantId}:${instanceName}:${contactNumber}`;

            // Check cache first
            if (this.cache.has(cacheKey)) {
                return false; // Already seen this contact
            }

            // Check database for existing contact interactions
            // We'll use the automations table's execution logs or create a simple tracking mechanism
            // For now, use a simple heuristic: check if we have processed messages from this contact

            // Create a simple contact_history table entry
            const { rows } = await db.query(
                `SELECT EXISTS(
                    SELECT 1 FROM contact_history 
                    WHERE tenant_id = $1 
                    AND instance_name = $2 
                    AND contact_number = $3
                ) as has_history`,
                [tenantId, instanceName, contactNumber]
            );

            const isFirst = !rows[0]?.has_history;

            if (isFirst) {
                // Record this contact for future checks
                await this.recordContact(contactNumber, instanceName, tenantId);
                this.cache.set(cacheKey, true);
            }

            return isFirst;

        } catch (error) {
            logger.error('Error checking first contact', { error: error.message, contactNumber });
            return false; // Fail safe: assume not first contact
        }
    }

    /**
     * Record contact interaction
     * @param {string} contactNumber - Contact phone number
     * @param {string} instanceName - Instance name
     * @param {string} tenantId - Tenant ID
     */
    async recordContact(contactNumber, instanceName, tenantId) {
        try {
            await db.query(
                `INSERT INTO contact_history (tenant_id, instance_name, contact_number, first_seen_at, last_seen_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (tenant_id, instance_name, contact_number) 
                DO UPDATE SET last_seen_at = NOW(), message_count = contact_history.message_count + 1`,
                [tenantId, instanceName, contactNumber]
            );
        } catch (error) {
            logger.error('Error recording contact', { error: error.message, contactNumber });
        }
    }

    /**
     * Check if a contact is saved (in phone's contact list)
     * Note: This requires Evolution API integration to fetch contact list
     * For now, we'll use a simple heuristic or return false
     * @param {string} contactNumber - Contact phone number
     * @param {string} instanceName - Instance name
     * @returns {Promise<boolean>} True if contact is saved
     */
    async isContactSaved(contactNumber, instanceName) {
        try {
            // TODO: Integrate with Evolution API to check contact list
            // For now, check if we have a saved contact record
            const { rows } = await db.query(
                `SELECT EXISTS(
                    SELECT 1 FROM saved_contacts 
                    WHERE instance_name = $1 
                    AND contact_number = $2
                ) as is_saved`,
                [instanceName, contactNumber]
            );

            return rows[0]?.is_saved || false;

        } catch (error) {
            logger.error('Error checking saved contact', { error: error.message, contactNumber });
            return false; // Fail safe
        }
    }

    /**
     * Clear cache (for testing or maintenance)
     */
    clearCache() {
        this.cache.clear();
    }
}

// Singleton instance
const contactTracker = new ContactTracker();

module.exports = contactTracker;
