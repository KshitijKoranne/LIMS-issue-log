export const STATUSES = ["Open", "Ongoing", "Closed"] as const;
export const LOCATIONS = ["Vadodara", "Vapi", "Both"] as const;
export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export const MAX_ATTACHMENTS_PER_SUBMISSION = 3;
export const MAX_ATTACHMENT_BYTES = 1_600_000;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
