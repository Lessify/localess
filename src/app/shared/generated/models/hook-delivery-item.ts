/* tslint:disable */
/* eslint-disable */

/**
 * Delivery made by a webhook, without request and response information.
 */
export interface HookDeliveryItem {

  /**
   * The type of activity for the event that triggered the delivery.
   */
  action: null | string;

  /**
   * Time when the webhook delivery occurred.
   */
  delivered_at: string;

  /**
   * Time spent delivering.
   */
  duration: number;

  /**
   * The event that triggered the delivery.
   */
  event: string;

  /**
   * Unique identifier for the event (shared with all deliveries for all webhooks that subscribe to this event).
   */
  guid: string;

  /**
   * Unique identifier of the webhook delivery.
   */
  id: number;

  /**
   * The id of the GitHub App installation associated with this event.
   */
  installation_id: null | number;

  /**
   * Whether the webhook delivery is a redelivery.
   */
  redelivery: boolean;

  /**
   * The id of the repository associated with this event.
   */
  repository_id: null | number;

  /**
   * Describes the response returned after attempting the delivery.
   */
  status: string;

  /**
   * Status code received when delivery was made.
   */
  status_code: number;
}
