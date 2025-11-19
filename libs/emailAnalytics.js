import { createClient } from './supabase/server';

/**
 * Track email delivery and engagement metrics
 */
export class EmailAnalytics {
  supabase = null;

  async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Track email sent event
   * @param {Object} params
   * @param {string} params.emailType - Type of email (welcome, new_message, etc.)
   * @param {string} params.userId - User ID receiving the email
   * @param {string} params.trigger - What triggered the email
   * @param {string} params.emailId - Resend email ID
   * @param {string} params.recipientEmail - Recipient email address
   */
  async trackEmailSent({ emailType, userId, trigger, emailId, recipientEmail }) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_type: emailType,
        user_id: userId,
        trigger: trigger,
        email_id: emailId,
        recipient_email: recipientEmail,
        event_type: 'sent',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email sent:', error);
      }
    } catch (error) {
      console.error('Error tracking email sent:', error);
    }
  }

  /**
   * Track email opened event
   * @param {string} emailId - Resend email ID
   */
  async trackEmailOpened(emailId) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'opened',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email opened:', error);
      }
    } catch (error) {
      console.error('Error tracking email opened:', error);
    }
  }

  /**
   * Track email clicked event
   * @param {string} emailId - Resend email ID
   * @param {string} linkUrl - URL that was clicked
   */
  async trackEmailClicked(emailId, linkUrl) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'clicked',
        link_url: linkUrl,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email clicked:', error);
      }
    } catch (error) {
      console.error('Error tracking email clicked:', error);
    }
  }

  /**
   * Track email bounced event
   * @param {string} emailId - Resend email ID
   * @param {string} bounceType - Type of bounce (hard, soft)
   * @param {string} reason - Bounce reason
   */
  async trackEmailBounced(emailId, bounceType, reason) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'bounced',
        bounce_type: bounceType,
        bounce_reason: reason,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email bounced:', error);
      }
    } catch (error) {
      console.error('Error tracking email bounced:', error);
    }
  }

  /**
   * Track email complained event (spam complaint)
   * @param {string} emailId - Resend email ID
   */
  async trackEmailComplained(emailId) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'complained',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email complained:', error);
      }
    } catch (error) {
      console.error('Error tracking email complained:', error);
    }
  }

  /**
   * Get email metrics for a specific time period
   * @param {Date} startDate - Start date for metrics
   * @param {Date} endDate - End date for metrics
   * @param {string} emailType - Optional email type filter
   */
  async getEmailMetrics(startDate, endDate, emailType = null) {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from('email_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (emailType) {
        query = query.eq('email_type', emailType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting email metrics:', error);
        return null;
      }

      // Calculate metrics
      const metrics = {
        totalSent: data.filter((e) => e.event_type === 'sent').length,
        totalOpened: data.filter((e) => e.event_type === 'opened').length,
        totalClicked: data.filter((e) => e.event_type === 'clicked').length,
        totalBounced: data.filter((e) => e.event_type === 'bounced').length,
        totalComplained: data.filter((e) => e.event_type === 'complained').length,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
      };

      if (metrics.totalSent > 0) {
        metrics.openRate = (metrics.totalOpened / metrics.totalSent) * 100;
        metrics.clickRate = (metrics.totalClicked / metrics.totalSent) * 100;
        metrics.bounceRate = (metrics.totalBounced / metrics.totalSent) * 100;
        metrics.complaintRate = (metrics.totalComplained / metrics.totalSent) * 100;
      }

      return metrics;
    } catch (error) {
      console.error('Error getting email metrics:', error);
      return null;
    }
  }

  /**
   * Get user email engagement history
   * @param {string} userId - User ID
   */
  async getUserEmailHistory(userId) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error getting user email history:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user email history:', error);
      return null;
    }
  }
}

// Export singleton instance
export const emailAnalytics = new EmailAnalytics();
