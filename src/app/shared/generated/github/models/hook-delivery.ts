/* tslint:disable */
/* eslint-disable */

/**
 * Delivery made by a webhook.
 */
export interface HookDelivery {

  /**
   * The type of activity for the event that triggered the delivery.
   */
  action: string | null;

  /**
   * Time when the delivery was delivered.
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
   * Unique identifier of the delivery.
   */
  id: number;

  /**
   * The id of the GitHub App installation associated with this event.
   */
  installation_id: number | null;

  /**
   * Whether the delivery is a redelivery.
   */
  redelivery: boolean;

  /**
   * The id of the repository associated with this event.
   */
  repository_id: number | null;
  request: {

/**
 * The request headers sent with the webhook delivery.
 */
'headers': ({
[key: string]: any;
}) | null;

/**
 * The webhook payload.
 */
'payload': ({
[key: string]: any;
}) | null;
};
  response: {

/**
 * The response headers received when the delivery was made.
 */
'headers': ({
[key: string]: any;
}) | null;

/**
 * The response payload received.
 */
'payload': string | null;
};

  /**
   * Description of the status of the attempted delivery
   */
  status: string;

  /**
   * Status code received when delivery was made.
   */
  status_code: number;

  /**
   * The URL target of the delivery.
   */
  url?: string;
}
